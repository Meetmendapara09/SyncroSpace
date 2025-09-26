import { Timestamp } from 'firebase/firestore';

/**
 * Team File
 * File in the team's document repository
 */
export interface TeamFile {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  folderId?: string; // Parent folder, null for root
  mimeType: string;
  size: number; // in bytes
  createdBy: string; // User ID
  createdAt: Timestamp;
  modifiedBy: string; // User ID
  modifiedAt: Timestamp;
  storageUrl: string;
  thumbnailUrl?: string;
  isShared: boolean;
  shareSettings?: FileShareSettings;
  permissions?: FilePermission[];
  tags?: string[];
  favoriteByUsers?: string[]; // User IDs
  version: number;
  previousVersions?: FileVersion[];
  metadata?: Record<string, any>;
  status: 'processing' | 'available' | 'error';
}

/**
 * Team Folder
 * Folder in the team's document repository
 */
export interface TeamFolder {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  parentId?: string; // Parent folder, null for root
  createdBy: string; // User ID
  createdAt: Timestamp;
  modifiedBy: string; // User ID
  modifiedAt: Timestamp;
  isShared: boolean;
  shareSettings?: FileShareSettings;
  permissions?: FilePermission[];
  tags?: string[];
  favoriteByUsers?: string[]; // User IDs
  color?: string;
  metadata?: Record<string, any>;
}

/**
 * File Share Settings
 * Settings for shared files or folders
 */
export interface FileShareSettings {
  type: 'public' | 'organization' | 'team' | 'specific_users';
  accessLevel: 'view' | 'comment' | 'edit';
  password?: string; // For password-protected shares
  expirationDate?: Timestamp;
  allowDownload: boolean;
  userIds?: string[]; // For specific_users type
  roleIds?: string[]; // For specific roles within team
  shareLink?: string;
  shareId: string; // Unique ID for this share
  createdAt: Timestamp;
  createdBy: string; // User ID
}

/**
 * File Permission
 * Individual permission for a file or folder
 */
export interface FilePermission {
  id: string;
  targetType: 'user' | 'role';
  targetId: string; // User ID or Role ID
  accessLevel: 'view' | 'comment' | 'edit' | 'manage';
  createdAt: Timestamp;
  createdBy: string; // User ID
}

/**
 * File Version
 * Previous version of a file
 */
export interface FileVersion {
  version: number;
  storageUrl: string;
  size: number;
  modifiedBy: string;
  modifiedAt: Timestamp;
  comment?: string;
}

/**
 * File Comment
 * Comment on a file
 */
export interface FileComment {
  id: string;
  fileId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  parentCommentId?: string; // For threaded comments
  position?: {
    page?: number;
    x: number;
    y: number;
  }; // For positional comments
}

/**
 * Create File Input
 * Required data to create a new file
 */
export interface CreateFileInput {
  name: string;
  description?: string;
  folderId?: string;
  mimeType: string;
  size: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Create Folder Input
 * Required data to create a new folder
 */
export interface CreateFolderInput {
  name: string;
  description?: string;
  parentId?: string;
  tags?: string[];
  color?: string;
  metadata?: Record<string, any>;
}