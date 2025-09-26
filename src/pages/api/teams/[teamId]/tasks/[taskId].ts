import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../services/auth/PermissionService';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  collection, 
  where,
  getDocs,
  serverTimestamp, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../../../services/firebase/firebaseConfig';

/**
 * Task priority levels
 */
enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Task status options
 */
enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

/**
 * Team task interface
 */
interface TeamTask {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: string[];
  dueDate?: Timestamp;
  startDate?: Timestamp;
  completedDate?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUpdatedBy?: string;
  labels?: string[];
  parentTaskId?: string;
  dependencies?: string[];
  attachments?: Array<{ url: string; name: string; type: string }>;
  metadata?: Record<string, any>;
}

/**
 * Update task input interface
 */
interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignees?: string[];
  dueDate?: Date | string | null;
  startDate?: Date | string | null;
  completedDate?: Date | string | null;
  labels?: string[];
  parentTaskId?: string | null;
  dependencies?: string[];
  attachments?: Array<{ url: string; name: string; type: string }>;
  metadata?: Record<string, any>;
}

/**
 * Task Service
 */
class TaskService {
  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<TeamTask | null> {
    try {
      const taskRef = doc(db, 'teamTasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
        return null;
      }
      
      return {
        id: taskSnap.id,
        ...taskSnap.data()
      } as TeamTask;
    } catch (error) {
      console.error('Error getting task:', error);
      throw error;
    }
  }
  
  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    userId: string,
    data: UpdateTaskInput
  ): Promise<TeamTask> {
    try {
      const taskRef = doc(db, 'teamTasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
        throw new Error('Task not found');
      }
      
      const task = taskSnap.data() as TeamTask;
      
      // Process date fields
      let updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: userId
      };
      
      // Handle date fields
      if ('dueDate' in data) {
        if (data.dueDate === null) {
          updateData.dueDate = null;
        } else if (data.dueDate) {
          updateData.dueDate = typeof data.dueDate === 'string'
            ? Timestamp.fromDate(new Date(data.dueDate))
            : Timestamp.fromDate(data.dueDate as Date);
        }
      }
      
      if ('startDate' in data) {
        if (data.startDate === null) {
          updateData.startDate = null;
        } else if (data.startDate) {
          updateData.startDate = typeof data.startDate === 'string'
            ? Timestamp.fromDate(new Date(data.startDate))
            : Timestamp.fromDate(data.startDate as Date);
        }
      }
      
      if ('completedDate' in data) {
        if (data.completedDate === null) {
          updateData.completedDate = null;
        } else if (data.completedDate) {
          updateData.completedDate = typeof data.completedDate === 'string'
            ? Timestamp.fromDate(new Date(data.completedDate))
            : Timestamp.fromDate(data.completedDate as Date);
        }
      }
      
      // Special handling for status changes to DONE
      if (data.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
        // If status is changing to DONE and no completedDate provided, set it now
        if (!updateData.completedDate) {
          updateData.completedDate = Timestamp.fromDate(new Date());
        }
      }
      
      // Validate parentTaskId if provided
      if ('parentTaskId' in data && data.parentTaskId !== null && data.parentTaskId !== undefined) {
        if (data.parentTaskId === taskId) {
          throw new Error('Task cannot be its own parent');
        }
        
        const parentTaskRef = doc(db, 'teamTasks', data.parentTaskId);
        const parentTaskSnap = await getDoc(parentTaskRef);
        
        if (!parentTaskSnap.exists()) {
          throw new Error('Parent task not found');
        }
        
        // Ensure parent task is in the same team
        if (parentTaskSnap.data().teamId !== task.teamId) {
          throw new Error('Parent task must be in the same team');
        }
        
        // Ensure we're not creating a circular dependency
        await this.validateNoCyclicDependency(taskId, data.parentTaskId!);
      }
      
      // Validate dependencies if provided
      if (data.dependencies && data.dependencies.length > 0) {
        for (const depId of data.dependencies) {
          if (depId === taskId) {
            throw new Error('Task cannot depend on itself');
          }
          
          const depRef = doc(db, 'teamTasks', depId);
          const depSnap = await getDoc(depRef);
          
          if (!depSnap.exists()) {
            throw new Error(`Dependency task ${depId} not found`);
          }
          
          // Ensure dependency is in the same team
          if (depSnap.data().teamId !== task.teamId) {
            throw new Error('Dependency tasks must be in the same team');
          }
          
          // Check for circular dependencies
          await this.validateNoCyclicDependency(taskId, depId);
        }
      }
      
      // Update the task
      await updateDoc(taskRef, updateData);
      
      // Return the updated task
      const updatedTaskSnap = await getDoc(taskRef);
      return {
        id: updatedTaskSnap.id,
        ...updatedTaskSnap.data()
      } as TeamTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }
  
  /**
   * Delete a task
   */
  async deleteTask(taskId: string, teamId: string): Promise<void> {
    try {
      const taskRef = doc(db, 'teamTasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
        throw new Error('Task not found');
      }
      
      const task = taskSnap.data();
      
      // Ensure task belongs to the correct team
      if (task.teamId !== teamId) {
        throw new Error('Task does not belong to specified team');
      }
      
      // Find child tasks
      const childTasksQuery = query(
        collection(db, 'teamTasks'),
        where('parentTaskId', '==', taskId)
      );
      const childTasksSnap = await getDocs(childTasksQuery);
      
      // Use a batch to delete task and update any child tasks
      const batch = writeBatch(db);
      
      // Delete the task
      batch.delete(taskRef);
      
      // Update children to remove parent reference
      childTasksSnap.forEach(childDoc => {
        batch.update(childDoc.ref, {
          parentTaskId: null,
          updatedAt: serverTimestamp()
        });
      });
      
      // Find tasks that depend on this task
      const dependentTasksQuery = query(
        collection(db, 'teamTasks'),
        where('dependencies', 'array-contains', taskId)
      );
      const dependentTasksSnap = await getDocs(dependentTasksQuery);
      
      // Update dependent tasks to remove this task from dependencies
      dependentTasksSnap.forEach(dependentDoc => {
        const currentDependencies = dependentDoc.data().dependencies || [];
        const updatedDependencies = currentDependencies.filter(
          (id: string) => id !== taskId
        );
        
        batch.update(dependentDoc.ref, {
          dependencies: updatedDependencies,
          updatedAt: serverTimestamp()
        });
      });
      
      // Commit the batch
      await batch.commit();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
  
  /**
   * Validate that adding a dependency or parent relationship doesn't create a cycle
   */
  private async validateNoCyclicDependency(
    taskId: string, 
    dependencyId: string,
    visited: Set<string> = new Set()
  ): Promise<boolean> {
    // If we encounter the original task again, we have a cycle
    if (visited.has(dependencyId)) {
      if (dependencyId === taskId) {
        throw new Error('Circular dependency detected');
      }
      
      // We've already checked this path, no need to check again
      return true;
    }
    
    // Mark current task as visited
    visited.add(dependencyId);
    
    // Get the dependency/parent task
    const depRef = doc(db, 'teamTasks', dependencyId);
    const depSnap = await getDoc(depRef);
    
    if (!depSnap.exists()) {
      return true; // No cycle possible if task doesn't exist
    }
    
    const depTask = depSnap.data();
    
    // Check parent relationship
    if (depTask.parentTaskId) {
      await this.validateNoCyclicDependency(
        taskId, 
        depTask.parentTaskId,
        visited
      );
    }
    
    // Check dependencies
    if (depTask.dependencies && Array.isArray(depTask.dependencies)) {
      for (const depDepId of depTask.dependencies) {
        await this.validateNoCyclicDependency(
          taskId,
          depDepId,
          visited
        );
      }
    }
    
    // No cycle found
    return true;
  }
}

// Create singleton instance
const taskService = new TaskService();

/**
 * API endpoint for individual task operations
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
    
    // Get the task to verify team ownership
    const task = await taskService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Verify task belongs to the team in the URL
    if (task.teamId !== teamId) {
      return res.status(403).json({
        error: 'Task does not belong to this team'
      });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetTask(req, res, userId, teamId, taskId, task);
        
      case 'PUT':
      case 'PATCH':
        return handleUpdateTask(req, res, userId, teamId, taskId);
        
      case 'DELETE':
        return handleDeleteTask(req, res, userId, teamId, taskId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in task API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get task request
 */
async function handleGetTask(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  taskId: string,
  task: TeamTask
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
    
    // Return the task
    return res.status(200).json({ task });
  } catch (error) {
    console.error('Error getting task:', error);
    return res.status(500).json({ error: 'Failed to get task' });
  }
}

