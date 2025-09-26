import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../services/auth/PermissionService';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  startAfter,
  doc,
  getDoc,
  documentId
} from 'firebase/firestore';
import { db } from '../../../../../services/firebase/firebaseConfig';

/**
 * API endpoint for specific team analytics metrics
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
    
    // Get team ID and metric type from URL
    const teamId = req.query.teamId as string;
    const metricType = req.query.metricType as string;
    
    if (!teamId || !metricType) {
      return res.status(400).json({ error: 'Team ID and metric type are required' });
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
    
    // Parse query parameters
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
    
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : 
      new Date();
    
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    
    // Handle specific metric types
    switch (metricType) {
      case 'task-distribution':
        return handleTaskDistribution(req, res, teamId, startTimestamp, endTimestamp);
        
      case 'member-contribution':
        return handleMemberContribution(req, res, teamId, startTimestamp, endTimestamp);
        
      case 'goal-progression':
        return handleGoalProgression(req, res, teamId, startTimestamp, endTimestamp);
        
      case 'time-spent':
        return handleTimeSpent(req, res, teamId, startTimestamp, endTimestamp);
        
      case 'activity-heatmap':
        return handleActivityHeatmap(req, res, teamId, startTimestamp, endTimestamp);
        
      default:
        return res.status(400).json({ error: 'Invalid metric type' });
    }
  } catch (error) {
    console.error('Error in team analytics metrics API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle task distribution analytics
 */
async function handleTaskDistribution(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  startTimestamp: Timestamp,
  endTimestamp: Timestamp
) {
  try {
    // Get tasks in time period
    const tasksQuery = query(
      collection(db, 'teamTasks'),
      where('teamId', '==', teamId),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );
    
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group by status
    const byStatus: Record<string, number> = {};
    
    // Group by priority
    const byPriority: Record<string, number> = {};
    
    // Group by tag (if tasks have tags)
    const byTag: Record<string, number> = {};
    
    // Group by assignee
    const byAssignee: Record<string, number> = {};
    
    tasks.forEach((task: any) => {
      // Process status
      const status = task.status || 'todo';
      byStatus[status] = (byStatus[status] || 0) + 1;
      
      // Process priority
      const priority = task.priority || 'medium';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
      
      // Process tags
      if (Array.isArray(task.tags)) {
        task.tags.forEach((tag: string) => {
          byTag[tag] = (byTag[tag] || 0) + 1;
        });
      }
      
      // Process assignee
      if (task.assignedTo) {
        byAssignee[task.assignedTo] = (byAssignee[task.assignedTo] || 0) + 1;
      }
    });
    
    return res.status(200).json({
      timeRange: {
        start: startTimestamp.toDate(),
        end: endTimestamp.toDate()
      },
      totalTasks: tasks.length,
      distribution: {
        byStatus,
        byPriority,
        byTag,
        byAssignee
      }
    });
  } catch (error) {
    console.error('Error getting task distribution:', error);
    return res.status(500).json({ error: 'Failed to get task distribution' });
  }
}

/**
 * Handle member contribution analytics
 */
