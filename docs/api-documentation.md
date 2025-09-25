# SyncroSpace API Documentation

## Overview

This document provides comprehensive documentation for the SyncroSpace API. The API allows developers to interact with the SyncroSpace platform programmatically, enabling integration with external systems and custom client applications.

## Base URL
```
https://api.syncrospace.vercel.app/v1
```

## Authentication

### Authentication Methods

SyncroSpace API uses JWT (JSON Web Tokens) for authentication. There are two ways to authenticate:

1. **Bearer Token Authentication**
   ```
   Authorization: Bearer <your_jwt_token>
   ```

2. **API Key Authentication**
   ```
   X-API-Key: <your_api_key>
   ```

### Obtaining Authentication Tokens

#### 1. User Authentication

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user_id_123",
    "name": "User Name",
    "email": "user@example.com",
    "role": "member"
  }
}
```

#### 2. Token Refresh

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### 3. API Key Generation

```http
POST /auth/api-keys
```

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "name": "Integration Key",
  "expiresIn": 2592000  // Optional: Expiration time in seconds (30 days)
}
```

**Response:**
```json
{
  "key": "sk_live_1234567890abcdef",
  "name": "Integration Key",
  "createdAt": "2025-09-25T12:00:00Z",
  "expiresAt": "2025-10-25T12:00:00Z"
}
```

## General API Information

### Response Format

All API responses are returned in JSON format with the following structure:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "pagination": {}
  }
}
```

For errors:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

### Rate Limiting

- **Free tier**: 100 requests per minute
- **Standard tier**: 1,000 requests per minute
- **Enterprise tier**: 10,000 requests per minute

Rate limit headers are included in all API responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1632580832
```

### Pagination

For endpoints that return collections of resources, pagination is available using the following query parameters:

- `page`: Page number (starts from 1)
- `limit`: Number of items per page (default: 20, max: 100)

Example:
```
GET /spaces?page=2&limit=50
```

Response includes pagination metadata:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 50,
      "totalItems": 327,
      "totalPages": 7,
      "hasNextPage": true,
      "hasPrevPage": true
    }
  }
}
```

---

## API Endpoints

### User Management

#### Get Current User

```http
GET /users/me
```

**Description:** Retrieves the profile of the currently authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id_123",
    "name": "User Name",
    "email": "user@example.com",
    "role": "member",
    "createdAt": "2025-01-15T08:30:00Z",
    "lastLoginAt": "2025-09-25T10:15:22Z",
    "preferences": {
      "theme": "light",
      "notifications": true,
      "language": "en"
    }
  }
}
```

#### Update User Profile

```http
PATCH /users/me
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "preferences": {
    "theme": "dark"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id_123",
    "name": "Updated Name",
    "email": "user@example.com",
    "role": "member",
    "preferences": {
      "theme": "dark",
      "notifications": true,
      "language": "en"
    }
  }
}
```

#### List Organization Users (Admin Only)

```http
GET /users
```

**Query Parameters:**
- `role`: Filter by role (admin, member, guest)
- `status`: Filter by status (active, inactive, pending)
- `search`: Search by name or email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id_123",
      "name": "User Name",
      "email": "user@example.com",
      "role": "member",
      "status": "active",
      "createdAt": "2025-01-15T08:30:00Z"
    }
    // Additional users...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 45,
      "totalPages": 3
    }
  }
}
```

### Spaces

#### List Spaces

```http
GET /spaces
```

**Description:** Retrieves all spaces accessible to the current user.

**Query Parameters:**
- `type`: Filter by space type (team, project, personal)
- `search`: Search by name
- `status`: Filter by status (active, archived)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "space_id_123",
      "name": "Marketing Team",
      "description": "Space for marketing team collaboration",
      "type": "team",
      "createdAt": "2025-03-10T14:22:00Z",
      "createdBy": "user_id_456",
      "memberCount": 12,
      "status": "active"
    }
    // Additional spaces...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 8,
      "totalPages": 1
    }
  }
}
```

