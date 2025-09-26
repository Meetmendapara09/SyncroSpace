import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../services/auth/PermissionService';
import { 
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../../../services/firebase/firebaseConfig';

/**
 * Calendar event interface
 */
interface CalendarEvent {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  location?: string;
  isAllDay: boolean;
  attendees: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  color?: string;
  recurrence?: string; // iCal RFC-5545 recurrence rule
  metadata?: Record<string, any>;
}

/**
 * Update event input interface
 */
interface UpdateEventInput {
  title?: string;
  description?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  location?: string;
  isAllDay?: boolean;
  attendees?: string[];
  color?: string;
  recurrence?: string;
  metadata?: Record<string, any>;
}

/**
 * Event service for specific calendar events
 */
class EventService {
  /**
   * Get an event by ID
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const eventRef = doc(db, 'teamEvents', eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        return null;
      }
      
      return {
        id: eventSnap.id,
        ...eventSnap.data()
      } as CalendarEvent;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }
  
  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    data: UpdateEventInput
  ): Promise<CalendarEvent> {
    try {
      const eventRef = doc(db, 'teamEvents', eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }
      
      const updateData: Record<string, any> = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      // Convert date strings to timestamps if provided
      if (data.startTime) {
        updateData.startTime = typeof data.startTime === 'string'
          ? Timestamp.fromDate(new Date(data.startTime))
          : Timestamp.fromDate(data.startTime);
      }
      
      if (data.endTime) {
        updateData.endTime = typeof data.endTime === 'string'
          ? Timestamp.fromDate(new Date(data.endTime))
          : Timestamp.fromDate(data.endTime);
      }
      
      await updateDoc(eventRef, updateData);
      
      const updatedSnap = await getDoc(eventRef);
      return {
        id: updatedSnap.id,
        ...updatedSnap.data()
      } as CalendarEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }
  
  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      const eventRef = doc(db, 'teamEvents', eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }
      
      await deleteDoc(eventRef);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
}

// Create singleton instance
const eventService = new EventService();

/**
 * API endpoint for operations on a specific calendar event
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get auth token from request
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get team ID and event ID from URL
    const teamId = req.query.teamId as string;
    const eventId = req.query.eventId as string;
    
    if (!teamId || !eventId) {
      return res.status(400).json({ 
        error: 'Team ID and event ID are required' 
      });
    }
    
    // Get the event
    const event = await eventService.getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Verify event belongs to the team
    if (event.teamId !== teamId) {
      return res.status(404).json({ error: 'Event not found in this team' });
    }
    
    // Check if user has permission to view calendar
    const canViewCalendar = await permissionService.hasPermission(
      userId,
      teamId,
      'viewCalendar'
    );
    
    if (!canViewCalendar) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return res.status(200).json({ event });
        
      case 'PUT':
        return handleUpdateEvent(req, res, event, teamId, userId);
        
      case 'DELETE':
        return handleDeleteEvent(req, res, event, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in event API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle update event request
 */
async function handleUpdateEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  event: CalendarEvent,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to edit events
    const isCreator = event.createdBy === userId;
    const canEditAllEvents = await permissionService.hasPermission(
      userId,
      teamId,
      'editAllEvents'
    );
    
    // Only allow edit if user created the event or has editAllEvents permission
    if (!isCreator && !canEditAllEvents) {
      return res.status(403).json({
        error: 'You do not have permission to edit this event'
      });
    }
    
    const { 
      title, 
      description, 
      startTime, 
      endTime,
      location,
      isAllDay,
      attendees,
      color,
      recurrence,
      metadata
    } = req.body;
    
    // At least one field must be provided to update
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }
    
    // Validate dates if provided
    if (startTime && endTime) {
      try {
        const parsedStart = new Date(startTime);
        const parsedEnd = new Date(endTime);
        
        if (parsedEnd <= parsedStart) {
          return res.status(400).json({ 
            error: 'End time must be after start time' 
          });
        }
      } catch (error) {
        return res.status(400).json({ 
          error: 'Invalid date format for start or end time' 
        });
      }
    } else if (startTime || endTime) {
      // If only one date is provided, ensure it works with the existing one
      try {
        const existingStart = event.startTime.toDate();
        const existingEnd = event.endTime.toDate();
        
        if (startTime) {
          const parsedStart = new Date(startTime);
          if (parsedStart >= existingEnd) {
            return res.status(400).json({ 
              error: 'Start time must be before existing end time' 
            });
          }
        }
        
        if (endTime) {
          const parsedEnd = new Date(endTime);
          if (parsedEnd <= existingStart) {
            return res.status(400).json({ 
              error: 'End time must be after existing start time' 
            });
          }
        }
      } catch (error) {
        return res.status(400).json({ 
          error: 'Invalid date format' 
        });
      }
    }
    
    const updatedEvent = await eventService.updateEvent(event.id, {
      title,
      description,
      startTime,
      endTime,
      location,
      isAllDay,
      attendees,
      color,
      recurrence,
      metadata
    });
    
    return res.status(200).json({ event: updatedEvent });
  } catch (error: any) {
    console.error('Error updating event:', error);
    
    if (error?.message === 'Event not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    return res.status(500).json({ error: 'Failed to update event' });
  }
}

/**
 * Handle delete event request
 */
async function handleDeleteEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  event: CalendarEvent,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to delete the event
    const isCreator = event.createdBy === userId;
    const canEditAllEvents = await permissionService.hasPermission(
      userId,
      teamId,
      'editAllEvents'
    );
    
    // Only allow delete if user created the event or has editAllEvents permission
    if (!isCreator && !canEditAllEvents) {
      return res.status(403).json({
        error: 'You do not have permission to delete this event'
      });
    }
    
    await eventService.deleteEvent(event.id);
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    
    if (error?.message === 'Event not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    return res.status(500).json({ error: 'Failed to delete event' });
  }
}