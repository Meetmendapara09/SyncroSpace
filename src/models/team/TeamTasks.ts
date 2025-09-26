import { Timestamp } from 'firebase/firestore';

/**
 * Team Task
 * Task within team task management
 */
export interface TeamTask {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  boardId?: string; // For kanban organization
  status: string; // Custom status like "To Do", "In Progress", etc.
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string; // User ID
  assignees: string[]; // User IDs
  tags?: string[];
  watchers?: string[]; // User IDs
  parentTaskId?: string; // For subtasks
  progress: number; // 0-100
  estimatedEffort?: number; // Hours or points
  actualEffort?: number; // Hours or points
  startDate?: Timestamp;
  endDate?: Timestamp;
  attachments?: {
    id: string;
    name: string;
    url: string;
    mimeType?: string;
  }[];
  comments?: TaskComment[];
  checklists?: TaskChecklist[];
  recurring?: TaskRecurrence;
  dependencies?: {
    dependsOn: string[]; // Task IDs
    blockedBy: string[]; // Task IDs
  };
  metadata?: Record<string, any>;
}

/**
 * Task Comment
 * Comment on a task
 */
export interface TaskComment {
  id: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  attachments?: {
    id: string;
    name: string;
    url: string;
    mimeType?: string;
  }[];
}

/**
 * Task Checklist
 * Checklist within a task
 */
export interface TaskChecklist {
  id: string;
  title: string;
  items: {
    id: string;
    content: string;
    isCompleted: boolean;
    completedAt?: Timestamp;
    completedBy?: string;
  }[];
}

/**
 * Task Board
 * Kanban or other organizational structure for tasks
 */
export interface TaskBoard {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  columns: {
    id: string;
    name: string;
    color?: string;
    order: number;
    taskLimit?: number; // For WIP limits
  }[];
  isArchived: boolean;
  permissions?: {
    userId: string;
    accessLevel: 'view' | 'edit' | 'manage';
  }[];
}

/**
 * Task Recurrence
 * Pattern for recurring tasks
 */
export interface TaskRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number; // For monthly recurrence
  monthOfYear?: number; // For yearly recurrence
  endsOnDate?: Timestamp;
  endsAfterOccurrences?: number;
}

/**
 * Create Task Input
 * Required data to create a new task
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
  boardId?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignees?: string[];
  tags?: string[];
  watchers?: string[];
  parentTaskId?: string;
  progress?: number;
  estimatedEffort?: number;
  startDate?: Date;
  endDate?: Date;
  attachments?: {
    name: string;
    url: string;
    mimeType?: string;
  }[];
  checklists?: {
    title: string;
    items: {
      content: string;
      isCompleted?: boolean;
    }[];
  }[];
  recurring?: Omit<TaskRecurrence, 'endsOnDate'> & {
    endsOnDate?: Date;
  };
  dependencies?: {
    dependsOn?: string[];
    blockedBy?: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Create Task Board Input
 * Required data to create a new task board
 */
export interface CreateTaskBoardInput {
  name: string;
  description?: string;
  columns: {
    name: string;
    color?: string;
    order: number;
    taskLimit?: number;
  }[];
}