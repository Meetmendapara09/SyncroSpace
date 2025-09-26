import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../services/firebase/firebaseAdmin';
import { teamService } from '../../../../services/team/TeamService';
import { permissionService } from '../../../../services/auth/PermissionService';
import { 
  TeamResource,
  CreateResourceInput 
} from '../../../../models/team/TeamResource';
import { db } from '../../../../services/firebase/firebaseConfig';
import { 
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  limit as firestoreLimit,
  startAfter
} from 'firebase/firestore';

/**
 * API endpoint for team resources management
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
    
    // Check if user has permission to view resources
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
        return handleGetResources(req, res, teamId);
        
      case 'POST':
        return handleCreateResource(req, res, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team resources API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Implements team resources API methods
 */
class ResourcesService {
  /**
   * Get team resources with filtering
   */
  async getTeamResources(
    teamId: string,
    options: {
      categoryId?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<TeamResource[]> {
    try {
      const { categoryId, limit = 50, page = 1 } = options;
      
      let resourcesQuery = query(
        collection(db, 'teamResources'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );
      
      // Add category filter if provided
      if (categoryId) {
        resourcesQuery = query(
          resourcesQuery,
          where('categoryId', '==', categoryId)
        );
      }
      
      // Handle pagination if needed
      if (page > 1) {
        // Get the last visible document from the previous page
        const previousPageQuery = query(
          collection(db, 'teamResources'),
          where('teamId', '==', teamId),
          orderBy('createdAt', 'desc'),
          firestoreLimit((page - 1) * limit)
        );
        
        const previousSnapshot = await getDocs(previousPageQuery);
        const lastVisible = previousSnapshot.docs[previousSnapshot.docs.length - 1];
        
        resourcesQuery = query(
          resourcesQuery,
          startAfter(lastVisible)
        );
      }
      
      const resourcesSnapshot = await getDocs(resourcesQuery);
      
      return resourcesSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as TeamResource
      );
    } catch (error) {
      console.error('Error getting team resources:', error);
      throw error;
    }
  }
  
  /**
   * Create a new team resource
   */
  async createResource(
    teamId: string,
    data: CreateResourceInput & { createdBy: string }
  ): Promise<TeamResource> {
    try {
      const resourceData = {
        teamId,
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const resourceRef = await addDoc(
        collection(db, 'teamResources'),
        resourceData
      );
      
      return {
        id: resourceRef.id,
        teamId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as TeamResource;
    } catch (error) {
      console.error('Error creating team resource:', error);
      throw error;
    }
  }
}

// Create a singleton resources service
const resourcesService = new ResourcesService();

/**
 * Handle get resources request
 */
async function handleGetResources(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    // Optional query parameters for filtering
    const categoryId = req.query.categoryId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    
    const resources = await resourcesService.getTeamResources(
      teamId, 
      { categoryId, limit, page }
    );
    
    return res.status(200).json({ resources });
  } catch (error) {
    console.error('Error getting team resources:', error);
    return res.status(500).json({ error: 'Failed to get team resources' });
  }
}

/**
 * Handle create resource request
 */
async function handleCreateResource(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to manage resources
    const canAllocateResources = await permissionService.hasPermission(
      userId,
      teamId,
      'allocateResources'
    );
    
    if (!canAllocateResources) {
      return res.status(403).json({
        error: 'You do not have permission to create resources'
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
    
    // Validate required fields
    if (!name || !categoryId) {
      return res.status(400).json({ 
        error: 'Name and categoryId are required' 
      });
    }
    
    if (capacity !== undefined && typeof capacity !== 'number') {
      return res.status(400).json({ 
        error: 'Capacity must be a number' 
      });
    }
    
    const resource = await resourcesService.createResource(teamId, {
      name,
      description,
      categoryId,
      capacity: capacity || 0,
      unit: unit || 'unit',
      metadata,
      createdBy: userId,
    });
    
    return res.status(201).json({ resource });
  } catch (error: any) {
    console.error('Error creating team resource:', error);
    return res.status(500).json({ error: 'Failed to create team resource' });
  }
}