#### Get Space Details

```http
GET /spaces/{spaceId}
```

**Description:** Retrieves detailed information about a specific space.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "space_id_123",
    "name": "Marketing Team",
    "description": "Space for marketing team collaboration",
    "type": "team",
    "createdAt": "2025-03-10T14:22:00Z",
    "createdBy": {
      "id": "user_id_456",
      "name": "Creator Name"
    },
    "members": [
      {
        "id": "user_id_456",
        "name": "Creator Name",
        "role": "admin"
      },
      {
        "id": "user_id_789",
        "name": "Member Name",
        "role": "member"
      }
      // Additional members...
    ],
    "settings": {
      "allowGuests": true,
      "publicAccess": false,
      "defaultView": "board"
    },
    "status": "active",
    "stats": {
      "messagesCount": 1243,
      "filesCount": 56,
      "tasksCount": 32,
      "lastActivityAt": "2025-09-24T16:45:12Z"
    }
  }
}
```

#### Create Space

```http
POST /spaces
```

**Request Body:**
```json
{
  "name": "New Project Space",
  "description": "Collaboration space for our new project",
  "type": "project",
  "settings": {
    "allowGuests": false,
    "defaultView": "kanban"
  },
  "members": [
    {
      "userId": "user_id_789",
      "role": "member"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "space_id_new",
    "name": "New Project Space",
    "description": "Collaboration space for our new project",
    "type": "project",
    "createdAt": "2025-09-25T12:34:56Z",
    "createdBy": {
      "id": "user_id_123",
      "name": "Your Name"
    },
    "members": [
      {
        "id": "user_id_123",
        "name": "Your Name",
        "role": "admin"
      },
      {
        "id": "user_id_789",
        "name": "Member Name",
        "role": "member"
      }
    ],
    "settings": {
      "allowGuests": false,
      "publicAccess": false,
      "defaultView": "kanban"
    },
    "status": "active"
  }
}
```

#### Update Space

```http
PATCH /spaces/{spaceId}
```

**Request Body:**
```json
{
  "name": "Updated Space Name",
  "description": "Updated space description",
  "settings": {
    "allowGuests": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "space_id_123",
    "name": "Updated Space Name",
    "description": "Updated space description",
    "settings": {
      "allowGuests": true,
      "publicAccess": false,
      "defaultView": "board"
    },
    // Additional space data...
  }
}
```

#### Delete Space

```http
DELETE /spaces/{spaceId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Space successfully deleted"
  }
}
```

#### Manage Space Members

```http
POST /spaces/{spaceId}/members
```

**Request Body:**
```json
{
  "userId": "user_id_new",
  "role": "member"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "member_id_new",
    "userId": "user_id_new",
    "name": "New Member",
    "email": "newmember@example.com",
    "role": "member",
    "addedAt": "2025-09-25T12:45:30Z"
  }
}
```

```http
PATCH /spaces/{spaceId}/members/{userId}
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "member_id",
    "userId": "user_id",
    "name": "Member Name",
    "role": "admin",
    "updatedAt": "2025-09-25T12:50:15Z"
  }
}
```

```http
DELETE /spaces/{spaceId}/members/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Member successfully removed from space"
  }
}
```

### Chat

#### List Conversations

```http
GET /chat/conversations
```

**Description:** Retrieves all chat conversations the user has access to.

**Query Parameters:**
- `type`: Filter by conversation type (direct, group, space)
- `status`: Filter by status (active, archived)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv_id_123",
      "type": "direct",
      "name": null,
      "participants": [
        {
          "id": "user_id_123",
          "name": "Your Name"
        },
        {
          "id": "user_id_456",
          "name": "Other User"
        }
      ],
      "lastMessage": {
        "id": "msg_id_789",
        "content": "See you at the meeting",
        "sentAt": "2025-09-25T10:30:45Z",
        "sentBy": {
          "id": "user_id_456",
          "name": "Other User"
        }
      },
      "unreadCount": 0,
      "updatedAt": "2025-09-25T10:30:45Z"
    }
    // Additional conversations...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 12,
      "totalPages": 1
    }
  }
}
```

