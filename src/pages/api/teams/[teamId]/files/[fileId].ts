import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../services/auth/PermissionService';
import { 
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../../services/firebase/firebaseConfig';

/**
 * File interface for team documents
 */
interface TeamFile {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  type: string;
  size: number;
  url: string;
  path: string;
  folderId?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  lastModifiedBy: string;
  version: number;
  metadata?: Record<string, any>;
}

/**
 * File operations service
 */
class FileOperationsService {
  /**
   * Get a specific file by ID
   */
  async getFile(fileId: string): Promise<TeamFile | null> {
    try {
      const fileRef = doc(db, 'teamFiles', fileId);
      const fileSnap = await getDoc(fileRef);
      
      if (!fileSnap.exists()) {
        return null;
      }
      
      return {
        id: fileSnap.id,
        ...fileSnap.data()
      } as TeamFile;
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }
  
  /**
   * Update a file's metadata
   */
  async updateFile(
    fileId: string, 
    userId: string,
    data: {
      name?: string;
      description?: string;
      folderId?: string | null;
      metadata?: Record<string, any>;
    }
  ): Promise<TeamFile> {
    try {
      const fileRef = doc(db, 'teamFiles', fileId);
      const fileSnap = await getDoc(fileRef);
      
      if (!fileSnap.exists()) {
        throw new Error('File not found');
      }
      
      let path = fileSnap.data().path;
      
      // If name changed, update the path
      if (data.name) {
        const pathParts = path.split('/');
        pathParts[pathParts.length - 1] = data.name;
        path = pathParts.join('/');
      }
      
      // If folder changed, update the path
      if (data.folderId !== undefined) {
        if (data.folderId) {
          // Get folder path
          const folderRef = doc(db, 'teamFolders', data.folderId);
          const folderSnap = await getDoc(folderRef);
          
          if (!folderSnap.exists()) {
            throw new Error('Folder not found');
          }
          
          const folderPath = folderSnap.data().path;
          const fileName = data.name || fileSnap.data().name;
          path = `${folderPath}/${fileName}`;
        } else {
          // Root folder
          const fileName = data.name || fileSnap.data().name;
          path = `/${fileName}`;
        }
      }
      
      // Prepare update data
      const updateData: Record<string, any> = {
        updatedAt: serverTimestamp(),
        lastModifiedBy: userId,
        path
      };
      
      // Add optional fields if provided
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.folderId !== undefined) updateData.folderId = data.folderId;
      if (data.metadata !== undefined) {
        updateData.metadata = {
          ...fileSnap.data().metadata || {},
          ...data.metadata
        };
      }
      
      // Increment version
      updateData.version = fileSnap.data().version + 1;
      
      await updateDoc(fileRef, updateData);
      
      // Get updated document
      const updatedSnap = await getDoc(fileRef);
      return {
        id: updatedSnap.id,
        ...updatedSnap.data()
      } as TeamFile;
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }
  
  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const fileRef = doc(db, 'teamFiles', fileId);
      const fileSnap = await getDoc(fileRef);
      
      if (!fileSnap.exists()) {
        throw new Error('File not found');
      }
      
      await deleteDoc(fileRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

// Create singleton instance
const fileOperationsService = new FileOperationsService();

/**
 * API endpoint for operations on a specific file
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
    
    // Get team ID and file ID from URL
    const teamId = req.query.teamId as string;
    const fileId = req.query.fileId as string;
    
    if (!teamId || !fileId) {
      return res.status(400).json({ 
        error: 'Team ID and file ID are required' 
      });
    }
    
    // Get file data
    const file = await fileOperationsService.getFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Verify file belongs to the team
    if (file.teamId !== teamId) {
      return res.status(404).json({ error: 'File not found in this team' });
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
        return res.status(200).json({ file });
        
      case 'PUT':
        return handleUpdateFile(req, res, file, teamId, userId);
        
      case 'DELETE':
        return handleDeleteFile(req, res, file, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in file API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle update file request
 */
async function handleUpdateFile(
  req: NextApiRequest,
  res: NextApiResponse,
  file: TeamFile,
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
    
    const isCreator = file.createdBy === userId;
    
    if (!canEditFiles && !isCreator) {
      return res.status(403).json({
        error: 'You do not have permission to edit this file'
      });
    }
    
    const { name, description, folderId, metadata } = req.body;
    
    // Validate file name if provided
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'File name cannot be empty' });
      }
      
      // Check if name contains invalid characters
      const invalidChars = /[\\/:*?"<>|]/;
      if (invalidChars.test(name)) {
        return res.status(400).json({ 
          error: 'File name contains invalid characters' 
        });
      }
    }
    
    // Update the file
    const updatedFile = await fileOperationsService.updateFile(
      file.id,
      userId,
      { name, description, folderId, metadata }
    );
    
    return res.status(200).json({ file: updatedFile });
  } catch (error: any) {
    console.error('Error updating file:', error);
    
    if (error?.message === 'File not found') {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (error?.message === 'Folder not found') {
      return res.status(400).json({ error: 'Target folder not found' });
    }
    
    return res.status(500).json({ error: 'Failed to update file' });
  }
}

/**
 * Handle delete file request
 */
async function handleDeleteFile(
  req: NextApiRequest,
  res: NextApiResponse,
  file: TeamFile,
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
        error: 'You do not have permission to delete files'
      });
    }
    
    // Delete the file
    await fileOperationsService.deleteFile(file.id);
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    
    if (error?.message === 'File not found') {
      return res.status(404).json({ error: 'File not found' });
    }
    
    return res.status(500).json({ error: 'Failed to delete file' });
  }
}