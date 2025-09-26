import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../services/auth/PermissionService';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../../../services/firebase/firebaseConfig';

/**
 * Goal status options
 */
enum GoalStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

/**
 * Team goal interface
 */
interface TeamGoal {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  status: GoalStatus;
  startDate?: Timestamp;
  targetDate?: Timestamp;
  completedDate?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUpdatedBy?: string;
  owner: string;
  contributors: string[];
  progressPercentage: number;
  keyResults: Array<{
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    completed: boolean;
  }>;
  relatedTaskIds?: string[];
  tags?: string[];
  category?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

/**
 * Update goal input interface
 */
interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: GoalStatus;
  startDate?: Date | string | null;
  targetDate?: Date | string | null;
  completedDate?: Date | string | null;
  owner?: string;
  contributors?: string[];
  keyResults?: Array<{
    id?: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    completed?: boolean;
  }>;
  relatedTaskIds?: string[];
  tags?: string[];
  category?: string | null;
  priority?: number;
  metadata?: Record<string, any>;
}

/**
 * Goal Service
 */
class GoalService {
  /**
   * Get a goal by ID
   */
  async getGoal(goalId: string): Promise<TeamGoal | null> {
    try {
      const goalRef = doc(db, 'teamGoals', goalId);
      const goalSnap = await getDoc(goalRef);
      
      if (!goalSnap.exists()) {
        return null;
      }
      
      return {
        id: goalSnap.id,
        ...goalSnap.data()
      } as TeamGoal;
    } catch (error) {
      console.error('Error getting goal:', error);
      throw error;
    }
  }
  
