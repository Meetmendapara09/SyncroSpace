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
  serverTimestamp,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../../../services/firebase/firebaseConfig';

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
  labels?: string[];
  parentTaskId?: string;
  dependencies?: string[];
  attachments?: Array<{ url: string; name: string; type: string }>;
  metadata?: Record<string, any>;
}

/**
 * Create task input interface
 */
interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignees?: string[];
  dueDate?: Date | string;
  startDate?: Date | string;
  labels?: string[];
  parentTaskId?: string;
  dependencies?: string[];
  attachments?: Array<{ url: string; name: string; type: string }>;
  metadata?: Record<string, any>;
}

/**
 * Team Tasks Service
 */
class TeamTasksService {
  /**
   * Get team tasks with filtering
   */
  async getTeamTasks(
    teamId: string,
    options: {
      assigneeId?: string;
      status?: TaskStatus | TaskStatus[];
      priority?: TaskPriority | TaskPriority[];
      dueStartDate?: Date | string;
      dueEndDate?: Date | string;
      parentTaskId?: string;
      limit?: number;
    } = {}
  ) {
    try {
      const { 
        assigneeId, 
        status, 
        priority, 
        dueStartDate, 
        dueEndDate,
        parentTaskId, 
        limit = 100 
      } = options;
      
      // Build the query
      let tasksQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );
      
      // We can't add multiple array-contains conditions
      // So we'll filter in memory if multiple filters are needed
      
      // Get tasks matching the query
      const tasksSnapshot = await getDocs(tasksQuery);
      
      // Convert to array for filtering
      let tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamTask[];
      
      // Apply filters in memory
      if (assigneeId) {
        tasks = tasks.filter(task => task.assignees?.includes(assigneeId));
      }
      
      if (status) {
        if (Array.isArray(status)) {
          tasks = tasks.filter(task => status.includes(task.status));
        } else {
          tasks = tasks.filter(task => task.status === status);
        }
      }
      
      if (priority) {
        if (Array.isArray(priority)) {
          tasks = tasks.filter(task => priority.includes(task.priority));
        } else {
          tasks = tasks.filter(task => task.priority === priority);
        }
      }
      
      if (dueStartDate) {
        const startDate = typeof dueStartDate === 'string' 
          ? new Date(dueStartDate) 
          : dueStartDate;
        
        tasks = tasks.filter(task => 
          task.dueDate && task.dueDate.toDate() >= startDate
        );
      }
      
      if (dueEndDate) {
        const endDate = typeof dueEndDate === 'string'
          ? new Date(dueEndDate)
          : dueEndDate;
        
        tasks = tasks.filter(task =>
          task.dueDate && task.dueDate.toDate() <= endDate
        );
      }
      
      if (parentTaskId !== undefined) {
        if (parentTaskId) {
          tasks = tasks.filter(task => task.parentTaskId === parentTaskId);
        } else {
          // Filter for root tasks (no parent)
          tasks = tasks.filter(task => !task.parentTaskId);
        }
      }
      
      // Limit results
      return tasks.slice(0, limit);
    } catch (error) {
      console.error('Error getting team tasks:', error);
      throw error;
    }
  }
  
  /**
   * Create a new task
   */
  async createTask(
    teamId: string,
    userId: string,
    data: CreateTaskInput
  ): Promise<TeamTask> {
    try {
      // Parse dates if they're strings
      let dueDate = undefined;
      if (data.dueDate) {
        dueDate = typeof data.dueDate === 'string'
          ? Timestamp.fromDate(new Date(data.dueDate))
          : Timestamp.fromDate(data.dueDate);
      }
      
      let startDate = undefined;
      if (data.startDate) {
        startDate = typeof data.startDate === 'string'
          ? Timestamp.fromDate(new Date(data.startDate))
          : Timestamp.fromDate(data.startDate);
      }
      
      // Validate parent task if provided
      if (data.parentTaskId) {
        const parentTaskRef = doc(db, 'teamTasks', data.parentTaskId);
        const parentTaskSnap = await getDoc(parentTaskRef);
        
        if (!parentTaskSnap.exists()) {
          throw new Error('Parent task not found');
        }
        
        // Ensure parent task is in the same team
        if ((parentTaskSnap.data() as any).teamId !== teamId) {
          throw new Error('Parent task must be in the same team');
        }
      }
      
      // Validate dependencies if provided
      if (data.dependencies && data.dependencies.length > 0) {
        for (const depId of data.dependencies) {
          const depRef = doc(db, 'teamTasks', depId);
          const depSnap = await getDoc(depRef);
          
          if (!depSnap.exists()) {
            throw new Error(`Dependency task ${depId} not found`);
          }
          
          // Ensure dependency is in the same team
          if ((depSnap.data() as any).teamId !== teamId) {
            throw new Error('Dependency tasks must be in the same team');
          }
        }
      }
      
      const taskData = {
        teamId,
        title: data.title,
        description: data.description || '',
        status: data.status || TaskStatus.TODO,
        priority: data.priority || TaskPriority.MEDIUM,
        assignees: data.assignees || [],
        dueDate,
        startDate,
        labels: data.labels || [],
        parentTaskId: data.parentTaskId || null,
        dependencies: data.dependencies || [],
        attachments: data.attachments || [],
        metadata: data.metadata || {},
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const taskRef = await addDoc(collection(db, 'teamTasks'), taskData);
      
      return {
        id: taskRef.id,
        ...taskData,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      } as TeamTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }
}

// Create singleton instance
const teamTasksService = new TeamTasksService();

/**
 * API endpoint for team tasks
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
    
    // Check if user has permission to view tasks
    const canViewTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'viewTasks'
    );
    
    if (!canViewTasks) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetTasks(req, res, teamId);
        
      case 'POST':
        return handleCreateTask(req, res, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team tasks API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get tasks request
 */
async function handleGetTasks(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const assigneeId = req.query.assigneeId as string | undefined;
    const status = req.query.status as TaskStatus | TaskStatus[] | undefined;
    const priority = req.query.priority as TaskPriority | TaskPriority[] | undefined;
    const dueStartDate = req.query.dueStartDate as string | undefined;
    const dueEndDate = req.query.dueEndDate as string | undefined;
    const parentTaskId = req.query.parentTaskId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    
    // Handle "null" string for root tasks
    const parentTaskIdParam = parentTaskId === 'null' ? null : parentTaskId;
    
    const tasks = await teamTasksService.getTeamTasks(
      teamId,
      { 
        assigneeId,
        status,
        priority,
        dueStartDate,
        dueEndDate,
        parentTaskId: parentTaskIdParam as string | undefined,
        limit
      }
    );
    
    return res.status(200).json({ tasks });
  } catch (error) {
    console.error('Error getting team tasks:', error);
    return res.status(500).json({ error: 'Failed to get team tasks' });
  }
}

