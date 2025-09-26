import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../services/auth/PermissionService';
import { 
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../services/firebase/firebaseConfig';

/**
 * Channel types for team communication
 */
enum ChannelType {
  GENERAL = 'general',
  PROJECT = 'project',
  DEPARTMENT = 'department',
  PRIVATE = 'private',
}

/**
 * Communication channel service
 */
class ChannelService {
  /**
   * Get all channels for a team
   */
  async getTeamChannels(teamId: string, userId: string) {
    try {
      // For public channels
      const publicChannelsQuery = query(
        collection(db, 'teamChannels'),
        where('teamId', '==', teamId),
        where('type', '!=', ChannelType.PRIVATE),
        orderBy('type'),
        orderBy('name')
      );
      
      // For private channels this user is a member of
      const privateChannelsQuery = query(
        collection(db, 'teamChannels'),
        where('teamId', '==', teamId),
        where('type', '==', ChannelType.PRIVATE),
        where('members', 'array-contains', userId)
      );
      
      const [publicSnapshot, privateSnapshot] = await Promise.all([
        getDocs(publicChannelsQuery),
        getDocs(privateChannelsQuery)
      ]);
      
      const publicChannels = publicSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const privateChannels = privateSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return [...publicChannels, ...privateChannels];
    } catch (error) {
      console.error('Error getting team channels:', error);
      throw error;
    }
  }
  
  /**
   * Create a new channel
   */
  async createChannel(data: {
    teamId: string;
    name: string;
    description?: string;
    type: ChannelType;
    createdBy: string;
    members?: string[];
  }) {
    try {
      // For private channels, ensure members array is provided and includes creator
      if (data.type === ChannelType.PRIVATE) {
        if (!data.members || !data.members.length) {
          data.members = [data.createdBy];
        } else if (!data.members.includes(data.createdBy)) {
          data.members.push(data.createdBy);
        }
      }
      
      const channelData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const channelRef = await addDoc(collection(db, 'teamChannels'), channelData);
      
      return {
        id: channelRef.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }
}

// Create singleton instance
const channelService = new ChannelService();

/**
 * API endpoint for team communication channels
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
    
    // Check if user is a team member
    const isTeamMember = await permissionService.hasPermission(
      userId,
      teamId,
      'viewResources'
    );
    
    if (!isTeamMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetChannels(req, res, teamId, userId);
        
      case 'POST':
        return handleCreateChannel(req, res, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in channels API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get channels request
 */
async function handleGetChannels(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    const channels = await channelService.getTeamChannels(teamId, userId);
    return res.status(200).json({ channels });
  } catch (error) {
    console.error('Error getting channels:', error);
    return res.status(500).json({ error: 'Failed to get channels' });
  }
}

/**
 * Handle create channel request
 */
async function handleCreateChannel(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to create channels
    const canManageChannels = await permissionService.hasPermission(
      userId,
      teamId,
      'manageChannels'
    );
    
    // Users can create private channels without the manage permission
    const isPrivateChannel = req.body.type === ChannelType.PRIVATE;
    
    if (!canManageChannels && !isPrivateChannel) {
      return res.status(403).json({
        error: 'You do not have permission to create channels'
      });
    }
    
    const { name, description, type, members } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ 
        error: 'Channel name and type are required' 
      });
    }
    
    if (!Object.values(ChannelType).includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid channel type' 
      });
    }
    
    const channel = await channelService.createChannel({
      teamId,
      name,
      description,
      type,
      createdBy: userId,
      members
    });
    
    return res.status(201).json({ channel });
  } catch (error) {
    console.error('Error creating channel:', error);
    return res.status(500).json({ error: 'Failed to create channel' });
  }
}