#### Get Conversation Messages

```http
GET /chat/conversations/{conversationId}/messages
```

**Description:** Retrieves messages from a specific conversation.

**Query Parameters:**
- `before`: Get messages before this timestamp
- `after`: Get messages after this timestamp
- `limit`: Number of messages to return (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_id_123",
      "content": "Hello, how are you?",
      "contentType": "text",
      "sentAt": "2025-09-25T09:30:00Z",
      "sentBy": {
        "id": "user_id_456",
        "name": "Other User"
      },
      "readBy": [
        "user_id_123",
        "user_id_456"
      ]
    },
    {
      "id": "msg_id_124",
      "content": "I'm doing well, thanks!",
      "contentType": "text",
      "sentAt": "2025-09-25T09:32:15Z",
      "sentBy": {
        "id": "user_id_123",
        "name": "Your Name"
      },
      "readBy": [
        "user_id_123",
        "user_id_456"
      ]
    }
    // Additional messages...
  ],
  "meta": {
    "hasMore": true,
    "oldestMessageId": "msg_id_123",
    "latestMessageId": "msg_id_456"
  }
}
```

#### Send Message

```http
POST /chat/conversations/{conversationId}/messages
```

**Request Body:**
```json
{
  "content": "Hi everyone, I've just uploaded the new design files.",
  "contentType": "text",
  "attachments": [
    {
      "fileId": "file_id_123"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "msg_id_new",
    "content": "Hi everyone, I've just uploaded the new design files.",
    "contentType": "text",
    "sentAt": "2025-09-25T13:15:45Z",
    "sentBy": {
      "id": "user_id_123",
      "name": "Your Name"
    },
    "readBy": [
      "user_id_123"
    ],
    "attachments": [
      {
        "id": "file_id_123",
        "name": "design-mockup.jpg",
        "type": "image/jpeg",
        "size": 1245678,
        "url": "https://assets.syncrospace.vercel.app/files/design-mockup.jpg"
      }
    ]
  }
}
```

#### Create Conversation

```http
POST /chat/conversations
```

**Request Body:**
```json
{
  "type": "group",
  "name": "Project Brainstorming",
  "participants": [
    "user_id_456",
    "user_id_789"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_id_new",
    "type": "group",
    "name": "Project Brainstorming",
    "participants": [
      {
        "id": "user_id_123",
        "name": "Your Name"
      },
      {
        "id": "user_id_456",
        "name": "Participant 1"
      },
      {
        "id": "user_id_789",
        "name": "Participant 2"
      }
    ],
    "createdAt": "2025-09-25T13:20:00Z",
    "createdBy": {
      "id": "user_id_123",
      "name": "Your Name"
    }
  }
}
```

### Tasks

#### List Tasks

```http
GET /tasks
```

**Description:** Retrieves tasks based on filters.

**Query Parameters:**
- `spaceId`: Filter by space
- `assignee`: Filter by assignee user ID
- `status`: Filter by status (todo, in_progress, review, done)
- `dueDate`: Filter by due date (today, tomorrow, this_week, next_week, overdue)
- `priority`: Filter by priority (low, medium, high, urgent)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task_id_123",
      "title": "Complete API documentation",
      "description": "Create comprehensive API docs for developers",
      "status": "in_progress",
      "priority": "high",
      "dueDate": "2025-09-28T00:00:00Z",
      "createdAt": "2025-09-20T14:35:22Z",
      "createdBy": {
        "id": "user_id_456",
        "name": "Task Creator"
      },
      "assignee": {
        "id": "user_id_123",
        "name": "Your Name"
      },
      "spaceId": "space_id_123",
      "spaceName": "Development Team"
    }
    // Additional tasks...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 45,
      "totalPages": 3
    }
  }
}
```

#### Get Task Details

```http
GET /tasks/{taskId}
```

**Description:** Retrieves detailed information about a specific task.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "task_id_123",
    "title": "Complete API documentation",
    "description": "Create comprehensive API docs for developers",
    "status": "in_progress",
    "priority": "high",
    "dueDate": "2025-09-28T00:00:00Z",
    "completedAt": null,
    "createdAt": "2025-09-20T14:35:22Z",
    "createdBy": {
      "id": "user_id_456",
      "name": "Task Creator"
    },
    "assignee": {
      "id": "user_id_123",
      "name": "Your Name"
    },
    "spaceId": "space_id_123",
    "spaceName": "Development Team",
    "checklist": [
      {
        "id": "check_id_1",
        "text": "Write authentication section",
        "completed": true
      },
      {
        "id": "check_id_2",
        "text": "Write endpoints section",
        "completed": false
      }
    ],
    "comments": [
      {
        "id": "comment_id_1",
        "content": "Please include webhook information as well",
        "createdAt": "2025-09-21T10:15:30Z",
        "createdBy": {
          "id": "user_id_456",
          "name": "Task Creator"
        }
      }
    ],
    "attachments": [
      {
        "id": "file_id_123",
        "name": "api-outline.pdf",
        "type": "application/pdf",
        "size": 2345678,
        "url": "https://assets.syncrospace.vercel.app/files/api-outline.pdf",
        "uploadedAt": "2025-09-21T09:30:00Z"
      }
    ],
    "labels": [
      {
        "id": "label_id_1",
        "name": "Documentation",
        "color": "#3498db"
      }
    ]
  }
}
```

#### Create Task

```http
POST /tasks
```

**Request Body:**
```json
{
  "title": "Implement new search feature",
  "description": "Add full-text search capability to the application",
  "status": "todo",
  "priority": "medium",
  "dueDate": "2025-10-05T00:00:00Z",
  "assigneeId": "user_id_789",
  "spaceId": "space_id_123",
  "labels": ["feature", "backend"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "task_id_new",
    "title": "Implement new search feature",
    "description": "Add full-text search capability to the application",
    "status": "todo",
    "priority": "medium",
    "dueDate": "2025-10-05T00:00:00Z",
    "createdAt": "2025-09-25T14:00:00Z",
    "createdBy": {
      "id": "user_id_123",
      "name": "Your Name"
    },
    "assignee": {
      "id": "user_id_789",
      "name": "Developer Name"
    },
    "spaceId": "space_id_123",
    "spaceName": "Development Team",
    "labels": [
      {
        "id": "label_id_2",
        "name": "feature",
        "color": "#27ae60"
      },
      {
        "id": "label_id_3",
        "name": "backend",
        "color": "#8e44ad"
      }
    ]
  }
}
```

#### Update Task

```http
PATCH /tasks/{taskId}
```

**Request Body:**
```json
{
  "status": "in_progress",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "task_id_123",
    "title": "Complete API documentation",
    "status": "in_progress",
    "priority": "high",
    "updatedAt": "2025-09-25T14:15:30Z",
    // Additional task data...
  }
}
```

#### Delete Task

```http
DELETE /tasks/{taskId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Task successfully deleted"
  }
}
```

### Files and Documents

#### List Files

```http
GET /files
```

**Description:** Retrieves files based on filters.

**Query Parameters:**
- `spaceId`: Filter by space
- `type`: Filter by file type (document, image, video, etc.)
- `search`: Search by file name or content

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "file_id_123",
      "name": "project-presentation.pptx",
      "type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "size": 5678901,
      "url": "https://assets.syncrospace.vercel.app/files/project-presentation.pptx",
      "thumbnailUrl": "https://assets.syncrospace.vercel.app/thumbnails/project-presentation.jpg",
      "uploadedAt": "2025-09-15T10:45:22Z",
      "uploadedBy": {
        "id": "user_id_456",
        "name": "File Owner"
      },
      "spaceId": "space_id_123",
      "spaceName": "Marketing Team"
    }
    // Additional files...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 156,
      "totalPages": 8
    }
  }
}
```