/**
 * Handle create task request
 */
async function handleCreateTask(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to create tasks
    const canCreateTasks = await permissionService.hasPermission(
      userId,
      teamId,
      'createTasks'
    );
    
    if (!canCreateTasks) {
      return res.status(403).json({
        error: 'You do not have permission to create tasks'
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
      labels,
      parentTaskId,
      dependencies,
      attachments,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    
    // Validate status if provided
    if (status && !Object.values(TaskStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }
    
    // Validate priority if provided
    if (priority && !Object.values(TaskPriority).includes(priority)) {
      return res.status(400).json({ error: 'Invalid task priority' });
    }
    
    // Validate dates if provided
    try {
      if (dueDate) new Date(dueDate);
      if (startDate) new Date(startDate);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid date format for due date or start date' 
      });
    }
    
    // Create task
    const task = await teamTasksService.createTask(
      teamId,
      userId,
      {
        title,
        description,
        status,
        priority,
        assignees,
        dueDate,
        startDate,
        labels,
        parentTaskId,
        dependencies,
        attachments,
        metadata
      }
    );
    
    return res.status(201).json({ task });
  } catch (error: any) {
    console.error('Error creating task:', error);
    
    if (error?.message === 'Parent task not found') {
      return res.status(400).json({ error: 'Parent task not found' });
    }
    
    if (error?.message === 'Parent task must be in the same team') {
      return res.status(400).json({ 
        error: 'Parent task must be in the same team' 
      });
    }
    
    if (error?.message?.includes('Dependency task')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to create task' });
  }
}