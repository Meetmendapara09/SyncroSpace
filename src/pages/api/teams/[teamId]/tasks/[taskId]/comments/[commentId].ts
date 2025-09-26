import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../../../services/auth/PermissionService';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../../../../../services/firebase/firebaseConfig';

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
 * Update comment input
 */
interface UpdateCommentInput {
  content: string;
  mentions?: string[];
  attachments?: Array<{ url: string; name: string; type: string }>;
}

/**
 * Task Comment Service
 */
class TaskCommentService {
  /**
   * Get a comment by ID
   */
  async getComment(commentId: string): Promise<TaskComment | null> {
    try {
      const commentRef = doc(db, 'taskComments', commentId);
      const commentSnap = await getDoc(commentRef);
      
      if (!commentSnap.exists()) {
        return null;
      }
      
      return {
        id: commentSnap.id,
        ...commentSnap.data()
      } as TaskComment;
    } catch (error) {
      console.error('Error getting comment:', error);
      throw error;
    }
  }
  
  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    userId: string,
    data: UpdateCommentInput
  ): Promise<TaskComment> {
    try {
      // Get the comment
      const commentRef = doc(db, 'taskComments', commentId);
      const commentSnap = await getDoc(commentRef);
      
      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }
      
      const comment = commentSnap.data() as TaskComment;
      
      // Only allow update if user created the comment
      if (comment.createdBy !== userId) {
        throw new Error('You can only edit your own comments');
      }
      
      // Validate content
      if (!data.content || data.content.trim() === '') {
        throw new Error('Comment content cannot be empty');
      }
      
      // Update data
      const updateData = {
        content: data.content.trim(),
        mentions: data.mentions || comment.mentions || [],
        attachments: data.attachments || comment.attachments || [],
        updatedAt: serverTimestamp(),
        editedAt: serverTimestamp()
      };
      
      // Update the comment
      await updateDoc(commentRef, updateData);
      
      // Get the updated comment
      const updatedCommentSnap = await getDoc(commentRef);
      return {
        id: updatedCommentSnap.id,
        ...updatedCommentSnap.data()
      } as TaskComment;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }
  
  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      // Get the comment
      const commentRef = doc(db, 'taskComments', commentId);
      const commentSnap = await getDoc(commentRef);
      
      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }
      
      const comment = commentSnap.data() as TaskComment;
      
      // Only allow delete if user created the comment
      if (comment.createdBy !== userId) {
        throw new Error('You can only delete your own comments');
      }
      
      // Delete the comment
      await deleteDoc(commentRef);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
  
  /**
   * Check if an admin can force delete a comment
   */
  async canAdminForceDelete(
    userId: string, 
    teamId: string
  ): Promise<boolean> {
    try {
      // Check if user is a team admin
      const isTeamAdmin = await permissionService.hasPermission(
        userId,
        teamId,
        'manageTasks'
      );
      
      return isTeamAdmin;
    } catch (error) {
      console.error('Error checking admin permissions:', error);
      return false;
    }
  }
  
  /**
   * Force delete a comment (admin only)
   */
  async forceDeleteComment(commentId: string): Promise<void> {
    try {
      const commentRef = doc(db, 'taskComments', commentId);
      const commentSnap = await getDoc(commentRef);
      
      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }
      
      // Delete the comment
      await deleteDoc(commentRef);
    } catch (error) {
      console.error('Error force deleting comment:', error);
      throw error;
    }
  }
  
  /**
   * Validate that a comment belongs to the correct task and team
   */
  async validateCommentTaskTeam(
    commentId: string,
    taskId: string,
    teamId: string
  ): Promise<boolean> {
    try {
      const comment = await this.getComment(commentId);
      
      if (!comment) {
        throw new Error('Comment not found');
      }
      
      if (comment.taskId !== taskId) {
        throw new Error('Comment does not belong to this task');
      }
      
      if (comment.teamId !== teamId) {
        throw new Error('Comment does not belong to this team');
      }
      
      return true;
    } catch (error) {
      console.error('Error validating comment task team:', error);
      throw error;
    }
  }
}

// Create singleton instance
const taskCommentService = new TaskCommentService();

/**
 * API endpoint for individual task comment operations
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
    
    // Get IDs from URL
    const teamId = req.query.teamId as string;
    const taskId = req.query.taskId as string;
    const commentId = req.query.commentId as string;
    
    if (!teamId || !taskId || !commentId) {
      return res.status(400).json({ 
        error: 'Team ID, Task ID, and Comment ID are required' 
      });
    }
    
    // Validate comment belongs to correct task and team
    try {
      await taskCommentService.validateCommentTaskTeam(
        commentId,
        taskId,
        teamId
      );
    } catch (error: any) {
      if (error?.message === 'Comment not found') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      if (error?.message === 'Comment does not belong to this task') {
        return res.status(403).json({
          error: 'Comment does not belong to this task'
        });
      }
      
      if (error?.message === 'Comment does not belong to this team') {
        return res.status(403).json({
          error: 'Comment does not belong to this team'
        });
      }
      
      return res.status(500).json({ error: 'Failed to validate comment' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetComment(req, res, userId, teamId, commentId);
        
      case 'PUT':
      case 'PATCH':
        return handleUpdateComment(req, res, userId, teamId, commentId);
        
      case 'DELETE':
        return handleDeleteComment(req, res, userId, teamId, commentId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in task comment API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get comment request
 */
async function handleGetComment(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  commentId: string
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
    
    const comment = await taskCommentService.getComment(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    return res.status(200).json({ comment });
  } catch (error) {
    console.error('Error getting comment:', error);
    return res.status(500).json({ error: 'Failed to get comment' });
  }
}

/**
 * Handle update comment request
 */
async function handleUpdateComment(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  commentId: string
) {
  try {
    // Check if user has permission to comment (basic permission check)
    const canCreateTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'createTasks'
    );
    
    if (!canCreateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to edit comments'
      });
    }
    
    const { content, mentions, attachments } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // Try to update comment
    try {
      const updatedComment = await taskCommentService.updateComment(
        commentId,
        userId,
        { content, mentions, attachments }
      );
      
      return res.status(200).json({ comment: updatedComment });
    } catch (error: any) {
      if (error?.message === 'Comment not found') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      if (error?.message === 'You can only edit your own comments') {
        return res.status(403).json({
          error: 'You can only edit your own comments'
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error updating comment:', error);
    return res.status(500).json({ error: 'Failed to update comment' });
  }
}

/**
 * Handle delete comment request
 */
async function handleDeleteComment(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  commentId: string
) {
  try {
    // Check if the request wants to force delete (admin only)
    const forceDelete = req.query.force === 'true';
    
    if (forceDelete) {
      // Check if user is admin
      const isAdmin = await taskCommentService.canAdminForceDelete(
        userId,
        teamId
      );
      
      if (!isAdmin) {
        return res.status(403).json({
          error: 'You do not have permission to force delete comments'
        });
      }
      
      // Force delete the comment
      await taskCommentService.forceDeleteComment(commentId);
      
      return res.status(200).json({
        success: true,
        message: 'Comment force deleted successfully'
      });
    }
    
    // Regular delete - check if user has permission to comment (basic perm check)
    const canCreateTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'createTasks'
    );
    
    if (!canCreateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to delete comments'
      });
    }
    
    // Try to delete comment
    try {
      await taskCommentService.deleteComment(commentId, userId);
      
      return res.status(200).json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error: any) {
      if (error?.message === 'Comment not found') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      if (error?.message === 'You can only delete your own comments') {
        return res.status(403).json({
          error: 'You can only delete your own comments'
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
}