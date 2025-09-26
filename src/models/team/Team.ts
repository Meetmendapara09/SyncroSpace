import { Timestamp } from 'firebase/firestore';

/**
 * Team Model
 * Represents a team in the SyncroSpace platform
 */
export interface Team {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  createdAt: Timestamp;
  createdBy: string; // User ID of creator
  updatedAt: Timestamp;
  isPrivate: boolean; // Whether the team is discoverable
  organizationId: string; // ID of parent organization
  settings: TeamSettings;
  metadata?: Record<string, any>; // Additional customizable fields
}

/**
 * Team Settings
 * Configurable team preferences
 */
export interface TeamSettings {
  allowMemberInvites: boolean; // Can members invite others
  approvalRequired: boolean; // Require admin approval for join requests
  defaultRoleId: string; // Default role assigned to new members
  calendarSettings: {
    defaultVisibility: 'private' | 'members' | 'organization' | 'public';
    allowExternalCalendarSync: boolean;
  };
  communicationSettings: {
    allowExternalMessages: boolean;
    defaultChannelId?: string;
    notificationDefaults: TeamNotificationSettings;
  };
  fileSettings: {
    storageQuota: number; // in bytes
    allowedFileTypes: string[];
    maximumFileSize: number; // in bytes
  };
  resourceSettings: {
    trackResourceUsage: boolean;
    resourceCategories: string[]; // IDs of enabled resource categories
  };
}

/**
 * Team Notification Settings
 * Default notification preferences for team events
 */
export interface TeamNotificationSettings {
  announcements: boolean;
  events: boolean;
  fileChanges: boolean;
  taskAssignments: boolean;
  taskUpdates: boolean;
  goalUpdates: boolean;
  resourceAllocation: boolean;
  membershipChanges: boolean;
}

/**
 * Team Creation Input
 * Required data to create a new team
 */
export interface TeamCreateInput {
  name: string;
  description: string;
  avatarUrl?: string;
  isPrivate: boolean;
  organizationId: string;
  settings?: Partial<TeamSettings>;
}

/**
 * Team Update Input
 * Data that can be updated for an existing team
 */
export interface TeamUpdateInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  isPrivate?: boolean;
  settings?: Partial<TeamSettings>;
  metadata?: Record<string, any>;
}