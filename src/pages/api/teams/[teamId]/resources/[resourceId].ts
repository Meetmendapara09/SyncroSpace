import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { teamService } from '../../../../../services/team/TeamService';
import { permissionService } from '../../../../../services/auth/PermissionService';
import { 
  TeamResource,
  CreateResourceInput 
} from '../../../../../models/team/TeamResource';
import { db } from '../../../../../services/firebase/firebaseConfig';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Implements resources API methods on top of TeamService
 */
class ResourceService {
  /**
   * Get a specific team resource by ID
   */
  async getResource(resourceId: string): Promise<TeamResource | null> {
    try {
      const resourceRef = doc(db, 'teamResources', resourceId);
      const resourceDoc = await getDoc(resourceRef);
      
      if (!resourceDoc.exists()) {
        return null;
      }
      
      return resourceDoc.data() as TeamResource;
    } catch (error) {
      console.error('Error getting resource:', error);
      throw error;
    }
  }
  
  /**
   * Update a team resource
   */
  async updateResource(
    resourceId: string,
    data: Partial<CreateResourceInput>
  ): Promise<TeamResource> {
    try {
      const resourceRef = doc(db, 'teamResources', resourceId);
      const resourceDoc = await getDoc(resourceRef);
      
      if (!resourceDoc.exists()) {
        throw new Error('Resource not found');
      }
      
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(resourceRef, updateData);
      
      // Get the updated resource
      const updatedDoc = await getDoc(resourceRef);
      return updatedDoc.data() as TeamResource;
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  }
  
  /**
   * Delete a team resource
   */
  async deleteResource(resourceId: string): Promise<void> {
    try {
      const resourceRef = doc(db, 'teamResources', resourceId);
      const resourceDoc = await getDoc(resourceRef);
      
      if (!resourceDoc.exists()) {
        throw new Error('Resource not found');
      }
      
      await deleteDoc(resourceRef);
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }
}

// Create a singleton resource service
const resourceService = new ResourceService();

/**
 * API endpoint for operations on a specific team resource
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
    
    // Get team ID and resource ID from URL
    const teamId = req.query.teamId as string;
    const resourceId = req.query.resourceId as string;
    
    if (!teamId || !resourceId) {
      return res.status(400).json({ 
        error: 'Team ID and resource ID are required' 
      });
    }
    
    // Check if user is a team member
    const canViewResources = await permissionService.hasPermission(
      userId,
      teamId,
      'viewResources'
    );
    
    if (!canViewResources) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetResource(req, res, resourceId);
        
      case 'PUT':
        return handleUpdateResource(req, res, teamId, resourceId, userId);
        
      case 'DELETE':
        return handleDeleteResource(req, res, teamId, resourceId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team resource API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get resource request
 */
async function handleGetResource(
  req: NextApiRequest,
  res: NextApiResponse,
  resourceId: string
) {
  try {
    const resource = await resourceService.getResource(resourceId);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    return res.status(200).json({ resource });
  } catch (error) {
    console.error('Error getting team resource:', error);
    return res.status(500).json({ error: 'Failed to get team resource' });
  }
}

/**
 * Handle update resource request
 */
async function handleUpdateResource(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  resourceId: string,
  userId: string
) {
  try {
    // Check if user has permission to edit resources
    const canEditResources = await permissionService.hasPermission(
      userId,
      teamId,
      'editResources'
    );
    
    if (!canEditResources) {
      return res.status(403).json({
        error: 'You do not have permission to update resources'
      });
    }
    
    const { 
      name, 
      description, 
      categoryId, 
      capacity, 
      unit,
      metadata 
    } = req.body;
    
    // At least one field is required for update
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }
    
    const resource = await resourceService.updateResource(resourceId, {
      name,
      description,
      categoryId,
      capacity,
      unit,
      metadata
    });
    
    return res.status(200).json({ resource });
  } catch (error: any) {
    console.error('Error updating team resource:', error);
    
    if (error?.message === 'Resource not found') {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    return res.status(500).json({ error: 'Failed to update team resource' });
  }
}

/**
 * Handle delete resource request
 */
async function handleDeleteResource(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  resourceId: string,
  userId: string
) {
  try {
    // Check if user has permission to delete resources
    const canDeleteResources = await permissionService.hasPermission(
      userId,
      teamId,
      'deleteFiles' // We use 'deleteFiles' as a proxy for resource deletion permission
    );
    
    if (!canDeleteResources) {
      return res.status(403).json({
        error: 'You do not have permission to delete resources'
      });
    }
    
    await resourceService.deleteResource(resourceId);
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting team resource:', error);
    
    if (error?.message === 'Resource not found') {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    return res.status(500).json({ error: 'Failed to delete team resource' });
  }
}