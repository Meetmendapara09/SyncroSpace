import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../services/auth/PermissionService';
import { 
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../../services/firebase/firebaseConfig';

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
 * Create event input interface
 */
interface CreateEventInput {
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  isAllDay?: boolean;
  attendees?: string[];
  color?: string;
  recurrence?: string;
  metadata?: Record<string, any>;
}

/**
 * Calendar service for team events
 */
class CalendarService {
  /**
   * Get team events by date range
   */
  async getTeamEvents(
    teamId: string,
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ) {
    try {
      const { startDate, endDate, limit = 100 } = options;
      
      let eventsQuery = query(
        collection(db, 'teamEvents'),
        where('teamId', '==', teamId),
        orderBy('startTime')
      );
      
      // Add date filters if provided
      if (startDate) {
        const startTimestamp = Timestamp.fromDate(new Date(startDate));
        eventsQuery = query(
          eventsQuery,
          where('startTime', '>=', startTimestamp)
        );
      }
      
      if (endDate) {
        const endTimestamp = Timestamp.fromDate(new Date(endDate));
        eventsQuery = query(
          eventsQuery,
          where('startTime', '<=', endTimestamp)
        );
      }
      
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarEvent[];
      
      return events;
    } catch (error) {
      console.error('Error getting team events:', error);
      throw error;
    }
  }
  
  /**
   * Create a calendar event
   */
  async createEvent(
    teamId: string,
    userId: string,
    data: CreateEventInput
  ): Promise<CalendarEvent> {
    try {
      // Parse dates if they're strings
      const startTime = typeof data.startTime === 'string' 
        ? new Date(data.startTime) 
        : data.startTime;
      
      const endTime = typeof data.endTime === 'string' 
        ? new Date(data.endTime) 
        : data.endTime;
      
      const eventData = {
        teamId,
        title: data.title,
        description: data.description || '',
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        location: data.location || '',
        isAllDay: data.isAllDay || false,
        attendees: data.attendees || [userId],
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        color: data.color,
        recurrence: data.recurrence,
        metadata: data.metadata || {}
      };
      
      if (!eventData.attendees.includes(userId)) {
        eventData.attendees.push(userId);
      }
      
      const eventRef = await addDoc(collection(db, 'teamEvents'), eventData);
      
      return {
        id: eventRef.id,
        ...eventData,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      } as CalendarEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }
}

// Create singleton instance
const calendarService = new CalendarService();

/**
 * API endpoint for team calendar events
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
    
    // Get team ID from URL
    const teamId = req.query.teamId as string;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
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
        return handleGetEvents(req, res, teamId);
        
      case 'POST':
        return handleCreateEvent(req, res, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in calendar API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get events request
 */
async function handleGetEvents(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = parseInt(req.query.limit as string) || undefined;
    
    const events = await calendarService.getTeamEvents(
      teamId,
      { startDate, endDate, limit }
    );
    
    return res.status(200).json({ events });
  } catch (error) {
    console.error('Error getting events:', error);
    return res.status(500).json({ error: 'Failed to get events' });
  }
}

/**
 * Handle create event request
 */
async function handleCreateEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to create events
    const canCreateEvents = await permissionService.hasPermission(
      userId,
      teamId,
      'createEvents'
    );
    
    if (!canCreateEvents) {
      return res.status(403).json({
        error: 'You do not have permission to create events'
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
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Event title is required' });
    }
    
    if (!startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Event start and end times are required' 
      });
    }
    
    // Validate dates
    try {
      new Date(startTime);
      new Date(endTime);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid date format for start or end time' 
      });
    }
    
    // Ensure end time is after start time
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ 
        error: 'End time must be after start time' 
      });
    }
    
    const event = await calendarService.createEvent(
      teamId,
      userId,
      {
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
      }
    );
    
    return res.status(201).json({ event });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
}