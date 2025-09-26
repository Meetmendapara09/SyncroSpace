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
 * Create goal input interface
 */
interface CreateGoalInput {
  title: string;
  description?: string;
  status?: GoalStatus;
  startDate?: Date | string;
  targetDate?: Date | string;
  owner: string;
  contributors?: string[];
  keyResults?: Array<{
    title: string;
    target: number;
    current?: number;
    unit: string;
  }>;
  relatedTaskIds?: string[];
  tags?: string[];
  category?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

/**
 * Team Goals Service
 */
class TeamGoalsService {
  /**
   * Get team goals with filtering
   */
  async getTeamGoals(
    teamId: string,
    options: {
      status?: GoalStatus | GoalStatus[];
      owner?: string;
      contributor?: string;
      startDateFrom?: Date | string;
      targetDateTo?: Date | string;
      category?: string;
      tags?: string[];
      limit?: number;
    } = {}
  ) {
    try {
      const { 
        status, 
        owner, 
        contributor, 
        startDateFrom,
        targetDateTo,
        category,
        tags,
        limit = 50 
      } = options;
      
      // Build the query
      let goalsQuery = query(
        collection(db, 'teamGoals'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );
      
      // Get goals matching the query
      const goalsSnapshot = await getDocs(goalsQuery);
      
      // Convert to array for filtering
      let goals = goalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamGoal[];
      
      // Apply filters in memory
      if (status) {
        if (Array.isArray(status)) {
          goals = goals.filter(goal => status.includes(goal.status));
        } else {
          goals = goals.filter(goal => goal.status === status);
        }
      }
      
      if (owner) {
        goals = goals.filter(goal => goal.owner === owner);
      }
      
      if (contributor) {
        goals = goals.filter(goal => goal.contributors?.includes(contributor));
      }
      
      if (startDateFrom) {
        const startDate = typeof startDateFrom === 'string' 
          ? new Date(startDateFrom) 
          : startDateFrom;
        
        goals = goals.filter(goal => 
          goal.startDate && goal.startDate.toDate() >= startDate
        );
      }
      
      if (targetDateTo) {
        const targetDate = typeof targetDateTo === 'string' 
          ? new Date(targetDateTo) 
          : targetDateTo;
        
        goals = goals.filter(goal => 
          goal.targetDate && goal.targetDate.toDate() <= targetDate
        );
      }
      
      if (category) {
        goals = goals.filter(goal => goal.category === category);
      }
      
      if (tags && tags.length > 0) {
        goals = goals.filter(goal => {
          if (!goal.tags) return false;
          return tags.some(tag => goal.tags?.includes(tag));
        });
      }
      
      // Limit results
      return goals.slice(0, limit);
    } catch (error) {
      console.error('Error getting team goals:', error);
      throw error;
    }
  }
  
  /**
   * Create a new goal
   */
  async createGoal(
    teamId: string,
    userId: string,
    data: CreateGoalInput
  ): Promise<TeamGoal> {
    try {
      // Parse dates if they're strings
      let startDate = undefined;
      if (data.startDate) {
        startDate = typeof data.startDate === 'string'
          ? Timestamp.fromDate(new Date(data.startDate))
          : Timestamp.fromDate(data.startDate);
      }
      
      let targetDate = undefined;
      if (data.targetDate) {
        targetDate = typeof data.targetDate === 'string'
          ? Timestamp.fromDate(new Date(data.targetDate))
          : Timestamp.fromDate(data.targetDate);
      }
      
      // Make sure owner exists in the team
      const teamMemberRef = doc(db, 'teams', teamId, 'members', data.owner);
      const teamMemberSnap = await getDoc(teamMemberRef);
      
      if (!teamMemberSnap.exists()) {
        throw new Error('Goal owner must be a team member');
      }
      
      // Format key results with IDs
      const keyResults = data.keyResults?.map((kr, index) => ({
        id: `kr-${Date.now()}-${index}`,
        title: kr.title,
        target: kr.target,
        current: kr.current || 0,
        unit: kr.unit,
        completed: false
      })) || [];
      
      // Calculate initial progress percentage based on key results
      let progressPercentage = 0;
      if (keyResults.length > 0) {
        const totalProgress = keyResults.reduce((acc, kr) => {
          return acc + (kr.current / kr.target);
        }, 0);
        progressPercentage = Math.round((totalProgress / keyResults.length) * 100);
      }
      
      const goalData = {
        teamId,
        title: data.title,
        description: data.description || '',
        status: data.status || GoalStatus.PLANNED,
        startDate,
        targetDate,
        owner: data.owner,
        contributors: data.contributors || [],
        progressPercentage,
        keyResults,
        relatedTaskIds: data.relatedTaskIds || [],
        tags: data.tags || [],
        category: data.category || null,
        priority: data.priority || 1,
        metadata: data.metadata || {},
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const goalRef = await addDoc(collection(db, 'teamGoals'), goalData);
      
      return {
        id: goalRef.id,
        ...goalData,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      } as TeamGoal;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }
}

// Create singleton instance
const teamGoalsService = new TeamGoalsService();

/**
 * API endpoint for team goals
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
    
    // Check if user has permission to view goals
    const canViewGoals = await permissionService.hasPermission(
      userId,
      teamId,
      'viewGoals'
    );
    
    if (!canViewGoals) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetGoals(req, res, teamId);
        
      case 'POST':
        return handleCreateGoal(req, res, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team goals API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get goals request
 */
async function handleGetGoals(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const status = req.query.status as GoalStatus | GoalStatus[] | undefined;
    const owner = req.query.owner as string | undefined;
    const contributor = req.query.contributor as string | undefined;
    const startDateFrom = req.query.startDateFrom as string | undefined;
    const targetDateTo = req.query.targetDateTo as string | undefined;
    const category = req.query.category as string | undefined;
    const tags = req.query.tags as string[] | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const goals = await teamGoalsService.getTeamGoals(
      teamId,
      { 
        status,
        owner,
        contributor,
        startDateFrom,
        targetDateTo,
        category,
        tags,
        limit
      }
    );
    
    return res.status(200).json({ goals });
  } catch (error) {
    console.error('Error getting team goals:', error);
    return res.status(500).json({ error: 'Failed to get team goals' });
  }
}

/**
 * Handle create goal request
 */
async function handleCreateGoal(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to create goals
    const canCreateGoals = await permissionService.hasPermission(
      userId,
      teamId,
      'createGoals'
    );
    
    if (!canCreateGoals) {
      return res.status(403).json({
        error: 'You do not have permission to create goals'
      });
    }
    
    const { 
      title, 
      description, 
      status, 
      startDate,
      targetDate,
      owner,
      contributors,
      keyResults,
      relatedTaskIds,
      tags,
      category,
      priority,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Goal title is required' });
    }
    
    if (!owner) {
      return res.status(400).json({ error: 'Goal owner is required' });
    }
    
    // Validate status if provided
    if (status && !Object.values(GoalStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid goal status' });
    }
    
    // Validate dates if provided
    try {
      if (startDate) new Date(startDate);
      if (targetDate) new Date(targetDate);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid date format for start date or target date' 
      });
    }
    
    // Validate key results if provided
    if (keyResults) {
      if (!Array.isArray(keyResults)) {
        return res.status(400).json({ error: 'Key results must be an array' });
      }
      
      for (const kr of keyResults) {
        if (!kr.title || !kr.target || !kr.unit) {
          return res.status(400).json({
            error: 'Each key result must have title, target, and unit'
          });
        }
        
        if (typeof kr.target !== 'number' || kr.target <= 0) {
          return res.status(400).json({
            error: 'Key result target must be a positive number'
          });
        }
        
        if (kr.current !== undefined && 
            (typeof kr.current !== 'number' || kr.current < 0)) {
          return res.status(400).json({
            error: 'Key result current value must be a non-negative number'
          });
        }
      }
    }
    
    // Create goal
    try {
      const goal = await teamGoalsService.createGoal(
        teamId,
        userId,
        {
          title,
          description,
          status,
          startDate,
          targetDate,
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
      
      return res.status(201).json({ goal });
    } catch (error: any) {
      if (error?.message === 'Goal owner must be a team member') {
        return res.status(400).json({ error: 'Goal owner must be a team member' });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error creating goal:', error);
    return res.status(500).json({ error: 'Failed to create goal' });
  }
}