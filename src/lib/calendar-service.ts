'use client';

import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string | Date;
  end: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  creatorId: string;
  creatorName?: string;
  creatorEmail?: string;
  attendees?: string[];
  location?: string;
  meetingId?: string;
  spaceId?: string;
  calendarId: string;
  isAllDay?: boolean;
  recurrence?: string;
  reminderMinutes?: number[];
  color?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface Calendar {
  id: string;
  name: string;
  color: string;
  userId: string;
  isDefault: boolean;
  isShared: boolean;
  provider?: 'google' | 'outlook' | 'apple' | 'internal';
  providerCalendarId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export class CalendarService {
  // Calendar events methods
  static async getCalendarEvent(eventId: string): Promise<CalendarEvent> {
    try {
      const docRef = doc(db, 'calendarEvents', eventId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Calendar event not found');
      }
      
      return { 
        id: docSnap.id, 
        ...docSnap.data() 
      } as CalendarEvent;
    } catch (error) {
      console.error('Error fetching calendar event:', error);
      throw error;
    }
  }
  
  static async getUserEvents(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      calendarIds?: string[];
      limit?: number;
    } = {}
  ): Promise<CalendarEvent[]> {
    try {
      // Start with base query
      let eventsQuery = query(
        collection(db, 'calendarEvents'),
        where('creatorId', '==', userId),
        orderBy('start', 'asc')
      );
      
      // Add calendar filter if provided
      if (options.calendarIds && options.calendarIds.length > 0) {
        eventsQuery = query(
          eventsQuery,
          where('calendarId', 'in', options.calendarIds)
        );
      }
      
      // Apply date range filters (this is simplified - in a real app you'd need
      // more complex filtering for recurring events)
      if (options.startDate) {
        eventsQuery = query(
          eventsQuery,
          where('end', '>=', options.startDate)
        );
      }
      
      if (options.endDate) {
        eventsQuery = query(
          eventsQuery,
          where('start', '<=', options.endDate)
        );
      }
      
      // Apply limit if provided
      if (options.limit) {
        eventsQuery = query(eventsQuery, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(eventsQuery);
      const events: CalendarEvent[] = [];
      
      querySnapshot.forEach(doc => {
        events.push({
          id: doc.id,
          ...doc.data()
        } as CalendarEvent);
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching user events:', error);
      throw error;
    }
  }
  
  static async createCalendarEvent(eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const [user] = useAuthState(auth);
    
    if (!user) {
      throw new Error('User must be authenticated to create a calendar event');
    }
    
    try {
      const eventRef = await addDoc(collection(db, 'calendarEvents'), {
        ...eventData,
        creatorId: user.uid,
        creatorEmail: user.email,
        creatorName: user.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // If this event is linked to a meeting, update the meeting with the calendar event ID
      if (eventData.meetingId) {
        const meetingRef = doc(db, 'meetings', eventData.meetingId);
        await updateDoc(meetingRef, {
          calendarEventId: eventRef.id,
          updatedAt: serverTimestamp()
        });
      }
      
      return eventRef.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }
  
  static async updateCalendarEvent(eventId: string, eventData: Partial<CalendarEvent>): Promise<void> {
    try {
      const eventRef = doc(db, 'calendarEvents', eventId);
      
      await updateDoc(eventRef, {
        ...eventData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }
  
  static async deleteCalendarEvent(eventId: string): Promise<void> {
    try {
      const eventRef = doc(db, 'calendarEvents', eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        throw new Error('Calendar event not found');
      }
      
      const eventData = eventSnap.data();
      
      // If this event is linked to a meeting, update the meeting to remove the link
      if (eventData.meetingId) {
        const meetingRef = doc(db, 'meetings', eventData.meetingId);
        const meetingSnap = await getDoc(meetingRef);
        
        if (meetingSnap.exists()) {
          await updateDoc(meetingRef, {
            calendarEventId: null,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      await deleteDoc(eventRef);
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }
  
  // Calendar methods
  static async getUserCalendars(userId: string): Promise<Calendar[]> {
    try {
      const calendarsQuery = query(
        collection(db, 'calendars'),
        where('userId', '==', userId),
        orderBy('isDefault', 'desc'),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(calendarsQuery);
      const calendars: Calendar[] = [];
      
      querySnapshot.forEach(doc => {
        calendars.push({
          id: doc.id,
          ...doc.data()
        } as Calendar);
      });
      
      return calendars;
    } catch (error) {
      console.error('Error fetching user calendars:', error);
      throw error;
    }
  }
  
  static async createCalendar(calendarData: Omit<Calendar, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const calendarRef = await addDoc(collection(db, 'calendars'), {
        ...calendarData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return calendarRef.id;
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  }
  
  static async updateCalendar(calendarId: string, calendarData: Partial<Calendar>): Promise<void> {
    try {
      const calendarRef = doc(db, 'calendars', calendarId);
      
      await updateDoc(calendarRef, {
        ...calendarData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating calendar:', error);
      throw error;
    }
  }
  
  static async deleteCalendar(calendarId: string): Promise<void> {
    try {
      // First check if this is the user's only calendar - if so, don't allow deletion
      const calendar = await getDoc(doc(db, 'calendars', calendarId));
      
      if (!calendar.exists()) {
        throw new Error('Calendar not found');
      }
      
      const userId = calendar.data().userId;
      const userCalendars = await this.getUserCalendars(userId);
      
      if (userCalendars.length === 1) {
        throw new Error('Cannot delete the only calendar');
      }
      
      // Delete all events in this calendar first
      const eventsQuery = query(
        collection(db, 'calendarEvents'),
        where('calendarId', '==', calendarId)
      );
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const batch = writeBatch(db);
      
      eventsSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      // Delete the calendar
      batch.delete(doc(db, 'calendars', calendarId));
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting calendar:', error);
      throw error;
    }
  }
}