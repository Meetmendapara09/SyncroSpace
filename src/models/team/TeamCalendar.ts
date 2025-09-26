import { Timestamp } from 'firebase/firestore';

/**
 * Team Calendar Event
 * Event in a team calendar
 */
export interface TeamCalendarEvent {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  location?: string;
  isVirtual: boolean;
  virtualMeetingUrl?: string;
  virtualMeetingProvider?: string; // e.g., "zoom", "teams", "meet"
  startTime: Timestamp;
  endTime: Timestamp;
  isAllDay: boolean;
  timeZone: string;
  recurringEventId?: string; // For recurring events
  recurrence?: EventRecurrence;
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'private' | 'members' | 'organization' | 'public';
  categoryId?: string; // References EventCategory
  attendees: EventAttendee[];
  reminders: EventReminder[];
  attachments?: {
    id: string;
    name: string;
    url: string;
    mimeType?: string;
  }[];
  externalCalendarIds?: Record<string, string>; // Map of provider to external ID
  metadata?: Record<string, any>;
}

/**
 * Event Recurrence
 * Defines a recurring event pattern
 */
export interface EventRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number; // For monthly recurrence
  monthOfYear?: number; // For yearly recurrence
  endsOnDate?: Timestamp;
  endsAfterOccurrences?: number;
}

/**
 * Event Attendee
 * Attendee of a calendar event
 */
export interface EventAttendee {
  userId?: string; // May be null for external attendees
  email: string;
  name: string;
  role: 'organizer' | 'required' | 'optional';
  status: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  responseTime?: Timestamp;
  comment?: string;
  isExternal: boolean;
}

/**
 * Event Reminder
 * Reminder for a calendar event
 */
export interface EventReminder {
  id: string;
  timeBeforeStart: number; // Minutes before event
  type: 'notification' | 'email' | 'both';
}

/**
 * Event Category
 * Category for calendar events
 */
export interface EventCategory {
  id: string;
  teamId: string;
  name: string;
  color: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Create Event Input
 * Required data to create a new calendar event
 */
export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  isVirtual: boolean;
  virtualMeetingUrl?: string;
  virtualMeetingProvider?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  timeZone: string;
  recurrence?: Omit<EventRecurrence, 'endsOnDate'> & { 
    endsOnDate?: Date 
  };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'private' | 'members' | 'organization' | 'public';
  categoryId?: string;
  attendees: Omit<EventAttendee, 'responseTime'> & {
    responseTime?: Date
  }[];
  reminders?: Omit<EventReminder, 'id'>[];
  attachments?: {
    name: string;
    url: string;
    mimeType?: string;
  }[];
  metadata?: Record<string, any>;
}

/**
 * Create Category Input
 * Required data to create a new event category
 */
export interface CreateCategoryInput {
  name: string;
  color: string;
  description?: string;
}