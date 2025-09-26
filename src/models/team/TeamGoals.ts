import { Timestamp } from 'firebase/firestore';

/**
 * Team Goal
 * Goal or objective for the team
 */
export interface TeamGoal {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startDate: Timestamp;
  targetDate: Timestamp;
  completedDate?: Timestamp;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress: number; // 0-100
  priority: 'low' | 'medium' | 'high';
  category?: string;
  owners: string[]; // User IDs responsible for the goal
  watchers?: string[]; // User IDs following the goal
  parentGoalId?: string; // For hierarchical goals
  visibility: 'team' | 'organization' | 'public';
  keyResults: KeyResult[];
  milestones?: Milestone[];
  tags?: string[];
  attachments?: {
    id: string;
    name: string;
    url: string;
    mimeType?: string;
  }[];
  metadata?: Record<string, any>;
}

/**
 * Key Result
 * Measurable outcome for a goal (OKR style)
 */
export interface KeyResult {
  id: string;
  title: string;
  description?: string;
  type: 'numeric' | 'percentage' | 'currency' | 'boolean' | 'custom';
  startValue: number;
  targetValue: number;
  currentValue: number;
  format?: string; // e.g., "$#,###" or "%"
  owners?: string[]; // User IDs
  updatedAt: Timestamp;
  updatedBy: string; // User ID
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
  history: {
    value: number;
    timestamp: Timestamp;
    updatedBy: string;
    note?: string;
  }[];
}

/**
 * Milestone
 * Key checkpoint in the progress toward a goal
 */
export interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: Timestamp;
  completedDate?: Timestamp;
  status: 'not_started' | 'in_progress' | 'completed';
  owners?: string[]; // User IDs
}

/**
 * Goal Category
 * Categorization for goals
 */
export interface GoalCategory {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  color: string;
  createdAt: Timestamp;
  createdBy: string; // User ID
}

/**
 * Create Goal Input
 * Required data to create a new team goal
 */
export interface CreateGoalInput {
  title: string;
  description?: string;
  startDate: Date;
  targetDate: Date;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  owners: string[];
  watchers?: string[];
  parentGoalId?: string;
  visibility?: 'team' | 'organization' | 'public';
  keyResults: {
    title: string;
    description?: string;
    type: 'numeric' | 'percentage' | 'currency' | 'boolean' | 'custom';
    startValue: number;
    targetValue: number;
    currentValue?: number;
    format?: string;
    owners?: string[];
  }[];
  milestones?: {
    title: string;
    description?: string;
    dueDate: Date;
    owners?: string[];
  }[];
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Create Goal Category Input
 * Required data to create a new goal category
 */
export interface CreateGoalCategoryInput {
  name: string;
  description?: string;
  color: string;
}