import { Timestamp } from 'firebase/firestore';

/**
 * Team Onboarding
 * Process for onboarding new team members
 */
export interface TeamOnboarding {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  steps: OnboardingStep[];
  roleId?: string; // Role this onboarding applies to, null for all roles
  averageCompletionTime?: number; // in days
}

/**
 * Onboarding Step
 * Individual step in the onboarding process
 */
export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  type: 'task' | 'resource' | 'meeting' | 'form' | 'training' | 'verification';
  order: number;
  isRequired: boolean;
  estimatedDuration?: number; // in minutes
  assignedTo: 'new_member' | 'admin' | 'buddy' | 'team_lead';
  resourceUrl?: string;
  formFields?: {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'file';
    options?: string[]; // For select type
    isRequired: boolean;
  }[];
  verificationMethod?: 'self' | 'admin' | 'buddy' | 'automatic';
}

/**
 * Member Onboarding Progress
 * Tracks a member's progress through onboarding
 */
export interface MemberOnboardingProgress {
  id: string;
  userId: string;
  teamId: string;
  onboardingId: string;
  startDate: Timestamp;
  completedDate?: Timestamp;
  buddyId?: string; // User ID of onboarding buddy
  status: 'in_progress' | 'completed' | 'overdue';
  progress: number; // 0-100
  stepProgress: {
    stepId: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    verifiedBy?: string; // User ID who verified completion
    formResponses?: {
      fieldId: string;
      value: string;
    }[];
    notes?: string;
  }[];
  feedback?: {
    rating: number; // 1-5
    comments?: string;
    submittedAt: Timestamp;
  };
}

/**
 * Create Onboarding Input
 * Required data to create a new onboarding process
 */
export interface CreateOnboardingInput {
  name: string;
  description?: string;
  isActive?: boolean;
  steps: {
    title: string;
    description?: string;
    type: 'task' | 'resource' | 'meeting' | 'form' | 'training' | 'verification';
    order: number;
    isRequired: boolean;
    estimatedDuration?: number;
    assignedTo: 'new_member' | 'admin' | 'buddy' | 'team_lead';
    resourceUrl?: string;
    formFields?: {
      label: string;
      type: 'text' | 'textarea' | 'select' | 'checkbox' | 'file';
      options?: string[];
      isRequired: boolean;
    }[];
    verificationMethod?: 'self' | 'admin' | 'buddy' | 'automatic';
  }[];
  roleId?: string;
}

/**
 * Start Member Onboarding Input
 * Required data to start a member's onboarding
 */
export interface StartMemberOnboardingInput {
  userId: string;
  onboardingId: string;
  buddyId?: string;
}