async function handleMemberContribution(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  startTimestamp: Timestamp,
  endTimestamp: Timestamp
) {
  try {
    // Get team members
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const teamData = teamSnap.data();
    const memberIds = teamData.members || [];
    
    // Get user details for each member
    const members: Record<string, {
      userId: string;
      displayName?: string;
      tasks: {
        created: number;
        completed: number;
        inProgress: number;
      };
      comments: number;
      goals: {
        created: number;
        keyResultsCreated: number;
      };
      totalContributions: number;
    }> = {};
    
    // Initialize member objects
    for (const memberId of memberIds) {
      const userRef = doc(db, 'users', memberId);
      const userSnap = await getDoc(userRef);
      
      members[memberId] = {
        userId: memberId,
        displayName: userSnap.exists() ? userSnap.data().displayName : undefined,
        tasks: {
          created: 0,
          completed: 0,
          inProgress: 0
        },
        comments: 0,
        goals: {
          created: 0,
          keyResultsCreated: 0
        },
        totalContributions: 0
      };
    }
    
    // Get tasks created by members
    const tasksCreatedQuery = query(
      collection(db, 'teamTasks'),
      where('teamId', '==', teamId),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );
    
    const tasksCreatedSnap = await getDocs(tasksCreatedQuery);
    
    tasksCreatedSnap.forEach(doc => {
      const task = doc.data();
      if (task.createdBy && members[task.createdBy]) {
        members[task.createdBy].tasks.created += 1;
        members[task.createdBy].totalContributions += 1;
      }
    });
    
    // Get tasks completed by members
    const tasksCompletedQuery = query(
      collection(db, 'teamTasks'),
      where('teamId', '==', teamId),
      where('status', '==', 'done'),
      where('completedDate', '>=', startTimestamp),
      where('completedDate', '<=', endTimestamp)
    );
    
    const tasksCompletedSnap = await getDocs(tasksCompletedQuery);
    
    tasksCompletedSnap.forEach(doc => {
      const task = doc.data();
      if (task.lastUpdatedBy && members[task.lastUpdatedBy]) {
        members[task.lastUpdatedBy].tasks.completed += 1;
        members[task.lastUpdatedBy].totalContributions += 1;
      }
    });
    
    // Get tasks in progress
    const tasksInProgressQuery = query(
      collection(db, 'teamTasks'),
      where('teamId', '==', teamId),
      where('status', '==', 'in_progress')
    );
    
    const tasksInProgressSnap = await getDocs(tasksInProgressQuery);
    
    tasksInProgressSnap.forEach(doc => {
      const task = doc.data();
      if (task.assignedTo && members[task.assignedTo]) {
        members[task.assignedTo].tasks.inProgress += 1;
      }
    });
    
    // Get comments by members
    const commentsQuery = query(
      collection(db, 'taskComments'),
      where('teamId', '==', teamId),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );
    
    const commentsSnap = await getDocs(commentsQuery);
    
    commentsSnap.forEach(doc => {
      const comment = doc.data();
      if (comment.createdBy && members[comment.createdBy]) {
        members[comment.createdBy].comments += 1;
        members[comment.createdBy].totalContributions += 1;
      }
    });
    
    // Get goals created by members
    const goalsQuery = query(
      collection(db, 'teamGoals'),
      where('teamId', '==', teamId),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );
    
    const goalsSnap = await getDocs(goalsQuery);
    
    goalsSnap.forEach(doc => {
      const goal = doc.data();
      if (goal.createdBy && members[goal.createdBy]) {
        members[goal.createdBy].goals.created += 1;
        members[goal.createdBy].totalContributions += 1;
      }
      
      // Count key results created
      if (Array.isArray(goal.keyResults)) {
        goal.keyResults.forEach((kr: any) => {
          if (kr.createdBy && members[kr.createdBy]) {
            members[kr.createdBy].goals.keyResultsCreated += 1;
            members[kr.createdBy].totalContributions += 1;
          }
        });
      }
    });
    
    // Convert to array and sort by contribution
    const membersArray = Object.values(members);
    membersArray.sort((a, b) => b.totalContributions - a.totalContributions);
    
    return res.status(200).json({
      timeRange: {
        start: startTimestamp.toDate(),
        end: endTimestamp.toDate()
      },
      memberCount: membersArray.length,
      contributions: membersArray
    });
  } catch (error) {
    console.error('Error getting member contribution:', error);
    return res.status(500).json({ error: 'Failed to get member contribution' });
  }
}

/**
 * Handle goal progression analytics
 */
