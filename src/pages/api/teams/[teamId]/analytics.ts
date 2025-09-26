import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../services/auth/PermissionService';
import { 
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  startAfter,
  endBefore,
  doc,
  getDoc,
  documentId
} from 'firebase/firestore';
import { db } from '../../../../services/firebase/firebaseConfig';

/**
 * Interface for Team Goal
 */
interface TeamGoal {
  id: string;
  title: string;
  description?: string;
  teamId: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  progressPercentage: number;
  keyResults?: any[];
  createdAt: any;
  createdBy: string;
  updatedAt: any;
  completedDate?: any;
  [key: string]: any;
}

/**
 * Interface for Team Task
 */
interface TeamTask {
  id: string;
  title: string;
  description?: string;
  teamId: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked' | 'cancelled';
  assignedTo?: string;
  createdBy?: string;
  lastUpdatedBy?: string;
  createdAt?: any;
  updatedAt?: any;
  completedDate?: any;
  dueDate?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  metadata?: {
    storyPoints?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Interface for Team Resource
 */
interface TeamResource {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  type: string;
  category: string;
  assignedTo?: string[];
  availability?: 'available' | 'in-use' | 'unavailable';
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

/**
 * Team Analytics Service
 */
class TeamAnalyticsService {
  /**
   * Get team activity summary
   */
  async getTeamActivitySummary(
    teamId: string,
    startDate?: Date | Timestamp | string,
    endDate?: Date | Timestamp | string
  ) {
    try {
      // Convert dates if needed
      let startTimestamp = startDate ? this.toTimestamp(startDate) : 
        Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Default to 30 days ago
      
      let endTimestamp = endDate ? this.toTimestamp(endDate) : 
        Timestamp.fromDate(new Date());
      
      // Get total tasks created in period
      const tasksCreated = await this.getTasksCreated(teamId, startTimestamp, endTimestamp);
      
      // Get total tasks completed in period
      const tasksCompleted = await this.getTasksCompleted(teamId, startTimestamp, endTimestamp);
      
      // Get total comments in period
      const commentsAdded = await this.getCommentsAdded(teamId, startTimestamp, endTimestamp);
      
      // Get goals progress in period
      const goalsProgress = await this.getGoalsProgress(teamId, startTimestamp, endTimestamp);
      
      // Get file activities in period
      const fileActivities = await this.getFileActivities(teamId, startTimestamp, endTimestamp);
      
      // Get member activity metrics
      const memberActivities = await this.getMemberActivities(teamId, startTimestamp, endTimestamp);
      
      // Get task completion trends (weekly)
      const completionTrend = await this.getTaskCompletionTrend(teamId, startTimestamp, endTimestamp);
      
      return {
        timeRange: {
          start: startTimestamp.toDate(),
          end: endTimestamp.toDate()
        },
        tasks: {
          created: tasksCreated.count,
          completed: tasksCompleted.count,
          completion_rate: tasksCreated.count > 0 ? 
            Math.round((tasksCompleted.count / tasksCreated.count) * 100) : 0,
          by_status: await this.getTasksByStatus(teamId)
        },
        comments: {
          added: commentsAdded
        },
        goals: {
          active: goalsProgress.active,
          completed: goalsProgress.completed,
          average_progress: goalsProgress.averageProgress
        },
        files: {
          uploaded: fileActivities.uploaded,
          downloaded: fileActivities.downloaded,
          shared: fileActivities.shared
        },
        members: {
          most_active: memberActivities.mostActive.slice(0, 5),
          least_active: memberActivities.leastActive.slice(0, 5),
          total_active: memberActivities.totalActive
        },
        trends: {
          task_completion: completionTrend
        }
      };
    } catch (error) {
      console.error('Error getting team activity summary:', error);
      throw error;
    }
  }
  
  /**
   * Get tasks created in period
   */
  private async getTasksCreated(
    teamId: string,
    startDate: Timestamp,
    endDate: Timestamp
  ) {
    try {
      const tasksQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      
      const tasksSnap = await getDocs(tasksQuery);
      
      return {
        count: tasksSnap.size,
        tasks: tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamTask))
      };
    } catch (error) {
      console.error('Error getting tasks created:', error);
      return { count: 0, tasks: [] };
    }
  }
  
  /**
   * Get tasks completed in period
   */
  private async getTasksCompleted(
    teamId: string,
    startDate: Timestamp,
    endDate: Timestamp
  ) {
    try {
      const tasksQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId),
        where('status', '==', 'done'),
        where('completedDate', '>=', startDate),
        where('completedDate', '<=', endDate)
      );
      
      const tasksSnap = await getDocs(tasksQuery);
      
      return {
        count: tasksSnap.size,
        tasks: tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamTask))
      };
    } catch (error) {
      console.error('Error getting tasks completed:', error);
      return { count: 0, tasks: [] };
    }
  }
  
  /**
   * Get comments added in period
   */
  private async getCommentsAdded(
    teamId: string,
    startDate: Timestamp,
    endDate: Timestamp
  ) {
    try {
      const commentsQuery = query(
        collection(db, 'taskComments'),
        where('teamId', '==', teamId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      
      const commentsSnap = await getDocs(commentsQuery);
      
      return commentsSnap.size;
    } catch (error) {
      console.error('Error getting comments added:', error);
      return 0;
    }
  }
  
  /**
   * Get goals progress in period
   */
  private async getGoalsProgress(
    teamId: string,
    startDate: Timestamp,
    endDate: Timestamp
  ) {
    try {
      // Get all active goals for the team
      const goalsQuery = query(
        collection(db, 'teamGoals'),
        where('teamId', '==', teamId),
        where('status', 'in', ['planned', 'in_progress'])
      );
      
      const goalsSnap = await getDocs(goalsQuery);
      const goals = goalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamGoal));
      
      // Get completed goals in period
      const completedGoalsQuery = query(
        collection(db, 'teamGoals'),
        where('teamId', '==', teamId),
        where('status', '==', 'completed'),
        where('completedDate', '>=', startDate),
        where('completedDate', '<=', endDate)
      );
      
      const completedGoalsSnap = await getDocs(completedGoalsQuery);
      const completedGoals = completedGoalsSnap.size;
      
      // Calculate average progress for active goals
      let totalProgress = 0;
      goals.forEach(goal => {
        totalProgress += goal.progressPercentage || 0;
      });
      
      const averageProgress = goals.length > 0 ? 
        Math.round(totalProgress / goals.length) : 0;
      
      return {
        active: goals.length,
        completed: completedGoals,
        averageProgress
      };
    } catch (error) {
      console.error('Error getting goals progress:', error);
      return { active: 0, completed: 0, averageProgress: 0 };
    }
  }
  
  /**
   * Get file activities in period
   */
  private async getFileActivities(
    teamId: string,
    startDate: Timestamp,
    endDate: Timestamp
  ) {
    try {
      // This would ideally use a file_activities collection
      // For now, we'll use the files collection with basic metrics
      
      // Get files uploaded in period
      const filesQuery = query(
        collection(db, 'teamFiles'),
        where('teamId', '==', teamId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      
      const filesSnap = await getDocs(filesQuery);
      const uploaded = filesSnap.size;
      
      // For downloads and shares, we'd need to track those events separately
      // For now, we'll return placeholder values
      return {
        uploaded,
        downloaded: 0,
        shared: 0
      };
    } catch (error) {
      console.error('Error getting file activities:', error);
      return { uploaded: 0, downloaded: 0, shared: 0 };
    }
  }
  
  /**
   * Get member activities in period
   */
  private async getMemberActivities(
    teamId: string,
    startDate: Timestamp,
    endDate: Timestamp
  ) {
    try {
      // Get team members
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        throw new Error('Team not found');
      }
      
      const members = teamSnap.data().members || [];
      
      // Initialize activity counts by member
      const memberActivities: Record<string, {
        userId: string;
        tasksCreated: number;
        tasksCompleted: number;
        commentsAdded: number;
        totalActions: number;
      }> = {};
      
      // Initialize for each member
      for (const memberId of members) {
        memberActivities[memberId] = {
          userId: memberId,
          tasksCreated: 0,
          tasksCompleted: 0,
          commentsAdded: 0,
          totalActions: 0
        };
      }
      
      // Get tasks created by members
      const tasksQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      
      const tasksSnap = await getDocs(tasksQuery);
      
      tasksSnap.forEach(doc => {
        const task = doc.data();
        if (task.createdBy && memberActivities[task.createdBy]) {
          memberActivities[task.createdBy].tasksCreated++;
          memberActivities[task.createdBy].totalActions++;
        }
      });
      
      // Get tasks completed by members
      const completedTasksQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId),
        where('status', '==', 'done'),
        where('completedDate', '>=', startDate),
        where('completedDate', '<=', endDate)
      );
      
      const completedTasksSnap = await getDocs(completedTasksQuery);
      
      completedTasksSnap.forEach(doc => {
        const task = doc.data();
        if (task.lastUpdatedBy && memberActivities[task.lastUpdatedBy]) {
          memberActivities[task.lastUpdatedBy].tasksCompleted++;
          memberActivities[task.lastUpdatedBy].totalActions++;
        }
      });
      
      // Get comments added by members
      const commentsQuery = query(
        collection(db, 'taskComments'),
        where('teamId', '==', teamId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      
      const commentsSnap = await getDocs(commentsQuery);
      
      commentsSnap.forEach(doc => {
        const comment = doc.data();
        if (comment.createdBy && memberActivities[comment.createdBy]) {
          memberActivities[comment.createdBy].commentsAdded++;
          memberActivities[comment.createdBy].totalActions++;
        }
      });
      
      // Convert to array and sort by activity
      const activitiesArray = Object.values(memberActivities);
      
      // Sort by total actions (descending)
      activitiesArray.sort((a, b) => b.totalActions - a.totalActions);
      
      // Filter for active members (at least one action)
      const activeMembers = activitiesArray.filter(m => m.totalActions > 0);
      
      return {
        mostActive: activeMembers,
        leastActive: [...activitiesArray].sort((a, b) => a.totalActions - b.totalActions),
        totalActive: activeMembers.length
      };
    } catch (error) {
      console.error('Error getting member activities:', error);
      return { mostActive: [], leastActive: [], totalActive: 0 };
    }
  }
  
  /**
   * Get tasks by status
   */
  private async getTasksByStatus(teamId: string) {
    try {
      const tasksQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId)
      );
      
      const tasksSnap = await getDocs(tasksQuery);
      const tasks = tasksSnap.docs.map(doc => doc.data());
      
      // Group by status
      const statusCounts: Record<string, number> = {
        'todo': 0,
        'in_progress': 0,
        'in_review': 0,
        'done': 0,
        'blocked': 0,
        'cancelled': 0
      };
      
      tasks.forEach(task => {
        const status = task.status || 'todo';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      return statusCounts;
    } catch (error) {
      console.error('Error getting tasks by status:', error);
      return {
        'todo': 0,
        'in_progress': 0,
        'in_review': 0,
        'done': 0,
        'blocked': 0,
        'cancelled': 0
      };
    }
  }
  
  /**
   * Get task completion trend (weekly)
   */
  private async getTaskCompletionTrend(
    teamId: string,
    startDate: Timestamp,
    endDate: Timestamp
  ) {
    try {
      // Get completed tasks in period
      const completedTasksQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId),
        where('status', '==', 'done'),
        where('completedDate', '>=', startDate),
        where('completedDate', '<=', endDate)
      );
      
      const completedTasksSnap = await getDocs(completedTasksQuery);
      const completedTasks = completedTasksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Group by week
      const weeklyCompletion: Record<string, number> = {};
      
      completedTasks.forEach((task: any) => {
        if (task.completedDate) {
          const completedDate = task.completedDate.toDate();
          
          // Get week start (Sunday)
          const weekStart = new Date(completedDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          
          const weekKey = weekStart.toISOString().split('T')[0];
          
          weeklyCompletion[weekKey] = (weeklyCompletion[weekKey] || 0) + 1;
        }
      });
      
      // Convert to array format for easier consumption by charts
      const trend = Object.entries(weeklyCompletion).map(([week, count]) => ({
        week,
        count
      }));
      
      // Sort by week
      trend.sort((a, b) => a.week.localeCompare(b.week));
      
      return trend;
    } catch (error) {
      console.error('Error getting task completion trend:', error);
      return [];
    }
  }
  
  /**
   * Get resource utilization metrics
   */
  async getResourceUtilization(teamId: string) {
    try {
      // Get all team resources
      const resourcesQuery = query(
        collection(db, 'teamResources'),
        where('teamId', '==', teamId)
      );
      
      const resourcesSnap = await getDocs(resourcesQuery);
      const resources = resourcesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeamResource));
      
      // Calculate allocation metrics
      const totalResources = resources.length;
      const allocatedResources = resources.filter(r => Array.isArray(r.assignedTo) && r.assignedTo.length > 0).length;
      const utilizationRate = totalResources > 0 ? 
        Math.round((allocatedResources / totalResources) * 100) : 0;
      
      // Group by category
      const categoryBreakdown: Record<string, number> = {};
      
      resources.forEach(resource => {
        const category = resource.category || 'uncategorized';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      });
      
      return {
        total: totalResources,
        allocated: allocatedResources,
        unallocated: totalResources - allocatedResources,
        utilizationRate,
        byCategory: categoryBreakdown
      };
    } catch (error) {
      console.error('Error getting resource utilization:', error);
      return {
        total: 0,
        allocated: 0,
        unallocated: 0,
        utilizationRate: 0,
        byCategory: {}
      };
    }
  }
  
  /**
   * Get team performance metrics
   */
  async getTeamPerformanceMetrics(
    teamId: string,
    startDate?: Date | Timestamp | string,
    endDate?: Date | Timestamp | string
  ) {
    try {
      // Convert dates if needed
      let startTimestamp = startDate ? this.toTimestamp(startDate) : 
        Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Default to 30 days ago
      
      let endTimestamp = endDate ? this.toTimestamp(endDate) : 
        Timestamp.fromDate(new Date());
      
      // Get tasks with due dates in period
      const tasksWithDueDatesQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId),
        where('dueDate', '>=', startTimestamp),
        where('dueDate', '<=', endTimestamp)
      );
      
      const tasksWithDueDatesSnap = await getDocs(tasksWithDueDatesQuery);
      const tasksWithDueDates = tasksWithDueDatesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeamTask));
      
      // Calculate on-time completion metrics
      let onTimeCount = 0;
      let lateCount = 0;
      let totalWithDueDate = tasksWithDueDates.length;
      
      tasksWithDueDates.forEach(task => {
        if (task.status === 'done' && task.completedDate && task.dueDate) {
          const completedDate = task.completedDate.toDate();
          const dueDate = task.dueDate.toDate();
          
          if (completedDate <= dueDate) {
            onTimeCount++;
          } else {
            lateCount++;
          }
        } else if (task.status !== 'done' && task.dueDate) {
          // Check if task is already late (due date in past)
          const now = new Date();
          const dueDate = task.dueDate.toDate();
          
          if (now > dueDate) {
            lateCount++;
          }
        }
      });
      
      // Calculate team velocity
      const velocityWeeks: Record<string, { completed: number, points: number }> = {};
      
      // Get all completed tasks in period
      const completedTasksQuery = query(
        collection(db, 'teamTasks'),
        where('teamId', '==', teamId),
        where('status', '==', 'done'),
        where('completedDate', '>=', startTimestamp),
        where('completedDate', '<=', endTimestamp)
      );
      
      const completedTasksSnap = await getDocs(completedTasksQuery);
      const completedTasks = completedTasksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeamTask));
      
      completedTasks.forEach(task => {
        if (task.completedDate) {
          const completedDate = task.completedDate.toDate();
          
          // Get week start (Sunday)
          const weekStart = new Date(completedDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!velocityWeeks[weekKey]) {
            velocityWeeks[weekKey] = { completed: 0, points: 0 };
          }
          
          velocityWeeks[weekKey].completed++;
          
          // If we track story points in metadata
          const storyPoints = task.metadata?.storyPoints || 1;
          velocityWeeks[weekKey].points += storyPoints;
        }
      });
      
      // Convert to array and calculate averages
      const velocityData = Object.values(velocityWeeks);
      
      const averageTasksPerWeek = velocityData.length > 0 ? 
        Math.round(velocityData.reduce((acc, week) => acc + week.completed, 0) / velocityData.length) : 0;
      
      const averagePointsPerWeek = velocityData.length > 0 ? 
        Math.round(velocityData.reduce((acc, week) => acc + week.points, 0) / velocityData.length) : 0;
      
      return {
        timeRange: {
          start: startTimestamp.toDate(),
          end: endTimestamp.toDate()
        },
        deadlines: {
          total: totalWithDueDate,
          onTime: onTimeCount,
          late: lateCount,
          onTimePercentage: totalWithDueDate > 0 ? 
            Math.round((onTimeCount / totalWithDueDate) * 100) : 0
        },
        velocity: {
          averageTasksPerWeek,
          averagePointsPerWeek,
          weeklyData: Object.entries(velocityWeeks).map(([week, data]) => ({
            week,
            tasks: data.completed,
            points: data.points
          })).sort((a, b) => a.week.localeCompare(b.week))
        }
      };
    } catch (error) {
      console.error('Error getting team performance metrics:', error);
      return {
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        deadlines: {
          total: 0,
          onTime: 0,
          late: 0,
          onTimePercentage: 0
        },
        velocity: {
          averageTasksPerWeek: 0,
          averagePointsPerWeek: 0,
          weeklyData: []
        }
      };
    }
  }
  
  /**
   * Convert various date formats to Firestore Timestamp
   */
  private toTimestamp(date: Date | Timestamp | string): Timestamp {
    if (date instanceof Timestamp) {
      return date;
    }
    
    if (date instanceof Date) {
      return Timestamp.fromDate(date);
    }
    
    return Timestamp.fromDate(new Date(date));
  }
}

