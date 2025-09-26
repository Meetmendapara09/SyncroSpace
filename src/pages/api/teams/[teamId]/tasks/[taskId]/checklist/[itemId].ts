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
 * Checklist item interface
 */
interface ChecklistItem {
  id: string;
  taskId: string;
  teamId: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  position: number;
}

/**
 * Update checklist item input
 */
interface UpdateChecklistItemInput {
  text?: string;
  completed?: boolean;
  position?: number;
}

/**
 * Task Checklist Item Service
 */
class TaskChecklistItemService {
  /**
   * Get a checklist item by ID
   */
  async getChecklistItem(itemId: string): Promise<ChecklistItem | null> {
    try {
      const itemRef = doc(db, 'taskChecklistItems', itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        return null;
      }
      
      return {
        id: itemSnap.id,
        ...itemSnap.data()
      } as ChecklistItem;
    } catch (error) {
      console.error('Error getting checklist item:', error);
      throw error;
    }
  }
  
  /**
   * Update a checklist item
   */
  async updateChecklistItem(
    itemId: string,
    userId: string,
    data: UpdateChecklistItemInput
  ): Promise<ChecklistItem> {
    try {
      const itemRef = doc(db, 'taskChecklistItems', itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Checklist item not found');
      }
      
      const item = itemSnap.data() as ChecklistItem;
      
      // Build update data
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      
      // Update text if provided
      if (data.text !== undefined) {
        if (!data.text || data.text.trim() === '') {
          throw new Error('Checklist item text cannot be empty');
        }
        updateData.text = data.text.trim();
      }
      
      // Update position if provided
      if (data.position !== undefined) {
        updateData.position = data.position;
      }
      
      // Handle completion state change
      if (data.completed !== undefined && data.completed !== item.completed) {
        updateData.completed = data.completed;
        
        // If completing the item, add completion info
        if (data.completed) {
          updateData.completedBy = userId;
          updateData.completedAt = serverTimestamp();
        } else {
          // If uncompleting, remove completion info
          updateData.completedBy = null;
          updateData.completedAt = null;
        }
      }
      
      // Update the checklist item
      await updateDoc(itemRef, updateData);
      
      // Get updated item
      const updatedItemSnap = await getDoc(itemRef);
      
      return {
        id: updatedItemSnap.id,
        ...updatedItemSnap.data()
      } as ChecklistItem;
    } catch (error) {
      console.error('Error updating checklist item:', error);
      throw error;
    }
  }
  
  /**
   * Delete a checklist item
   */
  async deleteChecklistItem(itemId: string): Promise<void> {
    try {
      const itemRef = doc(db, 'taskChecklistItems', itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Checklist item not found');
      }
      
      // Delete the item
      await deleteDoc(itemRef);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      throw error;
    }
  }
  
  /**
   * Validate that a checklist item belongs to the task and team
   */
  async validateChecklistItem(
    itemId: string,
    taskId: string,
    teamId: string
  ): Promise<boolean> {
    try {
      const itemRef = doc(db, 'taskChecklistItems', itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Checklist item not found');
      }
      
      const item = itemSnap.data();
      
      if (item.taskId !== taskId) {
        throw new Error('Checklist item does not belong to this task');
      }
      
      if (item.teamId !== teamId) {
        throw new Error('Checklist item does not belong to this team');
      }
      
      return true;
    } catch (error) {
      console.error('Error validating checklist item:', error);
      throw error;
    }
  }
}

// Create singleton instance
const taskChecklistItemService = new TaskChecklistItemService();

/**
 * API endpoint for individual checklist item operations
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
    const itemId = req.query.itemId as string;
    
    if (!teamId || !taskId || !itemId) {
      return res.status(400).json({ 
        error: 'Team ID, Task ID, and Item ID are required' 
      });
    }
    
    // Validate checklist item belongs to correct task and team
    try {
      await taskChecklistItemService.validateChecklistItem(
        itemId,
        taskId,
        teamId
      );
    } catch (error: any) {
      if (error?.message === 'Checklist item not found') {
        return res.status(404).json({ error: 'Checklist item not found' });
      }
      
      if (error?.message === 'Checklist item does not belong to this task') {
        return res.status(403).json({
          error: 'Checklist item does not belong to this task'
        });
      }
      
      if (error?.message === 'Checklist item does not belong to this team') {
        return res.status(403).json({
          error: 'Checklist item does not belong to this team'
        });
      }
      
      return res.status(500).json({ error: 'Failed to validate checklist item' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetChecklistItem(req, res, userId, teamId, itemId);
        
      case 'PUT':
      case 'PATCH':
        return handleUpdateChecklistItem(req, res, userId, teamId, itemId);
        
      case 'DELETE':
        return handleDeleteChecklistItem(req, res, userId, teamId, itemId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in checklist item API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get checklist item request
 */
async function handleGetChecklistItem(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  itemId: string
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
    
    // Get checklist item
    const item = await taskChecklistItemService.getChecklistItem(itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    return res.status(200).json({ item });
  } catch (error) {
    console.error('Error getting checklist item:', error);
    return res.status(500).json({ 
      error: 'Failed to get checklist item' 
    });
  }
}

/**
 * Handle update checklist item request
 */
async function handleUpdateChecklistItem(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  itemId: string
) {
  try {
    // Check if user has permission to update tasks
    const canUpdateTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'manageTasks' as any
    );

    if (!canUpdateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to update task checklists'
      });
    }

    const { text, completed, position } = req.body;

    // Validate text if provided
    if (text !== undefined && (!text || text.trim() === '')) {
      return res.status(400).json({
        error: 'Checklist item text cannot be empty'
      });
    }

    // Update checklist item
    const updatedItem = await taskChecklistItemService.updateChecklistItem(
      itemId,
      userId,
      { text, completed, position }
    );

    return res.status(200).json({ item: updatedItem });
  } catch (error: any) {
    console.error('Error updating checklist item:', error);

    if (error?.message === 'Checklist item not found') {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    return res.status(500).json({
      error: 'Failed to update checklist item'
    });
  }
}

/**
 * Handle delete checklist item request
 */
async function handleDeleteChecklistItem(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  itemId: string
) {
  try {
    // Check if user has permission to update tasks
    const canUpdateTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'manageTasks' as any
    );

    if (!canUpdateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to delete task checklist items'
      });
    }

    // Delete checklist item
    await taskChecklistItemService.deleteChecklistItem(itemId);

    return res.status(200).json({
      success: true,
      message: 'Checklist item deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting checklist item:', error);

    if (error?.message === 'Checklist item not found') {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    return res.status(500).json({
      error: 'Failed to delete checklist item'
    });
  }
}