import { Timestamp } from 'firebase/firestore';

/**
 * Team Role
 * Defines permission levels within a team
 */
export interface TeamRole {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDefault: boolean; // Whether this is the default role for new members
  isAdmin: boolean; // Has full administrative privileges
  permissions: TeamPermissions;
}

/**
 * Team Permissions
 * Granular permissions for team roles
 */
export interface TeamPermissions {
  // Team Management
  manageTeamSettings: boolean;
  manageTeamMembers: boolean;
  manageTeamRoles: boolean;
  
  // Resources
  viewResources: boolean;
  editResources: boolean;
  allocateResources: boolean;
  
  // Communication
  manageChannels: boolean;
  postAnnouncements: boolean;
  manageExternalAccess: boolean;
  
  // Calendar
  viewCalendar: boolean;
  createEvents: boolean;
  editAllEvents: boolean; // Can edit events created by others
  
  // Files
  viewFiles: boolean;
  uploadFiles: boolean;
  editFiles: boolean;
  deleteFiles: boolean;
  
  // Tasks
  viewTasks: boolean;
  createTasks: boolean;
  assignTasks: boolean;
  editAllTasks: boolean;
  
  // Goals
  viewGoals: boolean;
  createGoals: boolean;
  editGoals: boolean;
  
  // Analytics
  viewAnalytics: boolean;
  exportAnalytics: boolean;
}

/**
 * Team Membership
 * Represents a user's membership in a team
 */
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  displayName: string; // May differ from user's global display name
  avatarUrl?: string;
  joinedAt: Timestamp;
  roleId: string; // References TeamRole
  status: 'active' | 'inactive' | 'invited' | 'pending_approval';
  invitedBy?: string; // User ID who sent the invitation
  lastActive?: Timestamp;
  notificationSettings: MemberNotificationSettings;
  metadata?: Record<string, any>;
}

/**
 * Member Notification Settings
 * Individual notification preferences for a team member
 */
export interface MemberNotificationSettings {
  announcements: boolean;
  events: boolean;
  fileChanges: boolean;
  taskAssignments: boolean;
  taskUpdates: boolean;
  goalUpdates: boolean;
  resourceAllocation: boolean;
  membershipChanges: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/**
 * Default Team Roles
 * Pre-defined roles that can be used when creating a new team
 */
export const DEFAULT_TEAM_ROLES: Omit<TeamRole, 'id' | 'teamId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Team Admin',
    description: 'Full administrative access to all team features',
    isDefault: false,
    isAdmin: true,
    permissions: {
      manageTeamSettings: true,
      manageTeamMembers: true,
      manageTeamRoles: true,
      viewResources: true,
      editResources: true,
      allocateResources: true,
      manageChannels: true,
      postAnnouncements: true,
      manageExternalAccess: true,
      viewCalendar: true,
      createEvents: true,
      editAllEvents: true,
      viewFiles: true,
      uploadFiles: true,
      editFiles: true,
      deleteFiles: true,
      viewTasks: true,
      createTasks: true,
      assignTasks: true,
      editAllTasks: true,
      viewGoals: true,
      createGoals: true,
      editGoals: true,
      viewAnalytics: true,
      exportAnalytics: true,
    }
  },
  {
    name: 'Member',
    description: 'Regular team member with standard permissions',
    isDefault: true,
    isAdmin: false,
    permissions: {
      manageTeamSettings: false,
      manageTeamMembers: false,
      manageTeamRoles: false,
      viewResources: true,
      editResources: false,
      allocateResources: false,
      manageChannels: false,
      postAnnouncements: false,
      manageExternalAccess: false,
      viewCalendar: true,
      createEvents: true,
      editAllEvents: false,
      viewFiles: true,
      uploadFiles: true,
      editFiles: true,
      deleteFiles: false,
      viewTasks: true,
      createTasks: true,
      assignTasks: false,
      editAllTasks: false,
      viewGoals: true,
      createGoals: false,
      editGoals: false,
      viewAnalytics: true,
      exportAnalytics: false,
    }
  },
  {
    name: 'Guest',
    description: 'Limited access to team resources',
    isDefault: false,
    isAdmin: false,
    permissions: {
      manageTeamSettings: false,
      manageTeamMembers: false,
      manageTeamRoles: false,
      viewResources: true,
      editResources: false,
      allocateResources: false,
      manageChannels: false,
      postAnnouncements: false,
      manageExternalAccess: false,
      viewCalendar: true,
      createEvents: false,
      editAllEvents: false,
      viewFiles: true,
      uploadFiles: false,
      editFiles: false,
      deleteFiles: false,
      viewTasks: true,
      createTasks: false,
      assignTasks: false,
      editAllTasks: false,
      viewGoals: true,
      createGoals: false,
      editGoals: false,
      viewAnalytics: false,
      exportAnalytics: false,
    }
  }
];

/**
 * Create Role Input
 * Required data to create a new team role
 */
export interface CreateRoleInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  permissions: Partial<TeamPermissions>;
}

/**
 * Add Member Input
 * Required data to add a new team member
 */
export interface AddMemberInput {
  userId: string;
  roleId: string;
  displayName?: string;
  metadata?: Record<string, any>;
}