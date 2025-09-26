/**
 * Team-related type definitions
 */

export interface TeamPermissions {
  // Team management
  viewTeam: boolean;
  editTeam: boolean;
  manageMembers: boolean;
  manageRoles: boolean;
  manageTeamMembers: boolean;
  manageTeamRoles: boolean;

  // Task management
  viewTasks: boolean;
  createTasks: boolean;
  updateTasks: boolean;
  deleteTasks: boolean;
  manageTasks: boolean;
  editAllTasks: boolean;

  // Goal management
  viewGoals: boolean;
  createGoals: boolean;
  updateGoals: boolean;
  deleteGoals: boolean;

  // Onboarding
  viewOnboarding: boolean;
  manageOnboarding: boolean;

  // Resources
  viewResources: boolean;
  manageResources: boolean;
  allocateResources: boolean;
  editResources: boolean;

  // Files
  viewFiles: boolean;
  uploadFiles: boolean;
  manageFiles: boolean;
  editFiles: boolean;
  deleteFiles: boolean;

  // Calendar
  viewCalendar: boolean;
  manageCalendar: boolean;
  createEvents: boolean;
  editAllEvents: boolean;

  // Channels
  manageChannels: boolean;

  // Analytics
  viewAnalytics: boolean;

  // Settings
  manageSettings: boolean;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  roleId: string;
  joinedAt: any;
  status: 'active' | 'inactive' | 'pending';
  invitedBy?: string;
}

export interface TeamRole {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  isAdmin: boolean;
  permissions: TeamPermissions;
  createdAt: any;
  updatedAt: any;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  settings: any;
  createdAt: any;
  updatedAt: any;
  memberCount: number;
}