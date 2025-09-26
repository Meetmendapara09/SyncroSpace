import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../../services/auth/PermissionService';
import { 
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  addDoc,
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../../../services/firebase/firebaseConfig';

/**
 * Channel interface
 */
interface Channel {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  type: 'general' | 'project' | 'department' | 'private';
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  members?: string[];
}

/**
 * Message service for channel communication
 */
class MessageService {
  /**
   * Get channel by ID
   */
  async getChannel(channelId: string): Promise<Channel | null> {
    try {
      const channelRef = doc(db, 'teamChannels', channelId);
      const channelSnap = await getDoc(channelRef);
      
      if (!channelSnap.exists()) {
        return null;
      }
      
      return {
        id: channelSnap.id,
        ...channelSnap.data()
      } as Channel;
    } catch (error) {
      console.error('Error getting channel:', error);
      throw error;
    }
  }
  
  /**
   * Get messages from a channel
   */
  async getChannelMessages(channelId: string, options = { limit: 50 }) {
    try {
      const messagesQuery = query(
        collection(db, 'channelMessages'),
        where('channelId', '==', channelId),
        orderBy('createdAt', 'desc'),
        limit(options.limit)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      return messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting channel messages:', error);
      throw error;
    }
  }
  
  /**
   * Create a message in a channel
   */
  async createMessage(data: {
    channelId: string;
    content: string;
    authorId: string;
    attachments?: Array<{ url: string; type: string; name: string }>;
    metadata?: Record<string, any>;
  }) {
    try {
      const messageData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const messageRef = await addDoc(collection(db, 'channelMessages'), messageData);
      
      return {
        id: messageRef.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }
  
  /**
   * Check if user is a member of a private channel
   */
  async isChannelMember(channelId: string, userId: string): Promise<boolean> {
    try {
      const channel = await this.getChannel(channelId);
      
      if (!channel) {
        return false;
      }
      
      // Public channels - everyone is a member
      if (channel.type !== 'private') {
        return true;
      }
      
      // Private channels - check members list
      return channel.members?.includes(userId) || false;
    } catch (error) {
      console.error('Error checking channel membership:', error);
      throw error;
    }
  }
}

// Create singleton instance
const messageService = new MessageService();

/**
 * API endpoint for channel messages
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
    
    // Get team ID and channel ID from URL
    const teamId = req.query.teamId as string;
    const channelId = req.query.channelId as string;
    
    if (!teamId || !channelId) {
      return res.status(400).json({ 
        error: 'Team ID and channel ID are required' 
      });
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
    
    // Check if channel belongs to the team
    const channel = await messageService.getChannel(channelId);
    if (!channel || channel.teamId !== teamId) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // For private channels, check if user is a member
    if (channel.type === 'private') {
      const isChannelMember = await messageService.isChannelMember(channelId, userId);
      if (!isChannelMember) {
        return res.status(403).json({ error: 'Access denied to private channel' });
      }
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetMessages(req, res, channelId);
        
      case 'POST':
        return handleCreateMessage(req, res, channelId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in channel messages API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get messages request
 */
async function handleGetMessages(
  req: NextApiRequest,
  res: NextApiResponse,
  channelId: string
) {
  try {
    const limitParam = parseInt(req.query.limit as string) || 50;
    const messages = await messageService.getChannelMessages(channelId, {
      limit: Math.min(limitParam, 100) // Cap at 100 messages max
    });
    
    return res.status(200).json({ messages });
  } catch (error) {
    console.error('Error getting messages:', error);
    return res.status(500).json({ error: 'Failed to get messages' });
  }
}

/**
 * Handle create message request
 */
async function handleCreateMessage(
  req: NextApiRequest,
  res: NextApiResponse,
  channelId: string,
  userId: string
) {
  try {
    const { content, attachments, metadata } = req.body;
    
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ 
        error: 'Message content or attachments are required' 
      });
    }
    
    const message = await messageService.createMessage({
      channelId,
      content: content || '',
      authorId: userId,
      attachments,
      metadata
    });
    
    return res.status(201).json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ error: 'Failed to create message' });
  }
}