// Create singleton instance
const teamAnalyticsService = new TeamAnalyticsService();

/**
 * API endpoint for team analytics
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
    
    // Check if user has permission to view analytics
    const canViewAnalytics = await permissionService.hasPermission(
      userId,
      teamId,
      'viewAnalytics'
    );
    
    if (!canViewAnalytics) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different analytics types
    const analyticsType = req.query.type as string || 'activity';
    
    switch (analyticsType) {
      case 'activity':
        return handleActivityAnalytics(req, res, teamId);
        
      case 'resources':
        return handleResourceAnalytics(req, res, teamId);
        
      case 'performance':
        return handlePerformanceAnalytics(req, res, teamId);
        
      default:
        return res.status(400).json({ error: 'Invalid analytics type' });
    }
  } catch (error) {
    console.error('Error in team analytics API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle activity analytics request
 */
async function handleActivityAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    
    const activitySummary = await teamAnalyticsService.getTeamActivitySummary(
      teamId,
      startDate,
      endDate
    );
    
    return res.status(200).json({ analytics: activitySummary });
  } catch (error) {
    console.error('Error getting activity analytics:', error);
    return res.status(500).json({ error: 'Failed to get activity analytics' });
  }
}

/**
 * Handle resource analytics request
 */
async function handleResourceAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const resourceUtilization = await teamAnalyticsService.getResourceUtilization(
      teamId
    );
    
    return res.status(200).json({ analytics: resourceUtilization });
  } catch (error) {
    console.error('Error getting resource analytics:', error);
    return res.status(500).json({ error: 'Failed to get resource analytics' });
  }
}

/**
 * Handle performance analytics request
 */
async function handlePerformanceAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    
    const performanceMetrics = await teamAnalyticsService.getTeamPerformanceMetrics(
      teamId,
      startDate,
      endDate
    );
    
    return res.status(200).json({ analytics: performanceMetrics });
  } catch (error) {
    console.error('Error getting performance analytics:', error);
    return res.status(500).json({ error: 'Failed to get performance analytics' });
  }
}