#### Upload File

```http
POST /files/upload
```

**Headers:**
```
Content-Type: multipart/form-data
```

**Form Data:**
```
file: <file_binary>
spaceId: space_id_123
folderId: folder_id_456 (optional)
description: Project presentation for client meeting (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file_id_new",
    "name": "new-document.docx",
    "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": 1234567,
    "url": "https://assets.syncrospace.vercel.app/files/new-document.docx",
    "uploadedAt": "2025-09-25T15:00:00Z",
    "uploadedBy": {
      "id": "user_id_123",
      "name": "Your Name"
    },
    "spaceId": "space_id_123",
    "spaceName": "Marketing Team",
    "folderId": "folder_id_456",
    "folderName": "Client Presentations",
    "description": "Project presentation for client meeting"
  }
}
```

#### Get File Details

```http
GET /files/{fileId}
```

**Description:** Retrieves detailed information about a specific file.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file_id_123",
    "name": "project-presentation.pptx",
    "type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "size": 5678901,
    "url": "https://assets.syncrospace.vercel.app/files/project-presentation.pptx",
    "thumbnailUrl": "https://assets.syncrospace.vercel.app/thumbnails/project-presentation.jpg",
    "uploadedAt": "2025-09-15T10:45:22Z",
    "updatedAt": "2025-09-16T14:30:00Z",
    "uploadedBy": {
      "id": "user_id_456",
      "name": "File Owner"
    },
    "spaceId": "space_id_123",
    "spaceName": "Marketing Team",
    "folderId": "folder_id_456",
    "folderName": "Client Presentations",
    "description": "Final presentation for the Q3 project",
    "metadata": {
      "pageCount": 24,
      "lastModified": "2025-09-16T14:29:45Z"
    },
    "permissions": {
      "canView": true,
      "canEdit": true,
      "canDelete": true,
      "canShare": true
    },
    "versions": [
      {
        "id": "version_id_1",
        "versionNumber": 2,
        "size": 5678901,
        "url": "https://assets.syncrospace.vercel.app/files/project-presentation.v2.pptx",
        "updatedAt": "2025-09-16T14:30:00Z",
        "updatedBy": {
          "id": "user_id_456",
          "name": "File Owner"
        },
        "changeDescription": "Added executive summary"
      },
      {
        "id": "version_id_2",
        "versionNumber": 1,
        "size": 5234567,
        "url": "https://assets.syncrospace.vercel.app/files/project-presentation.v1.pptx",
        "updatedAt": "2025-09-15T10:45:22Z",
        "updatedBy": {
          "id": "user_id_456",
          "name": "File Owner"
        },
        "changeDescription": "Initial upload"
      }
    ],
    "comments": [
      {
        "id": "comment_id_1",
        "content": "Please add the budget section to this presentation",
        "createdAt": "2025-09-16T09:15:30Z",
        "createdBy": {
          "id": "user_id_789",
          "name": "Team Member"
        }
      }
    ]
  }
}
```

#### Delete File

```http
DELETE /files/{fileId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "File successfully deleted"
  }
}
```

### Calendar and Events

#### List Events

```http
GET /events
```

**Description:** Retrieves events based on filters.

**Query Parameters:**
- `spaceId`: Filter by space
- `start`: Start date (ISO format)
- `end`: End date (ISO format)
- `userId`: Filter by participant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event_id_123",
      "title": "Weekly Team Meeting",
      "description": "Regular team sync to discuss project progress",
      "start": "2025-09-26T10:00:00Z",
      "end": "2025-09-26T11:00:00Z",
      "allDay": false,
      "location": {
        "type": "virtual",
        "url": "https://meet.syncrospace.vercel.app/room/team-weekly"
      },
      "organizer": {
        "id": "user_id_456",
        "name": "Team Lead"
      },
      "spaceId": "space_id_123",
      "spaceName": "Development Team",
      "recurrence": {
        "frequency": "weekly",
        "interval": 1,
        "weekdays": ["friday"],
        "until": "2025-12-31T00:00:00Z"
      }
    }
    // Additional events...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 8,
      "totalPages": 1
    }
  }
}
```

