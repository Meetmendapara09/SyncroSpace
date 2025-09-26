import { Timestamp } from 'firebase/firestore';

/**
 * Team Channel
 * Communication channel for team members
 */
export interface TeamChannel {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  type: 'text' | 'announcement' | 'file-sharing';
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPrivate: boolean;
  members?: string[]; // User IDs for private channels
  pinnedMessages?: string[]; // Message IDs
  metadata?: Record<string, any>;
}

/**
 * Team Message
 * Message in a team channel
 */
export interface TeamMessage {
  id: string;
  channelId: string;
  teamId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'markdown' | 'file' | 'system';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  editedAt?: Timestamp;
  attachments?: MessageAttachment[];
  mentions?: {
    userIds: string[];
    channelIds: string[];
    teamIds: string[];
  };
  reactions?: MessageReaction[];
  isAnnouncement: boolean;
  isPinned: boolean;
  parentMessageId?: string; // For threaded replies
  metadata?: Record<string, any>;
}

/**
 * Message Attachment
 * File or link attached to a message
 */
export interface MessageAttachment {
  id: string;
  type: 'file' | 'image' | 'video' | 'audio' | 'link';
  url: string;
  name: string;
  size?: number; // in bytes
  mimeType?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Message Reaction
 * Emoji reaction to a message
 */
export interface MessageReaction {
  emoji: string;
  userIds: string[];
  createdAt: Timestamp;
}

/**
 * Team Announcement
 * Important team notifications
 */
export interface TeamAnnouncement {
  id: string;
  teamId: string;
  title: string;
  content: string;
  contentType: 'text' | 'markdown' | 'html';
  authorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp;
  expiresAt?: Timestamp;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  visibleTo: 'all_members' | 'specific_roles';
  roleIds?: string[]; // If visibleTo is 'specific_roles'
  attachments?: MessageAttachment[];
  acknowledgements?: {
    userId: string;
    timestamp: Timestamp;
  }[];
  metadata?: Record<string, any>;
}

/**
 * Create Channel Input
 * Required data to create a new team channel
 */
export interface CreateChannelInput {
  name: string;
  description?: string;
  type: 'text' | 'announcement' | 'file-sharing';
  isPrivate: boolean;
  members?: string[]; // Required if isPrivate is true
  metadata?: Record<string, any>;
}

/**
 * Create Message Input
 * Required data to create a new message
 */
export interface CreateMessageInput {
  channelId: string;
  content: string;
  contentType: 'text' | 'markdown' | 'file' | 'system';
  attachments?: Omit<MessageAttachment, 'id'>[];
  mentions?: {
    userIds: string[];
    channelIds: string[];
    teamIds: string[];
  };
  isAnnouncement?: boolean;
  parentMessageId?: string;
  metadata?: Record<string, any>;
}

/**
 * Create Announcement Input
 * Required data to create a new team announcement
 */
export interface CreateAnnouncementInput {
  title: string;
  content: string;
  contentType: 'text' | 'markdown' | 'html';
  publishedAt?: Date;
  expiresAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  visibleTo: 'all_members' | 'specific_roles';
  roleIds?: string[];
  attachments?: Omit<MessageAttachment, 'id'>[];
  metadata?: Record<string, any>;
}