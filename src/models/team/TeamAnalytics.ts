import { Timestamp } from 'firebase/firestore';

/**
 * Team Analytics
 * Analytics data for team activity
 */
export interface TeamAnalytics {
  id: string;
  teamId: string;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  generatedAt: Timestamp;
  
  // Activity metrics
  activityMetrics: {
    activeMembers: number;
    messageCount: number;
    fileUploads: number;
    meetingHours: number;
    taskCreated: number;
    taskCompleted: number;
    averageTaskCompletionTime: number; // in hours
    resourceUtilization: number; // percentage
    mostActiveChannels: {
      channelId: string;
      channelName: string;
      activityCount: number;
    }[];
    mostActiveMembers: {
      userId: string;
      userName: string;
      activityCount: number;
    }[];
  };
  
  // Communication metrics
  communicationMetrics: {
    messagesByDay: Record<string, number>; // format: 'YYYY-MM-DD'
    messagesByHour: number[]; // 24 entries, one for each hour
    announcementCount: number;
    announcementReadRate: number; // percentage
    averageResponseTime: number; // in minutes
    threadParticipationRate: number; // percentage
  };
  
  // Collaboration metrics
  collaborationMetrics: {
    crossTeamCollaboration: number; // interactions with other teams
    fileCollaborationCount: number;
    documentEditSessions: number;
    averageCollaboratorsPerDocument: number;
    sharedResourceCount: number;
  };
  
  // Task metrics
  taskMetrics: {
    tasksByStatus: Record<string, number>;
    tasksByPriority: Record<string, number>;
    overdueTasks: number;
    taskCompletionRate: number; // percentage
    averageTaskDuration: number; // in hours
    tasksByAssignee: Record<string, number>; // userId: count
  };
  
  // Goal metrics
  goalMetrics: {
    activeGoals: number;
    completedGoals: number;
    goalProgressAverage: number; // percentage
    goalsByStatus: Record<string, number>;
    keyResultAttainment: number; // percentage
  };
  
  // Resource metrics
  resourceMetrics: {
    resourceUtilizationByType: Record<string, number>; // percentage
    resourceAllocationRate: number; // percentage
    overallocatedResources: number;
    resourceRequestsFulfilled: number;
    resourceEfficiency: number; // percentage
  };
  
  // Custom metrics
  customMetrics?: Record<string, any>;
}

/**
 * Member Activity
 * Detailed activity record for individual team members
 */
export interface MemberActivity {
  id: string;
  teamId: string;
  userId: string;
  date: Timestamp;
  
  // Activity counts
  activityCounts: {
    messagesCreated: number;
    messagesRead: number;
    filesUploaded: number;
    filesDownloaded: number;
    filesViewed: number;
    tasksCreated: number;
    tasksCompleted: number;
    taskComments: number;
    meetingMinutes: number;
    meetingsAttended: number;
    goalUpdates: number;
    resourceAllocations: number;
  };
  
  // Active hours (0-23, GMT)
  activeHours: boolean[];
  
  // Collaborations with other members
  collaborations: {
    userId: string;
    interactionCount: number;
  }[];
  
  // Most used features
  featureUsage: {
    feature: string;
    count: number;
  }[];
}

/**
 * Analytics Query Input
 * Parameters to query team analytics
 */
export interface AnalyticsQueryInput {
  startDate: Date;
  endDate: Date;
  metrics?: string[]; // Specific metrics to include
  groupBy?: 'day' | 'week' | 'month';
  filters?: {
    members?: string[]; // Filter by specific members
    channels?: string[]; // Filter by specific channels
    categories?: string[]; // Filter by specific categories
  };
}