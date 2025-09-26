import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../../services/auth/PermissionService';
import { 
  doc, 
  getDoc, 
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
  orderBy,
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../../../../services/firebase/firebaseConfig';

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
 * Create checklist item input
 */
interface CreateChecklistItemInput {
  text: string;
  completed?: boolean;
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
 * Task Checklist Service
 */
class TaskChecklistService {
  /**
   * Get checklist items for a task
   */
  async getChecklistItems(taskId: string): Promise<ChecklistItem[]> {
    try {
      const itemsQuery = query(
        collection(db, 'taskChecklistItems'),
        where('taskId', '==', taskId),
        orderBy('position', 'asc'),
        orderBy('createdAt', 'asc')
      );
      
      const itemsSnap = await getDocs(itemsQuery);
      
      return itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChecklistItem[];
    } catch (error) {
      console.error('Error getting checklist items:', error);
      throw error;
    }
  }
  
  /**
   * Create a checklist item
   */
  async createChecklistItem(
    taskId: string,
    teamId: string,
    userId: string,
    data: CreateChecklistItemInput
  ): Promise<ChecklistItem> {
    try {
      // Validate text
      if (!data.text || data.text.trim() === '') {
        throw new Error('Checklist item text cannot be empty');
      }
      
      // Get the highest position value
      const itemsQuery = query(
        collection(db, 'taskChecklistItems'),
        where('taskId', '==', taskId),
        orderBy('position', 'desc')
      );
      
      const itemsSnap = await getDocs(itemsQuery);
      
      // Default position to the end of the list
      let position = 1;
      
      if (!itemsSnap.empty) {
        const highestPosition = itemsSnap.docs[0].data().position || 0;
        position = highestPosition + 1;
      }
      
      // Create item data
      const itemData: any = {
        taskId,
        teamId,
        text: data.text.trim(),
        completed: data.completed || false,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        position
      };
      
      // If it's already completed, add completed info
      if (data.completed) {
        itemData.completedBy = userId;
        itemData.completedAt = serverTimestamp();
      }
      
      // Create the checklist item
      const itemRef = await addDoc(
        collection(db, 'taskChecklistItems'), 
        itemData
      );
      
      return {
        id: itemRef.id,
        ...itemData,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        ...(data.completed && { completedAt: Timestamp.fromDate(new Date()) })
      } as ChecklistItem;
    } catch (error) {
      console.error('Error creating checklist item:', error);
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
   * Reorder checklist items
   */
  async reorderChecklistItems(
    taskId: string,
    itemOrder: { id: string; position: number }[]
  ): Promise<void> {
    try {
      // Get all items for the task
      const itemsQuery = query(
        collection(db, 'taskChecklistItems'),
        where('taskId', '==', taskId)
      );
      
      const itemsSnap = await getDocs(itemsQuery);
      
      // Create a map of item IDs to their document references
      const itemRefs = new Map();
      itemsSnap.forEach(doc => {
        itemRefs.set(doc.id, doc.ref);
      });
      
      // Create a batch for all updates
      const batch = writeBatch(db);
      
      // Update positions for each item in the order array
      for (const { id, position } of itemOrder) {
        const itemRef = itemRefs.get(id);
        
        if (itemRef) {
          batch.update(itemRef, {
            position,
            updatedAt: serverTimestamp()
          });
        } else {
          console.warn(`Checklist item ${id} not found for reordering`);
        }
      }
      
      // Commit all updates
      await batch.commit();
    } catch (error) {
      console.error('Error reordering checklist items:', error);
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
const taskChecklistService = new TaskChecklistService();

/**
 * API endpoint for task checklists
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
    
    if (!teamId || !taskId) {
      return res.status(400).json({ 
        error: 'Team ID and Task ID are required' 
      });
    }
    
    // Validate task existence and team ownership
    try {
      await taskChecklistService.validateTask(taskId, teamId);
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
        return handleGetChecklistItems(req, res, userId, teamId, taskId);
        
      case 'POST':
        return handleCreateChecklistItem(req, res, userId, teamId, taskId);
        
      case 'PATCH':
        return handleReorderChecklistItems(req, res, userId, teamId, taskId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in task checklist API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get checklist items request
 */
async function handleGetChecklistItems(
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
    
    // Get checklist items
    const items = await taskChecklistService.getChecklistItems(taskId);
    
    return res.status(200).json({ items });
  } catch (error) {
    console.error('Error getting checklist items:', error);
    return res.status(500).json({ 
      error: 'Failed to get checklist items' 
    });
  }
}

/**
 * Handle create checklist item request
 */
async function handleCreateChecklistItem(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  taskId: string
) {
  try {
    // Check if user has permission to update tasks
    const canUpdateTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'updateTasks'
    );
    
    if (!canUpdateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to update task checklists'
      });
    }
    
    const { text, completed } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ 
        error: 'Checklist item text is required' 
      });
    }
    
    // Create checklist item
    const item = await taskChecklistService.createChecklistItem(
      taskId,
      teamId,
      userId,
      { text, completed }
    );
    
    return res.status(201).json({ item });
  } catch (error) {
    console.error('Error creating checklist item:', error);
    return res.status(500).json({ 
      error: 'Failed to create checklist item' 
    });
  }
}

/**
 * Handle reordering checklist items request
 */
async function handleReorderChecklistItems(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  taskId: string
) {
  try {
    // Check if user has permission to update tasks
    const canUpdateTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'updateTasks'
    );
    
    if (!canUpdateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to update task checklists'
      });
    }
    
    const { itemOrder } = req.body;
    
    if (!Array.isArray(itemOrder)) {
      return res.status(400).json({
        error: 'Item order must be an array'
      });
    }
    
    // Validate item order format
    for (const item of itemOrder) {
      if (!item.id || typeof item.position !== 'number') {
        return res.status(400).json({
          error: 'Each item must have an id and position'
        });
      }
    }
    
    // Reorder checklist items
    await taskChecklistService.reorderChecklistItems(taskId, itemOrder);
    
    return res.status(200).json({
      success: true,
      message: 'Checklist items reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering checklist items:', error);
    return res.status(500).json({
      error: 'Failed to reorder checklist items'
    });
  }
}