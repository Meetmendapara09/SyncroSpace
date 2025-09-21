import { Timestamp } from 'firebase/firestore';

export type TaskStatus = 'todo' | 'in-progress' | 'on-hold' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TimeEntry {
  startTime: Timestamp;
  endTime?: Timestamp;
  duration: number; // duration in seconds
  description?: string;
}

export interface EnhancedTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0-100
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags: string[];
  timeTracking?: {
    totalTime: number; // in seconds
    timeEntries: TimeEntry[];
    activeTimer?: {
      startTime: Timestamp;
      description?: string;
    };
  };
  isMilestone?: boolean;
}