#### Create Event

```http
POST /events
```

**Request Body:**
```json
{
  "title": "Client Project Kickoff",
  "description": "Initial meeting to discuss project scope and timeline",
  "start": "2025-10-01T14:00:00Z",
  "end": "2025-10-01T15:30:00Z",
  "allDay": false,
  "location": {
    "type": "virtual",
    "url": "https://meet.syncrospace.vercel.app/room/project-kickoff"
  },
  "spaceId": "space_id_123",
  "participants": [
    "user_id_456",
    "user_id_789"
  ],
  "reminders": [
    {
      "type": "notification",
      "minutes": 15
    },
    {
      "type": "email",
      "minutes": 60
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event_id_new",
    "title": "Client Project Kickoff",
    "description": "Initial meeting to discuss project scope and timeline",
    "start": "2025-10-01T14:00:00Z",
    "end": "2025-10-01T15:30:00Z",
    "allDay": false,
    "location": {
      "type": "virtual",
      "url": "https://meet.syncrospace.vercel.app/room/project-kickoff"
    },
    "organizer": {
      "id": "user_id_123",
      "name": "Your Name"
    },
    "spaceId": "space_id_123",
    "spaceName": "Marketing Team",
    "participants": [
      {
        "id": "user_id_123",
        "name": "Your Name",
        "response": "accepted"
      },
      {
        "id": "user_id_456",
        "name": "Participant 1",
        "response": "pending"
      },
      {
        "id": "user_id_789",
        "name": "Participant 2",
        "response": "pending"
      }
    ],
    "reminders": [
      {
        "type": "notification",
        "minutes": 15
      },
      {
        "type": "email",
        "minutes": 60
      }
    ],
    "createdAt": "2025-09-25T16:30:00Z"
  }
}
```

