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
  limit
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string | Date;
  endTime: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  creatorId: string;
  creatorName?: string;
  creatorEmail?: string;
  participants?: string[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  location?: string;
  calendarEventId?: string;
  spaceId?: string;
  recurring?: boolean;
  recurrencePattern?: string;
  reminders?: boolean;
}

export class MeetingService {
  static async getMeeting(meetingId: string): Promise<Meeting> {
    try {
      const docRef = doc(db, 'meetings', meetingId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Meeting not found');
      }
      
      return { 
        id: docSnap.id, 
        ...docSnap.data() 
      } as Meeting;
    } catch (error) {
      console.error('Error fetching meeting:', error);
      throw error;
    }
  }
  
  static async getUserMeetings(
    userId: string,
    options: {
      status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
      limit?: number;
    } = {}
  ): Promise<Meeting[]> {
    try {
      let meetingsQuery = query(
        collection(db, 'meetings'),
        where('participants', 'array-contains', userId),
        orderBy('startTime', 'asc')
      );
      
      if (options.status) {
        meetingsQuery = query(
          meetingsQuery,
          where('status', '==', options.status)
        );
      }
      
      if (options.limit) {
        meetingsQuery = query(
          meetingsQuery,
          limit(options.limit)
        );
      }
      
      const querySnapshot = await getDocs(meetingsQuery);
      const meetings: Meeting[] = [];
      
      querySnapshot.forEach(doc => {
        meetings.push({
          id: doc.id,
          ...doc.data()
        } as Meeting);
      });
      
      return meetings;
    } catch (error) {
      console.error('Error fetching user meetings:', error);
      throw error;
    }
  }
  
  static async createMeeting(meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const [user] = useAuthState(auth);
    
    if (!user) {
      throw new Error('User must be authenticated to create a meeting');
    }
    
    try {
      const meetingRef = await addDoc(collection(db, 'meetings'), {
        ...meetingData,
        creatorId: user.uid,
        creatorEmail: user.email,
        creatorName: user.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return meetingRef.id;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }
  
  static async updateMeeting(meetingId: string, meetingData: Partial<Meeting>): Promise<void> {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      
      await updateDoc(meetingRef, {
        ...meetingData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }
  
  static async deleteMeeting(meetingId: string): Promise<void> {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await deleteDoc(meetingRef);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }
  
  static async addParticipant(meetingId: string, participantEmail: string): Promise<void> {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      const meetingSnap = await getDoc(meetingRef);
      
      if (!meetingSnap.exists()) {
        throw new Error('Meeting not found');
      }
      
      const meetingData = meetingSnap.data();
      const participants = meetingData.participants || [];
      
      // Check if participant is already in the meeting
      if (participants.includes(participantEmail)) {
        return;
      }
      
      await updateDoc(meetingRef, {
        participants: [...participants, participantEmail],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }
  
  static async removeParticipant(meetingId: string, participantEmail: string): Promise<void> {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      const meetingSnap = await getDoc(meetingRef);
      
      if (!meetingSnap.exists()) {
        throw new Error('Meeting not found');
      }
      
      const meetingData = meetingSnap.data();
      const participants = meetingData.participants || [];
      
      await updateDoc(meetingRef, {
        participants: participants.filter((email: string) => email !== participantEmail),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }
  
  static async updateMeetingStatus(meetingId: string, status: Meeting['status']): Promise<void> {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      
      await updateDoc(meetingRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating meeting status:', error);
      throw error;
    }
  }
}