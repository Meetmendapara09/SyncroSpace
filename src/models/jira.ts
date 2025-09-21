// Core data models for JIRA-like features
export type IssueStatus = 'todo' | 'in-progress' | 'done' | 'blocked';

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  assignee: string;
  reporter: string;
  projectId: string;
  boardId: string;
  createdAt: number;
  updatedAt: number;
  comments?: string[];
  attachments?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner: string;
  members: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Board {
  id: string;
  name: string;
  projectId: string;
  type: 'kanban' | 'scrum';
  columns: string[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface Comment {
  id: string;
  issueId: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  issueId: string;
  url: string;
  uploadedBy: string;
  createdAt: number;
}

export interface Workflow {
  id: string;
  name: string;
  statuses: IssueStatus[];
  projectId: string;
}