#### Update Event

```http
PATCH /events/{eventId}
```

**Request Body:**
```json
{
  "title": "Updated Client Project Kickoff",
  "start": "2025-10-01T15:00:00Z",
  "end": "2025-10-01T16:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event_id_123",
    "title": "Updated Client Project Kickoff",
    "start": "2025-10-01T15:00:00Z",
    "end": "2025-10-01T16:30:00Z",
    "updatedAt": "2025-09-25T16:45:00Z",
    // Additional event data...
  }
}
```

#### Respond to Event Invitation

```http
POST /events/{eventId}/response
```

**Request Body:**
```json
{
  "response": "accepted" // accepted, tentative, declined
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event_id_123",
    "title": "Weekly Team Meeting",
    "userResponse": "accepted",
    "updatedAt": "2025-09-25T17:00:00Z"
  }
}
```

### Notifications

#### List Notifications

```http
GET /notifications
```

**Description:** Retrieves user notifications.

**Query Parameters:**
- `status`: Filter by status (read, unread, all)
- `type`: Filter by notification type (task, message, event, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_id_123",
      "type": "task_assigned",
      "read": false,
      "createdAt": "2025-09-25T08:30:45Z",
      "data": {
        "taskId": "task_id_456",
        "taskTitle": "Review design mockups",
        "assignerId": "user_id_789",
        "assignerName": "Project Manager"
      }
    },
    {
      "id": "notif_id_124",
      "type": "message_mention",
      "read": true,
      "createdAt": "2025-09-24T14:22:10Z",
      "data": {
        "conversationId": "conv_id_456",
        "messageId": "msg_id_789",
        "senderName": "Team Member",
        "messagePreview": "Hey @Your Name, could you review this?"
      }
    }
    // Additional notifications...
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 42,
      "totalPages": 3
    },
    "unreadCount": 12
  }
}
```

#### Mark Notifications as Read

```http
POST /notifications/read
```

**Request Body:**
```json
{
  "notificationIds": ["notif_id_123", "notif_id_125"],
  "allNotifications": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markedAsRead": 2,
    "unreadCount": 10
  }
}
```

### Webhooks

#### List Webhooks

```http
GET /webhooks
```

**Description:** Retrieves webhooks created by the user or organization.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "webhook_id_123",
      "url": "https://your-service.com/webhook-endpoint",
      "events": ["task.created", "task.updated", "task.deleted"],
      "active": true,
      "createdAt": "2025-08-15T10:30:00Z",
      "lastTriggeredAt": "2025-09-24T16:45:22Z",
      "secretKey": "••••••••••••••••"
    }
    // Additional webhooks...
  ]
}
```