  /**
   * Update a goal
   */
  async updateGoal(
    goalId: string,
    userId: string,
    data: UpdateGoalInput
  ): Promise<TeamGoal> {
    try {
      const goalRef = doc(db, 'teamGoals', goalId);
      const goalSnap = await getDoc(goalRef);
      
      if (!goalSnap.exists()) {
        throw new Error('Goal not found');
      }
      
      const goal = goalSnap.data() as TeamGoal;
      
      // Process date fields
      let updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: userId
      };
      
      // Handle date fields
      if ('startDate' in data) {
        if (data.startDate === null) {
          updateData.startDate = null;
        } else if (data.startDate) {
          updateData.startDate = typeof data.startDate === 'string'
            ? Timestamp.fromDate(new Date(data.startDate))
            : Timestamp.fromDate(data.startDate as Date);
        }
      }
      
      if ('targetDate' in data) {
        if (data.targetDate === null) {
          updateData.targetDate = null;
        } else if (data.targetDate) {
          updateData.targetDate = typeof data.targetDate === 'string'
            ? Timestamp.fromDate(new Date(data.targetDate))
            : Timestamp.fromDate(data.targetDate as Date);
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
      
      // Special handling for status changes to COMPLETED
      if (data.status === GoalStatus.COMPLETED && 
          goal.status !== GoalStatus.COMPLETED) {
        // If status is changing to COMPLETED and no completedDate provided, set it now
        if (!updateData.completedDate) {
          updateData.completedDate = Timestamp.fromDate(new Date());
        }
      }
      
      // Handle key results updates
      if (data.keyResults) {
        // Ensure all key results have IDs
        const keyResults = data.keyResults.map((kr) => {
          if (!kr.id) {
            return {
              ...kr,
              id: `kr-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              completed: kr.completed !== undefined ? kr.completed : (kr.current >= kr.target)
            };
          }
          
          // Auto-calculate completion if not specified
          if (kr.completed === undefined) {
            return {
              ...kr,
              completed: kr.current >= kr.target
            };
          }
          
          return kr;
        });
        
        updateData.keyResults = keyResults;
        
        // Calculate progress percentage based on key results
        if (keyResults.length > 0) {
          const totalProgress = keyResults.reduce((acc, kr) => {
            return acc + (kr.current / kr.target);
          }, 0);
          updateData.progressPercentage = Math.min(
            100, 
            Math.round((totalProgress / keyResults.length) * 100)
          );
        }
      }
      
      // If owner is being updated, verify they are a team member
      if (data.owner && data.owner !== goal.owner) {
        const teamMemberRef = doc(db, 'teams', goal.teamId, 'members', data.owner);
        const teamMemberSnap = await getDoc(teamMemberRef);
        
        if (!teamMemberSnap.exists()) {
          throw new Error('Goal owner must be a team member');
        }
      }
      
      // Update the goal
      await updateDoc(goalRef, updateData);
      
      // Return the updated goal
      const updatedGoalSnap = await getDoc(goalRef);
      return {
        id: updatedGoalSnap.id,
        ...updatedGoalSnap.data()
      } as TeamGoal;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }
  
  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string, teamId: string): Promise<void> {
    try {
      const goalRef = doc(db, 'teamGoals', goalId);
      const goalSnap = await getDoc(goalRef);
      
      if (!goalSnap.exists()) {
        throw new Error('Goal not found');
      }
      
      const goal = goalSnap.data();
      
      // Ensure goal belongs to the correct team
      if (goal.teamId !== teamId) {
        throw new Error('Goal does not belong to specified team');
      }
      
      // Delete the goal
      await deleteDoc(goalRef);
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }
  
  /**
   * Update a key result
   */
  async updateKeyResult(
    goalId: string,
    keyResultId: string,
    userId: string,
    data: {
      title?: string;
      target?: number;
      current?: number;
      unit?: string;
      completed?: boolean;
    }
  ): Promise<TeamGoal> {
    try {
      const goalRef = doc(db, 'teamGoals', goalId);
      const goalSnap = await getDoc(goalRef);
      
      if (!goalSnap.exists()) {
        throw new Error('Goal not found');
      }
      
      const goal = goalSnap.data() as TeamGoal;
      
      // Find the key result
      const keyResultIndex = goal.keyResults.findIndex(kr => kr.id === keyResultId);
      
      if (keyResultIndex === -1) {
        throw new Error('Key result not found');
      }
      
      // Create updated key results array
      const keyResults = [...goal.keyResults];
      
      // Update the specific key result
      keyResults[keyResultIndex] = {
        ...keyResults[keyResultIndex],
        ...(data.title && { title: data.title }),
        ...(data.target !== undefined && { target: data.target }),
        ...(data.current !== undefined && { current: data.current }),
        ...(data.unit && { unit: data.unit }),
        // If completed is provided, use it, otherwise auto-calculate based on current/target
        completed: data.completed !== undefined 
          ? data.completed 
          : (data.current !== undefined 
              ? data.current >= keyResults[keyResultIndex].target 
              : keyResults[keyResultIndex].completed)
      };
      
      // Calculate new progress percentage
      let progressPercentage = 0;
      if (keyResults.length > 0) {
        const totalProgress = keyResults.reduce((acc, kr) => {
          return acc + (kr.current / kr.target);
        }, 0);
        progressPercentage = Math.min(
          100, 
          Math.round((totalProgress / keyResults.length) * 100)
        );
      }
      
      // Update the goal
      await updateDoc(goalRef, {
        keyResults,
        progressPercentage,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: userId
      });
      
      // Return the updated goal
      const updatedGoalSnap = await getDoc(goalRef);
      return {
        id: updatedGoalSnap.id,
        ...updatedGoalSnap.data()
      } as TeamGoal;
    } catch (error) {
      console.error('Error updating key result:', error);
      throw error;
    }
  }
}

// Create singleton instance
const goalService = new GoalService();

/**
 * API endpoint for individual goal operations
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
    
    // Get team ID and goal ID from URL
    const teamId = req.query.teamId as string;
    const goalId = req.query.goalId as string;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }
    
    if (!goalId) {
      return res.status(400).json({ error: 'Goal ID is required' });
    }
    
    // Get the goal to verify team ownership
    const goal = await goalService.getGoal(goalId);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Verify goal belongs to the team in the URL
    if (goal.teamId !== teamId) {
      return res.status(403).json({
        error: 'Goal does not belong to this team'
      });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetGoal(req, res, userId, teamId, goalId, goal);
        
      case 'PUT':
      case 'PATCH':
        return handleUpdateGoal(req, res, userId, teamId, goalId);
        
      case 'DELETE':
        return handleDeleteGoal(req, res, userId, teamId, goalId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in goal API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get goal request
 */
async function handleGetGoal(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  goalId: string,
  goal: TeamGoal
) {
  try {
    // Check if user has permission to view goals
    const canViewGoals = await permissionService.hasPermission(
      userId,
      teamId,
      'viewGoals'
    );
    
    if (!canViewGoals) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Return the goal
    return res.status(200).json({ goal });
  } catch (error) {
    console.error('Error getting goal:', error);
    return res.status(500).json({ error: 'Failed to get goal' });
  }
}

/**
 * Handle update goal request
 */
async function handleUpdateGoal(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  goalId: string
) {
  try {
    // Check for special key result update request
    const keyResultId = req.query.keyResultId as string | undefined;
    
    if (keyResultId) {
      return handleUpdateKeyResult(req, res, userId, teamId, goalId, keyResultId);
    }
    
    // Check if user has permission to update goals
    const canUpdateGoals = await permissionService.hasPermission(
      userId,
      teamId,
      'updateGoals' as any
    );
    
    if (!canUpdateGoals) {
      return res.status(403).json({
        error: 'You do not have permission to update goals'
      });
    }
    
    const { 
      title, 
      description, 
      status, 
      startDate,
      targetDate,
      completedDate,
      owner,
      contributors,
      keyResults,
      relatedTaskIds,
      tags,
      category,
      priority,
      metadata
    } = req.body;
    
    // Validate status if provided
    if (status && !Object.values(GoalStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid goal status' });
    }
    
    // Validate dates if provided
    try {
      if (startDate) new Date(startDate);
      if (targetDate) new Date(targetDate);
      if (completedDate) new Date(completedDate);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }
    
    // Validate key results if provided
    if (keyResults) {
      if (!Array.isArray(keyResults)) {
        return res.status(400).json({ error: 'Key results must be an array' });
      }
      
      for (const kr of keyResults) {
        if (!kr.title || kr.target === undefined || !kr.unit) {
          return res.status(400).json({
            error: 'Each key result must have title, target, and unit'
          });
        }
        
        if (typeof kr.target !== 'number' || kr.target <= 0) {
          return res.status(400).json({
            error: 'Key result target must be a positive number'
          });
        }
        
        if (kr.current === undefined || 
            typeof kr.current !== 'number' || 
            kr.current < 0) {
          return res.status(400).json({
            error: 'Key result current value must be a non-negative number'
          });
        }
      }
    }
    
    // Update goal
    try {
      const updatedGoal = await goalService.updateGoal(
        goalId,
        userId,
        {
          title,
          description,
          status,
          startDate,
          targetDate,
          completedDate,
          owner,
          contributors,
          keyResults,
          relatedTaskIds,
          tags,
          category,
          priority,
          metadata
        }
      );
      
      return res.status(200).json({ goal: updatedGoal });
    } catch (error: any) {
      if (error?.message === 'Goal owner must be a team member') {
        return res.status(400).json({ error: 'Goal owner must be a team member' });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error updating goal:', error);
    return res.status(500).json({ error: 'Failed to update goal' });
  }
}

/**
 * Handle update key result request
 */
async function handleUpdateKeyResult(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  goalId: string,
  keyResultId: string
) {
  try {
    // Check if user has permission to update goals
    const canUpdateGoals = await permissionService.hasPermission(
      userId,
      teamId,
      'updateGoals' as any
    );
    
    if (!canUpdateGoals) {
      return res.status(403).json({
        error: 'You do not have permission to update goal key results'
      });
    }
    
    const { title, target, current, unit, completed } = req.body;
    
    // Validate data
    if (target !== undefined && (typeof target !== 'number' || target <= 0)) {
      return res.status(400).json({
        error: 'Target must be a positive number'
      });
    }
    
    if (current !== undefined && (typeof current !== 'number' || current < 0)) {
      return res.status(400).json({
        error: 'Current value must be a non-negative number'
      });
    }
    
    // At least one field must be provided to update
    if (title === undefined && 
        target === undefined && 
        current === undefined && 
        unit === undefined && 
        completed === undefined) {
      return res.status(400).json({
        error: 'At least one field to update must be provided'
      });
    }
    
    // Update key result
    try {
      const updatedGoal = await goalService.updateKeyResult(
        goalId,
        keyResultId,
        userId,
        { title, target, current, unit, completed }
      );
      
      return res.status(200).json({ goal: updatedGoal });
    } catch (error: any) {
      if (error?.message === 'Goal not found') {
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      if (error?.message === 'Key result not found') {
        return res.status(404).json({ error: 'Key result not found' });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error updating key result:', error);
    return res.status(500).json({ error: 'Failed to update key result' });
  }
}

/**
 * Handle delete goal request
 */
async function handleDeleteGoal(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  goalId: string
) {
  try {
    // Check if user has permission to delete goals
    const canDeleteGoals = await permissionService.hasPermission(
      userId,
      teamId,
      'deleteGoals' as any
    );
    
    if (!canDeleteGoals) {
      return res.status(403).json({
        error: 'You do not have permission to delete goals'
      });
    }
    
    // Delete the goal
    await goalService.deleteGoal(goalId, teamId);
    
    return res.status(200).json({ 
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting goal:', error);
    
    if (error?.message === 'Goal not found') {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    if (error?.message === 'Goal does not belong to specified team') {
      return res.status(403).json({ 
        error: 'Goal does not belong to specified team' 
      });
    }
    
    return res.status(500).json({ error: 'Failed to delete goal' });
  }
}