async function handleGoalProgression(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  startTimestamp: Timestamp,
  endTimestamp: Timestamp
) {
  try {
    // Get all goals
    const goalsQuery = query(
      collection(db, 'teamGoals'),
      where('teamId', '==', teamId)
    );
    
    const goalsSnap = await getDocs(goalsQuery);
    const goals = goalsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter to relevant goals (created or updated in period)
    const relevantGoals = goals.filter(goal => {
      const createdAt = (goal as any).createdAt ? (goal as any).createdAt.toDate() : null;
      const updatedAt = (goal as any).updatedAt ? (goal as any).updatedAt.toDate() : null;

      const startDate = startTimestamp.toDate();
      const endDate = endTimestamp.toDate();

      return (createdAt && createdAt >= startDate && createdAt <= endDate) ||
             (updatedAt && updatedAt >= startDate && updatedAt <= endDate);
    });
    
    // Calculate progression metrics
    const progressionData = relevantGoals.map((goal: any) => {
      // Calculate key result progress
      const keyResults = goal.keyResults || [];
      const totalKeyResults = keyResults.length;
      const completedKeyResults = keyResults.filter((kr: any) => kr.isCompleted).length;
      
      return {
        id: goal.id,
        title: goal.title,
        status: goal.status,
        progressPercentage: goal.progressPercentage || 0,
        createdAt: goal.createdAt ? goal.createdAt.toDate() : null,
        completedDate: goal.completedDate ? goal.completedDate.toDate() : null,
        keyResultsTotal: totalKeyResults,
        keyResultsCompleted: completedKeyResults,
        keyResultsCompletionRate: totalKeyResults > 0 ? 
          Math.round((completedKeyResults / totalKeyResults) * 100) : 0
      };
    });
    
    // Calculate completion rate over time (for goals with completion dates)
    const completedGoals = goals.filter((goal: any) => 
      goal.status === 'completed' && goal.completedDate
    );
    
    // Group by month
    const monthlyCompletion: Record<string, number> = {};
    
    completedGoals.forEach((goal: any) => {
      if (goal.completedDate) {
        const date = goal.completedDate.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        monthlyCompletion[monthKey] = (monthlyCompletion[monthKey] || 0) + 1;
      }
    });
    
    // Convert to array for chart display
    const completionTrend = Object.entries(monthlyCompletion)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    return res.status(200).json({
      timeRange: {
        start: startTimestamp.toDate(),
        end: endTimestamp.toDate()
      },
      totalGoals: goals.length,
      relevantGoals: relevantGoals.length,
      statusSummary: {
        planned: goals.filter((g: any) => g.status === 'planned').length,
        inProgress: goals.filter((g: any) => g.status === 'in_progress').length,
        completed: goals.filter((g: any) => g.status === 'completed').length
      },
      progression: {
        goals: progressionData,
        completionTrend
      }
    });
  } catch (error) {
    console.error('Error getting goal progression:', error);
    return res.status(500).json({ error: 'Failed to get goal progression' });
  }
}

/**
 * Handle time spent analytics
 */
async function handleTimeSpent(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  startTimestamp: Timestamp,
  endTimestamp: Timestamp
) {
  try {
    // Get time tracking entries if they exist
    // This is a placeholder - actual implementation would depend on how time tracking is stored
    const timeEntriesQuery = query(
      collection(db, 'timeEntries'),
      where('teamId', '==', teamId),
      where('startTime', '>=', startTimestamp),
      where('startTime', '<=', endTimestamp)
    );
    
    let timeEntries: any[] = [];
    try {
      const timeEntriesSnap = await getDocs(timeEntriesQuery);
      timeEntries = timeEntriesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.log('Time entries collection may not exist:', error);
      // Collection may not exist, continue with empty array
    }
    
    // If no time tracking is implemented, estimate time from task updates
    if (timeEntries.length === 0) {
      return res.status(200).json({
        timeRange: {
          start: startTimestamp.toDate(),
          end: endTimestamp.toDate()
        },
        message: 'Time tracking is not implemented for this team',
        estimatedData: {
          totalActiveDays: 0,
          averageTaskCompletionTime: 'Unknown',
          timeByMember: []
        }
      });
    }
    
    // Process time entries
    let totalTime = 0;
    let timeByMember: Record<string, number> = {};
    let timeByTask: Record<string, number> = {};
    let timeByProject: Record<string, number> = {};
    
    timeEntries.forEach(entry => {
      const duration = entry.duration || 0; // duration in minutes
      
      totalTime += duration;
      
      // Time by member
      if (entry.userId) {
        timeByMember[entry.userId] = (timeByMember[entry.userId] || 0) + duration;
      }
      
      // Time by task
      if (entry.taskId) {
        timeByTask[entry.taskId] = (timeByTask[entry.taskId] || 0) + duration;
      }
      
      // Time by project/category
      if (entry.category) {
        timeByProject[entry.category] = (timeByProject[entry.category] || 0) + duration;
      }
    });
    
    // Convert to arrays for easier consumption
    const timeByMemberArray = Object.entries(timeByMember).map(([userId, minutes]) => ({
      userId,
      hours: Math.round(minutes / 60 * 10) / 10, // Round to 1 decimal place
      percentage: Math.round((minutes / totalTime) * 100)
    }));
    
    const timeByTaskArray = Object.entries(timeByTask).map(([taskId, minutes]) => ({
      taskId,
      hours: Math.round(minutes / 60 * 10) / 10, // Round to 1 decimal place
      percentage: Math.round((minutes / totalTime) * 100)
    }));
    
    const timeByProjectArray = Object.entries(timeByProject).map(([category, minutes]) => ({
      category,
      hours: Math.round(minutes / 60 * 10) / 10, // Round to 1 decimal place
      percentage: Math.round((minutes / totalTime) * 100)
    }));
    
    return res.status(200).json({
      timeRange: {
        start: startTimestamp.toDate(),
        end: endTimestamp.toDate()
      },
      totalTime: {
        minutes: totalTime,
        hours: Math.round(totalTime / 60 * 10) / 10
      },
      distribution: {
        byMember: timeByMemberArray,
        byTask: timeByTaskArray,
        byProject: timeByProjectArray
      }
    });
  } catch (error) {
    console.error('Error getting time spent:', error);
    return res.status(500).json({ error: 'Failed to get time spent' });
  }
}