#### Create Webhook

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-service.com/new-webhook-endpoint",
  "events": ["space.created", "space.member_added"],
  "description": "Notify our system when spaces are created or members are added"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_id_new",
    "url": "https://your-service.com/new-webhook-endpoint",
    "events": ["space.created", "space.member_added"],
    "active": true,
    "createdAt": "2025-09-25T17:30:00Z",
    "description": "Notify our system when spaces are created or members are added",
    "secretKey": "whsec_12345abcdef67890"
  }
}
```

#### Update Webhook

```http
PATCH /webhooks/{webhookId}
```

**Request Body:**
```json
{
  "events": ["space.created", "space.member_added", "space.member_removed"],
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_id_123",
    "url": "https://your-service.com/webhook-endpoint",
    "events": ["space.created", "space.member_added", "space.member_removed"],
    "active": true,
    "updatedAt": "2025-09-25T17:45:00Z"
  }
}
```

#### Delete Webhook

```http
DELETE /webhooks/{webhookId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Webhook successfully deleted"
  }
}
```

## Webhook Events

SyncroSpace can send webhook notifications for the following events:

### User Events
- `user.created` - When a new user is created
- `user.updated` - When a user's profile is updated
- `user.deleted` - When a user is deleted

### Space Events
- `space.created` - When a new space is created
- `space.updated` - When a space is updated
- `space.deleted` - When a space is deleted
- `space.member_added` - When a member is added to a space
- `space.member_updated` - When a member's role is updated in a space
- `space.member_removed` - When a member is removed from a space

### Chat Events
- `conversation.created` - When a new conversation is created
- `conversation.member_added` - When a member is added to a conversation
- `conversation.member_removed` - When a member is removed from a conversation
- `message.created` - When a new message is sent
- `message.updated` - When a message is edited
- `message.deleted` - When a message is deleted

### Task Events
- `task.created` - When a new task is created
- `task.updated` - When a task is updated
- `task.deleted` - When a task is deleted
- `task.assigned` - When a task is assigned to a user
- `task.completed` - When a task is marked as completed

### File Events
- `file.uploaded` - When a new file is uploaded
- `file.updated` - When a file is updated
- `file.deleted` - When a file is deleted
- `file.shared` - When a file is shared with users

### Calendar Events
- `event.created` - When a new event is created
- `event.updated` - When an event is updated
- `event.deleted` - When an event is deleted
- `event.response` - When a user responds to an event invitation

## Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_REQUIRED` | Authentication is required for this request |
| `INVALID_CREDENTIALS` | Provided credentials are invalid |
| `TOKEN_EXPIRED` | The authentication token has expired |
| `PERMISSION_DENIED` | User doesn't have permission to perform this action |
| `RESOURCE_NOT_FOUND` | The requested resource was not found |
| `VALIDATION_ERROR` | The request data failed validation |
| `RATE_LIMIT_EXCEEDED` | API rate limit has been exceeded |
| `INTERNAL_SERVER_ERROR` | An unexpected error occurred on the server |
| `BAD_REQUEST` | The request is malformed or contains invalid parameters |
| `CONFLICT` | The request could not be completed due to a conflict with the current state |

## API Versioning

The SyncroSpace API is versioned using URI path versioning. The current version is `v1`. When new versions are released, the previous versions will continue to be available for a deprecation period of at least 12 months.