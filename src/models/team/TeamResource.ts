import { Timestamp } from 'firebase/firestore';

/**
 * Team Resource
 * Represents a resource that can be allocated to team members
 */
export interface TeamResource {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  categoryId: string;
  capacity: number;
  unit: string; // e.g., "hours", "licenses", "seats", etc.
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Resource Category
 * Grouping for similar resources
 */
export interface ResourceCategory {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  color: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Resource Allocation
 * Records assignment of resources to users, projects, or tasks
 */
export interface ResourceAllocation {
  id: string;
  resourceId: string;
  teamId: string;
  allocatedBy: string; // User ID
  allocatedTo: {
    type: 'user' | 'project' | 'task';
    id: string;
  };
  amount: number;
  startTime: Timestamp;
  endTime?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  notes?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
}

/**
 * Resource Usage
 * Tracks actual usage of allocated resources
 */
export interface ResourceUsage {
  id: string;
  allocationId: string;
  resourceId: string;
  teamId: string;
  userId: string;
  amount: number;
  timestamp: Timestamp;
  notes?: string;
}

/**
 * Create Resource Input
 * Required data to create a new team resource
 */
export interface CreateResourceInput {
  name: string;
  description?: string;
  categoryId: string;
  capacity: number;
  unit: string;
  metadata?: Record<string, any>;
}

/**
 * Create Resource Category Input
 * Required data to create a new resource category
 */
export interface CreateResourceCategoryInput {
  name: string;
  description?: string;
  color: string;
}

/**
 * Create Resource Allocation Input
 * Required data to allocate resources
 */
export interface CreateResourceAllocationInput {
  resourceId: string;
  allocatedTo: {
    type: 'user' | 'project' | 'task';
    id: string;
  };
  amount: number;
  startTime: Date;
  endTime?: Date;
  notes?: string;
}

/**
 * Create Resource Usage Input
 * Required data to record resource usage
 */
export interface CreateResourceUsageInput {
  allocationId: string;
  resourceId: string;
  amount: number;
  notes?: string;
}