/**
 * Handle update task request
 */
async function handleUpdateTask(
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
      'manageTasks' as any
    );

    if (!canUpdateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to update tasks'
      });
    }
    
    const { 
      title, 
      description, 
      status, 
      priority,
      assignees,
      dueDate,
      startDate,
      completedDate,
      labels,
      parentTaskId,
      dependencies,
      attachments,
      metadata
    } = req.body;
    
    // Validate status if provided
    if (status && !Object.values(TaskStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }
    
    // Validate priority if provided
    if (priority && !Object.values(TaskPriority).includes(priority)) {
      return res.status(400).json({ error: 'Invalid task priority' });
    }
    
    // Update task
    const updatedTask = await taskService.updateTask(
      taskId,
      userId,
      {
        title,
        description,
        status,
        priority,
        assignees,
        dueDate,
        startDate,
        completedDate,
        labels,
        parentTaskId,
        dependencies,
        attachments,
        metadata
      }
    );
    
    return res.status(200).json({ task: updatedTask });
  } catch (error: any) {
    console.error('Error updating task:', error);
    
    // Handle specific error cases
    if (error?.message === 'Task not found') {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (error?.message === 'Task cannot be its own parent') {
      return res.status(400).json({ 
        error: 'Task cannot be its own parent' 
      });
    }
    
    if (error?.message === 'Parent task not found') {
      return res.status(400).json({ error: 'Parent task not found' });
    }
    
    if (error?.message === 'Parent task must be in the same team') {
      return res.status(400).json({ 
        error: 'Parent task must be in the same team' 
      });
    }
    
    if (error?.message === 'Circular dependency detected') {
      return res.status(400).json({ 
        error: 'Circular dependency detected' 
      });
    }
    
    if (error?.message?.includes('Dependency task')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to update task' });
  }
}

/**
 * Handle delete task request
 */
async function handleDeleteTask(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  taskId: string
) {
  try {
    // Check if user has permission to delete tasks
    const canDeleteTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'manageTasks' as any
    );

    if (!canDeleteTasks) {
      return res.status(403).json({
        error: 'You do not have permission to delete tasks'
      });
    }

    // Delete the task
    await taskService.deleteTask(taskId, teamId);

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);

    if (error?.message === 'Task not found') {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (error?.message === 'Task does not belong to specified team') {
      return res.status(403).json({
        error: 'Task does not belong to specified team'
      });
    }

    return res.status(500).json({ error: 'Failed to delete task' });
  }
}