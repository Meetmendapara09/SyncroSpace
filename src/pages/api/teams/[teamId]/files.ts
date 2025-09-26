import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../services/auth/PermissionService';
import { 
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../services/firebase/firebaseConfig';

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
 * Folder interface for organizing team files
 */
interface TeamFolder {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  path: string;
  parentId?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

/**
 * Team Files Service for managing team documents
 */
class TeamFilesService {
  /**
   * Get all files in a team
   */
  async getTeamFiles(
    teamId: string,
    options: { 
      folderId?: string;
      type?: string;
      limit?: number;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
    } = {}
  ) {
    try {
      const { 
        folderId, 
        type,
        limit = 100, 
        sortBy = 'createdAt',
        sortDirection = 'desc'
      } = options;
      
      // Build the query
      let filesQuery = query(
        collection(db, 'teamFiles'),
        where('teamId', '==', teamId),
        orderBy(sortBy, sortDirection)
      );
      
      // Add folder filter if provided
      if (folderId) {
        filesQuery = query(
          filesQuery,
          where('folderId', '==', folderId)
        );
      } else if (folderId === null) {
        // Get root files (no folder)
        filesQuery = query(
          filesQuery,
          where('folderId', '==', null)
        );
      }
      
      // Add type filter if provided
      if (type) {
        filesQuery = query(
          filesQuery,
          where('type', '==', type)
        );
      }
      
      const filesSnapshot = await getDocs(filesQuery);
      
      return filesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamFile[];
    } catch (error) {
      console.error('Error getting team files:', error);
      throw error;
    }
  }
  
  /**
   * Get all folders in a team
   */
  async getTeamFolders(
    teamId: string,
    options: { 
      parentId?: string;
      limit?: number;
    } = {}
  ) {
    try {
      const { parentId, limit = 100 } = options;
      
      // Build the query
      let foldersQuery = query(
        collection(db, 'teamFolders'),
        where('teamId', '==', teamId),
        orderBy('name', 'asc')
      );
      
      // Add parent filter if provided
      if (parentId) {
        foldersQuery = query(
          foldersQuery,
          where('parentId', '==', parentId)
        );
      } else if (parentId === null) {
        // Get root folders (no parent)
        foldersQuery = query(
          foldersQuery,
          where('parentId', '==', null)
        );
      }
      
      const foldersSnapshot = await getDocs(foldersQuery);
      
      return foldersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamFolder[];
    } catch (error) {
      console.error('Error getting team folders:', error);
      throw error;
    }
  }
  
  /**
   * Create a new folder
   */
  async createFolder(
    teamId: string,
    data: {
      name: string;
      description?: string;
      parentId?: string;
      createdBy: string;
    }
  ): Promise<TeamFolder> {
    try {
      // Determine the path
      let path = `/${data.name}`;
      
      // If parent folder exists, get its path and append this folder's name
      if (data.parentId) {
        const parentRef = doc(db, 'teamFolders', data.parentId);
        const parentSnap = await getDoc(parentRef);
        
        if (!parentSnap.exists()) {
          throw new Error('Parent folder not found');
        }
        
        const parentPath = parentSnap.data().path;
        path = `${parentPath}/${data.name}`;
      }
      
      const folderData = {
        teamId,
        name: data.name,
        description: data.description || '',
        path,
        parentId: data.parentId || null,
        createdBy: data.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const folderRef = await addDoc(collection(db, 'teamFolders'), folderData);
      
      return {
        id: folderRef.id,
        ...folderData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as TeamFolder;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }
  
  /**
   * Create a new file record
   */
  async createFile(
    teamId: string,
    data: {
      name: string;
      description?: string;
      type: string;
      size: number;
      url: string;
      folderId?: string;
      createdBy: string;
      metadata?: Record<string, any>;
    }
  ): Promise<TeamFile> {
    try {
      // Determine the path
      let path = `/${data.name}`;
      
      // If folder exists, get its path and append this file's name
      if (data.folderId) {
        const folderRef = doc(db, 'teamFolders', data.folderId);
        const folderSnap = await getDoc(folderRef);
        
        if (!folderSnap.exists()) {
          throw new Error('Folder not found');
        }
        
        const folderPath = folderSnap.data().path;
        path = `${folderPath}/${data.name}`;
      }
      
      const fileData = {
        teamId,
        name: data.name,
        description: data.description || '',
        type: data.type,
        size: data.size,
        url: data.url,
        path,
        folderId: data.folderId || null,
        createdBy: data.createdBy,
        lastModifiedBy: data.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1,
        metadata: data.metadata || {}
      };
      
      const fileRef = await addDoc(collection(db, 'teamFiles'), fileData);
      
      return {
        id: fileRef.id,
        ...fileData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as TeamFile;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }
}

// Create singleton instance
const teamFilesService = new TeamFilesService();

/**
 * API endpoint for team files
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
    
    // Get team ID from URL
    const teamId = req.query.teamId as string;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
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
        // Check if requesting files or folders
        if (req.query.type === 'folders') {
          return handleGetFolders(req, res, teamId);
        } else {
          return handleGetFiles(req, res, teamId);
        }
        
      case 'POST':
        // Check if creating a folder or file
        if (req.body.resourceType === 'folder') {
          return handleCreateFolder(req, res, teamId, userId);
        } else {
          return handleCreateFile(req, res, teamId, userId);
        }
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team files API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get files request
 */
async function handleGetFiles(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const folderId = req.query.folderId as string | undefined;
    const fileType = req.query.fileType as string | undefined;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortDirection = req.query.sortDirection as 'asc' | 'desc' || 'desc';
    const limit = parseInt(req.query.limit as string) || 100;
    
    // Handle root folder request
    const folderIdParam = folderId === 'root' ? null : folderId;
    
    const files = await teamFilesService.getTeamFiles(
      teamId,
      { 
        folderId: folderIdParam || undefined,
        type: fileType,
        limit,
        sortBy,
        sortDirection
      }
    );
    
    return res.status(200).json({ files });
  } catch (error) {
    console.error('Error getting team files:', error);
    return res.status(500).json({ error: 'Failed to get team files' });
  }
}

/**
 * Handle get folders request
 */
async function handleGetFolders(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const parentId = req.query.parentId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    
    // Handle root folder request
    const parentIdParam = parentId === 'root' ? null : parentId;
    
    const folders = await teamFilesService.getTeamFolders(
      teamId,
      { parentId: parentIdParam || undefined, limit }
    );
    
    return res.status(200).json({ folders });
  } catch (error) {
    console.error('Error getting team folders:', error);
    return res.status(500).json({ error: 'Failed to get team folders' });
  }
}

/**
 * Handle create folder request
 */
async function handleCreateFolder(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to upload files
    const canUploadFiles = await permissionService.hasPermission(
      userId,
      teamId,
      'uploadFiles'
    );
    
    if (!canUploadFiles) {
      return res.status(403).json({
        error: 'You do not have permission to create folders'
      });
    }
    
    const { name, description, parentId } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    // Check if name contains invalid characters
    const invalidChars = /[\\/:*?"<>|]/;
    if (invalidChars.test(name)) {
      return res.status(400).json({ 
        error: 'Folder name contains invalid characters' 
      });
    }
    
    const folder = await teamFilesService.createFolder(
      teamId,
      {
        name,
        description,
        parentId,
        createdBy: userId
      }
    );
    
    return res.status(201).json({ folder });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    
    if (error?.message === 'Parent folder not found') {
      return res.status(400).json({ error: 'Parent folder not found' });
    }
    
    return res.status(500).json({ error: 'Failed to create folder' });
  }
}

/**
 * Handle create file request
 */
async function handleCreateFile(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to upload files
    const canUploadFiles = await permissionService.hasPermission(
      userId,
      teamId,
      'uploadFiles'
    );
    
    if (!canUploadFiles) {
      return res.status(403).json({
        error: 'You do not have permission to upload files'
      });
    }
    
    const { 
      name, 
      description, 
      type, 
      size, 
      url, 
      folderId, 
      metadata 
    } = req.body;
    
    // Validate required fields
    if (!name || !type || !url) {
      return res.status(400).json({ 
        error: 'Name, type, and URL are required' 
      });
    }
    
    // Check if name contains invalid characters
    const invalidChars = /[\\/:*?"<>|]/;
    if (invalidChars.test(name)) {
      return res.status(400).json({ 
        error: 'File name contains invalid characters' 
      });
    }
    
    // Create file record
    const file = await teamFilesService.createFile(
      teamId,
      {
        name,
        description,
        type,
        size: size || 0,
        url,
        folderId,
        createdBy: userId,
        metadata
      }
    );
    
    return res.status(201).json({ file });
  } catch (error: any) {
    console.error('Error creating file:', error);
    
    if (error?.message === 'Folder not found') {
      return res.status(400).json({ error: 'Folder not found' });
    }
    
    return res.status(500).json({ error: 'Failed to create file' });
  }
}