/**
 * Handle activity heatmap analytics
 */
async function handleActivityHeatmap(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  startTimestamp: Timestamp,
  endTimestamp: Timestamp
) {
  try {
    // Get all activities
    // For this heatmap we'll collect tasks created, tasks completed, comments added
    
    // Get tasks created
    const tasksCreatedQuery = query(
      collection(db, 'teamTasks'),
      where('teamId', '==', teamId),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );
    
    const tasksCreatedSnap = await getDocs(tasksCreatedQuery);
    const tasksCreated = tasksCreatedSnap.docs.map(doc => ({
      type: 'taskCreated',
      timestamp: doc.data().createdAt,
      data: {
        taskId: doc.id,
        title: doc.data().title
      }
    }));
    
    // Get tasks completed
    const tasksCompletedQuery = query(
      collection(db, 'teamTasks'),
      where('teamId', '==', teamId),
      where('status', '==', 'done'),
      where('completedDate', '>=', startTimestamp),
      where('completedDate', '<=', endTimestamp)
    );
    
    const tasksCompletedSnap = await getDocs(tasksCompletedQuery);
    const tasksCompleted = tasksCompletedSnap.docs.map(doc => ({
      type: 'taskCompleted',
      timestamp: doc.data().completedDate,
      data: {
        taskId: doc.id,
        title: doc.data().title
      }
    }));
    
    // Get comments added
    const commentsQuery = query(
      collection(db, 'taskComments'),
      where('teamId', '==', teamId),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );
    
    const commentsSnap = await getDocs(commentsQuery);
    const comments = commentsSnap.docs.map(doc => ({
      type: 'comment',
      timestamp: doc.data().createdAt,
      data: {
        commentId: doc.id,
        taskId: doc.data().taskId
      }
    }));
    
    // Combine all activities
    const allActivities = [
      ...tasksCreated,
      ...tasksCompleted,
      ...comments
    ];
    
    // Group by day for heatmap
    const activityByDay: Record<string, {
      date: string;
      count: number;
      breakdown: Record<string, number>;
    }> = {};
    
    allActivities.forEach(activity => {
      if (activity.timestamp) {
        const date = activity.timestamp.toDate();
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!activityByDay[dateKey]) {
          activityByDay[dateKey] = {
            date: dateKey,
            count: 0,
            breakdown: {}
          };
        }
        
        activityByDay[dateKey].count += 1;
        
        // Update breakdown by activity type
        const type = activity.type;
        activityByDay[dateKey].breakdown[type] = 
          (activityByDay[dateKey].breakdown[type] || 0) + 1;
      }
    });
    
    // Convert to array for heatmap
    const heatmapData = Object.values(activityByDay);
    
    // Sort by date
    heatmapData.sort((a, b) => a.date.localeCompare(b.date));
    
    // Group by hour of day for hourly activity pattern
    const activityByHour: number[] = Array(24).fill(0);
    
    allActivities.forEach(activity => {
      if (activity.timestamp) {
        const hour = activity.timestamp.toDate().getHours();
        activityByHour[hour] += 1;
      }
    });
    
    // Group by day of week
    const activityByDayOfWeek: number[] = Array(7).fill(0);
    
    allActivities.forEach(activity => {
      if (activity.timestamp) {
        const dayOfWeek = activity.timestamp.toDate().getDay(); // 0 = Sunday
        activityByDayOfWeek[dayOfWeek] += 1;
      }
    });
    
    return res.status(200).json({
      timeRange: {
        start: startTimestamp.toDate(),
        end: endTimestamp.toDate()
      },
      totalActivities: allActivities.length,
      heatmap: {
        daily: heatmapData,
        hourly: activityByHour,
        dayOfWeek: activityByDayOfWeek
      },
      activityTypes: {
        taskCreated: tasksCreated.length,
        taskCompleted: tasksCompleted.length,
        comment: comments.length
      }
    });
  } catch (error) {
    console.error('Error getting activity heatmap:', error);
    return res.status(500).json({ error: 'Failed to get activity heatmap' });
  }
}