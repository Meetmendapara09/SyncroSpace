import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../../services/auth/PermissionService';
import { 
  doc, 
  getDoc, 
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../../../../services/firebase/firebaseConfig';

/**
 * Task comment interface
 */
interface TaskComment {
  id: string;
  taskId: string;
  teamId: string;
  content: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  editedAt?: Timestamp;
  mentions?: string[];
  attachments?: Array<{ url: string; name: string; type: string }>;
}

/**
 * Create comment input
 */
interface CreateCommentInput {
  content: string;
  mentions?: string[];
  attachments?: Array<{ url: string; name: string; type: string }>;
}

/**
 * Task Comments Service
 */
class TaskCommentsService {
  /**
   * Get comments for a task
   */
  async getTaskComments(
    taskId: string,
    options: { 
      limit?: number;
      before?: Timestamp | Date | string;
      after?: Timestamp | Date | string;
    } = {}
  ): Promise<TaskComment[]> {
    try {
      const { limit: queryLimit = 50, before, after } = options;
      
      // Base query
      let commentsQuery = query(
        collection(db, 'taskComments'),
        where('taskId', '==', taskId),
        orderBy('createdAt', 'desc')
      );
      
      // Add time filters if provided
      if (before) {
        const beforeTimestamp = this.convertToTimestamp(before);
        commentsQuery = query(
          commentsQuery, 
          where('createdAt', '<', beforeTimestamp)
        );
      }
      
      if (after) {
        const afterTimestamp = this.convertToTimestamp(after);
        commentsQuery = query(
          commentsQuery, 
          where('createdAt', '>', afterTimestamp)
        );
      }
      
      // Add limit
      commentsQuery = query(commentsQuery, limit(queryLimit));
      
      const commentsSnap = await getDocs(commentsQuery);
      
      return commentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaskComment[];
    } catch (error) {
      console.error('Error getting task comments:', error);
      throw error;
    }
  }
  
  /**
   * Create a comment for a task
   */
  async createComment(
    taskId: string,
    teamId: string,
    userId: string,
    data: CreateCommentInput
  ): Promise<TaskComment> {
    try {
      // Validate content
      if (!data.content || data.content.trim() === '') {
        throw new Error('Comment content cannot be empty');
      }
      
      // Create the comment
      const commentData = {
        taskId,
        teamId,
        content: data.content.trim(),
        mentions: data.mentions || [],
        attachments: data.attachments || [],
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const commentRef = await addDoc(collection(db, 'taskComments'), commentData);
      
      return {
        id: commentRef.id,
        ...commentData,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      } as TaskComment;
    } catch (error) {
      console.error('Error creating task comment:', error);
      throw error;
    }
  }
  
  /**
   * Validate that a task exists and belongs to the team
   */
  async validateTask(taskId: string, teamId: string): Promise<boolean> {
    try {
      const taskRef = doc(db, 'teamTasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
        throw new Error('Task not found');
      }
      
      const task = taskSnap.data();
      
      if (task.teamId !== teamId) {
        throw new Error('Task does not belong to this team');
      }
      
      return true;
    } catch (error) {
      console.error('Error validating task:', error);
      throw error;
    }
  }
  
  /**
   * Convert various date/time formats to Firestore Timestamp
   */
  private convertToTimestamp(
    time: Timestamp | Date | string
  ): Timestamp {
    if (time instanceof Timestamp) {
      return time;
    }
    
    if (time instanceof Date) {
      return Timestamp.fromDate(time);
    }
    
    return Timestamp.fromDate(new Date(time));
  }
}

// Create singleton instance
const taskCommentsService = new TaskCommentsService();

/**
 * API endpoint for task comments
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
    
    // Get team ID and task ID from URL
    const teamId = req.query.teamId as string;
    const taskId = req.query.taskId as string;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    // Validate task existence and team ownership
    try {
      await taskCommentsService.validateTask(taskId, teamId);
    } catch (error: any) {
      if (error?.message === 'Task not found') {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      if (error?.message === 'Task does not belong to this team') {
        return res.status(403).json({
          error: 'Task does not belong to this team'
        });
      }
      
      return res.status(500).json({ error: 'Failed to validate task' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetComments(req, res, userId, teamId, taskId);
        
      case 'POST':
        return handleCreateComment(req, res, userId, teamId, taskId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in task comments API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get comments request
 */
async function handleGetComments(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  taskId: string
) {
  try {
    // Check if user has permission to view tasks
    const canViewTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'viewTasks'
    );
    
    if (!canViewTasks) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const queryLimit = req.query.limit 
      ? parseInt(req.query.limit as string) 
      : 50;
    
    const before = req.query.before as string | undefined;
    const after = req.query.after as string | undefined;
    
    const comments = await taskCommentsService.getTaskComments(
      taskId,
      { 
        limit: queryLimit,
        before,
        after
      }
    );
    
    return res.status(200).json({ comments });
  } catch (error) {
    console.error('Error getting task comments:', error);
    return res.status(500).json({ error: 'Failed to get task comments' });
  }
}

/**
 * Handle create comment request
 */
async function handleCreateComment(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  taskId: string
) {
  try {
    // Check if user has permission to create tasks (which includes commenting)
    const canCreateTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'createTasks'
    );
    
    if (!canCreateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to comment on tasks'
      });
    }
    
    const { content, mentions, attachments } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const comment = await taskCommentsService.createComment(
      taskId,
      teamId,
      userId,
      { content, mentions, attachments }
    );
    
    return res.status(201).json({ comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ error: 'Failed to create comment' });
  }
}