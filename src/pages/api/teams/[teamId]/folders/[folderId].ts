import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../services/auth/PermissionService';
import { 
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../../services/firebase/firebaseConfig';

/**
 * Folder interface
 */
interface TeamFolder {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  path: string;
  parentId?: string | null;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

/**
 * Team Folder Operations Service
 */
class FolderOperationsService {
  /**
   * Get a specific folder by ID
   */
  async getFolder(folderId: string): Promise<TeamFolder | null> {
    try {
      const folderRef = doc(db, 'teamFolders', folderId);
      const folderSnap = await getDoc(folderRef);
      
      if (!folderSnap.exists()) {
        return null;
      }
      
      return {
        id: folderSnap.id,
        ...folderSnap.data()
      } as TeamFolder;
    } catch (error) {
      console.error('Error getting folder:', error);
      throw error;
    }
  }
  
  /**
   * Update a folder
   */
  async updateFolder(
    folderId: string,
    data: {
      name?: string;
      description?: string;
      parentId?: string | null;
    }
  ): Promise<TeamFolder> {
    try {
      const folderRef = doc(db, 'teamFolders', folderId);
      const folderSnap = await getDoc(folderRef);
      
      if (!folderSnap.exists()) {
        throw new Error('Folder not found');
      }
      
      let path = folderSnap.data().path;
      const oldPath = path;
      let updateRequired = false;
      
      // Check for circular references if parent is being updated
      if (data.parentId !== undefined && data.parentId !== folderSnap.data().parentId) {
        if (data.parentId === folderId) {
          throw new Error('Folder cannot be its own parent');
        }
        
        // Check if new parent is a descendant of this folder
        if (data.parentId) {
          let checkParentId = data.parentId;
          let depth = 0;
          const maxDepth = 10; // Prevent infinite loops
          
          while (checkParentId && depth < maxDepth) {
            const parentRef = doc(db, 'teamFolders', checkParentId);
            const parentSnap = await getDoc(parentRef);
            
            if (!parentSnap.exists()) {
              throw new Error('Parent folder not found');
            }
            
            if (parentSnap.id === folderId) {
              throw new Error('Cannot move a folder to its own descendant');
            }
            
            checkParentId = parentSnap.data().parentId;
            depth++;
          }
        }
        
        updateRequired = true;
      }
      
      // If name changed or parent changed, update path
      if (data.name || updateRequired) {
        if (data.parentId !== undefined) {
          if (data.parentId) {
            // Get parent path
            const parentRef = doc(db, 'teamFolders', data.parentId);
            const parentSnap = await getDoc(parentRef);
            
            if (!parentSnap.exists()) {
              throw new Error('Parent folder not found');
            }
            
            const parentPath = parentSnap.data().path;
            const folderName = data.name || folderSnap.data().name;
            path = `${parentPath}/${folderName}`;
          } else {
            // Root folder
            const folderName = data.name || folderSnap.data().name;
            path = `/${folderName}`;
          }
        } else if (data.name) {
          // Only name changed, replace last part of path
          const pathParts = path.split('/');
          pathParts[pathParts.length - 1] = data.name;
          path = pathParts.join('/');
        }
      }
      
      // Prepare update data
      const updateData: Record<string, any> = {
        updatedAt: serverTimestamp(),
        path
      };
      
      // Add optional fields if provided
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.parentId !== undefined) updateData.parentId = data.parentId;
      
      await updateDoc(folderRef, updateData);
      
      // If path changed, update paths of all children (files and folders)
      if (path !== oldPath) {
        await this.updateChildrenPaths(folderId, oldPath, path);
      }
      
      // Get updated document
      const updatedSnap = await getDoc(folderRef);
      return {
        id: updatedSnap.id,
        ...updatedSnap.data()
      } as TeamFolder;
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }
  
  /**
   * Update paths of all children recursively when a folder path changes
   */
  private async updateChildrenPaths(
    folderId: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    try {
      // Update child folders
      const childFoldersQuery = query(
        collection(db, 'teamFolders'),
        where('parentId', '==', folderId)
      );
      
      const childFoldersSnapshot = await getDocs(childFoldersQuery);
      
      for (const folderDoc of childFoldersSnapshot.docs) {
        const folderData = folderDoc.data();
        const folderPath = folderData.path;
        
        // Replace old path prefix with new path
        const updatedPath = folderPath.replace(oldPath, newPath);
        
        await updateDoc(folderDoc.ref, { 
          path: updatedPath,
          updatedAt: serverTimestamp()
        });
        
        // Recursively update children of this folder
        await this.updateChildrenPaths(folderDoc.id, folderPath, updatedPath);
      }
      
      // Update files in this folder
      const filesQuery = query(
        collection(db, 'teamFiles'),
        where('folderId', '==', folderId)
      );
      
      const filesSnapshot = await getDocs(filesQuery);
      
      for (const fileDoc of filesSnapshot.docs) {
        const filePath = fileDoc.data().path;
        
        // Replace old path prefix with new path
        const updatedPath = filePath.replace(oldPath, newPath);
        
        await updateDoc(fileDoc.ref, {
          path: updatedPath,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating child paths:', error);
      throw error;
    }
  }
  
  /**
   * Delete a folder and all its contents
   */
  async deleteFolder(folderId: string): Promise<void> {
    try {
      const folderRef = doc(db, 'teamFolders', folderId);
      const folderSnap = await getDoc(folderRef);
      
      if (!folderSnap.exists()) {
        throw new Error('Folder not found');
      }
      
      // Delete all subfolders recursively
      const subFoldersQuery = query(
        collection(db, 'teamFolders'),
        where('parentId', '==', folderId)
      );
      
      const subFoldersSnapshot = await getDocs(subFoldersQuery);
      
      for (const folderDoc of subFoldersSnapshot.docs) {
        await this.deleteFolder(folderDoc.id);
      }
      
      // Delete all files in this folder
      const filesQuery = query(
        collection(db, 'teamFiles'),
        where('folderId', '==', folderId)
      );
      
      const filesSnapshot = await getDocs(filesQuery);
      
      for (const fileDoc of filesSnapshot.docs) {
        await deleteDoc(fileDoc.ref);
      }
      
      // Delete the folder itself
      await deleteDoc(folderRef);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }
  
  /**
   * Check if a folder is empty (no files or subfolders)
   */
  async isFolderEmpty(folderId: string): Promise<boolean> {
    try {
      // Check for subfolders
      const subFoldersQuery = query(
        collection(db, 'teamFolders'),
        where('parentId', '==', folderId),
        limit(1)
      );
      
      const subFoldersSnapshot = await getDocs(subFoldersQuery);
      
      if (!subFoldersSnapshot.empty) {
        return false;
      }
      
      // Check for files
      const filesQuery = query(
        collection(db, 'teamFiles'),
        where('folderId', '==', folderId),
        limit(1)
      );
      
      const filesSnapshot = await getDocs(filesQuery);
      
      return filesSnapshot.empty;
    } catch (error) {
      console.error('Error checking if folder is empty:', error);
      throw error;
    }
  }
}

// Create singleton instance
const folderOperationsService = new FolderOperationsService();

/**
 * API endpoint for operations on a specific folder
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get auth token from request
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get team ID and folder ID from URL
    const teamId = req.query.teamId as string;
    const folderId = req.query.folderId as string;
    
    if (!teamId || !folderId) {
      return res.status(400).json({ 
        error: 'Team ID and folder ID are required' 
      });
    }
    
    // Get folder data
    const folder = await folderOperationsService.getFolder(folderId);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Verify folder belongs to the team
    if (folder.teamId !== teamId) {
      return res.status(404).json({ error: 'Folder not found in this team' });
    }
    
    // Check if user has permission to view files
    const canViewFiles = await permissionService.hasPermission(
      userId,
      teamId,
      'viewFiles'
    );
    
    if (!canViewFiles) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return res.status(200).json({ folder });
        
      case 'PUT':
        return handleUpdateFolder(req, res, folder, teamId, userId);
        
      case 'DELETE':
        return handleDeleteFolder(req, res, folder, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in folder API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle update folder request
 */
async function handleUpdateFolder(
  req: NextApiRequest,
  res: NextApiResponse,
  folder: TeamFolder,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to edit files
    const canEditFiles = await permissionService.hasPermission(
      userId,
      teamId,
      'editFiles'
    );
    
    if (!canEditFiles) {
      return res.status(403).json({
        error: 'You do not have permission to edit folders'
      });
    }
    
    const { name, description, parentId } = req.body;
    
    // Validate folder name if provided
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Folder name cannot be empty' });
      }
      
      // Check if name contains invalid characters
      const invalidChars = /[\\/:*?"<>|]/;
      if (invalidChars.test(name)) {
        return res.status(400).json({ 
          error: 'Folder name contains invalid characters' 
        });
      }
    }
    
    // Update the folder
    const updatedFolder = await folderOperationsService.updateFolder(
      folder.id,
      { name, description, parentId }
    );
    
    return res.status(200).json({ folder: updatedFolder });
  } catch (error: any) {
    console.error('Error updating folder:', error);
    
    if (error?.message === 'Folder not found') {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    if (error?.message === 'Parent folder not found') {
      return res.status(400).json({ error: 'Parent folder not found' });
    }
    
    if (error?.message === 'Folder cannot be its own parent') {
      return res.status(400).json({ error: 'Folder cannot be its own parent' });
    }
    
    if (error?.message === 'Cannot move a folder to its own descendant') {
      return res.status(400).json({ 
        error: 'Cannot move a folder to its own descendant' 
      });
    }
    
    return res.status(500).json({ error: 'Failed to update folder' });
  }
}

/**
 * Handle delete folder request
 */
async function handleDeleteFolder(
  req: NextApiRequest,
  res: NextApiResponse,
  folder: TeamFolder,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to delete files
    const canDeleteFiles = await permissionService.hasPermission(
      userId,
      teamId,
      'deleteFiles'
    );
    
    if (!canDeleteFiles) {
      return res.status(403).json({
        error: 'You do not have permission to delete folders'
      });
    }
    
    // Check if force delete is requested
    const forceDelete = req.query.force === 'true';
    
    if (!forceDelete) {
      // Check if folder is empty
      const isEmpty = await folderOperationsService.isFolderEmpty(folder.id);
      
      if (!isEmpty) {
        return res.status(400).json({
          error: 'Folder is not empty. Use force=true to delete with contents'
        });
      }
    }
    
    // Delete the folder and its contents
    await folderOperationsService.deleteFolder(folder.id);
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    
    if (error?.message === 'Folder not found') {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    return res.status(500).json({ error: 'Failed to delete folder' });
  }
}