/**
 * Firebase Database Schema for Multiplayer Features
 * This service handles the creation and management of multiplayer-related collections
 */

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Types for multiplayer collections
export interface MultiplayerSession {
  id: string;
  roomName: string;
  roomType: 'public' | 'private';
  colyseusRoomId: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  participants: string[];
  maxParticipants: number;
  isActive: boolean;
  settings: {
    allowChat: boolean;
    allowVideo: boolean;
    allowScreenShare: boolean;
    moderatedChat: boolean;
  };
}

export interface MultiplayerParticipant {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  avatar: string;
  joinedAt: Timestamp;
  lastSeen: Timestamp;
  position: { x: number; y: number };
  currentOffice?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  isMicOn: boolean;
  isWebcamOn: boolean;
  isScreenSharing: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  message: string;
  type: 'global' | 'office';
  office?: string;
  timestamp: Timestamp;
  edited: boolean;
  editedAt?: Timestamp;
}

export interface OfficeZone {
  id: string;
  sessionId: string;
  zoneName: string;
  occupants: string[];
  maxOccupancy: number;
  lastUpdated: Timestamp;
  isVideoCallActive: boolean;
  isScreenShareActive: boolean;
  moderator?: string;
}

export interface MultiplayerRoom {
  id: string;
  name: string;
  description?: string;
  owner: string;
  moderators: string[];
  isPublic: boolean;
  password?: string;
  maxParticipants: number;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: {
    persistentChat: boolean;
    recordMeetings: boolean;
    allowGuests: boolean;
    requireApproval: boolean;
  };
  stats: {
    totalSessions: number;
    totalParticipants: number;
    lastUsed: Timestamp;
  };
}

class MultiplayerDatabaseService {
  private static instance: MultiplayerDatabaseService;

  static getInstance(): MultiplayerDatabaseService {
    if (!MultiplayerDatabaseService.instance) {
      MultiplayerDatabaseService.instance = new MultiplayerDatabaseService();
    }
    return MultiplayerDatabaseService.instance;
  }

  // Multiplayer Sessions Management
  async createMultiplayerSession(
    sessionData: Omit<MultiplayerSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const sessionRef = doc(collection(db, 'multiplayer_sessions'));
    const session: MultiplayerSession = {
      ...sessionData,
      id: sessionRef.id,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(sessionRef, session);
    return sessionRef.id;
  }

  async updateMultiplayerSession(
    sessionId: string, 
    updates: Partial<MultiplayerSession>
  ): Promise<void> {
    const sessionRef = doc(db, 'multiplayer_sessions', sessionId);
    await updateDoc(sessionRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  async endMultiplayerSession(sessionId: string): Promise<void> {
    const sessionRef = doc(db, 'multiplayer_sessions', sessionId);
    await updateDoc(sessionRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteMultiplayerSession(sessionId: string): Promise<void> {
    const sessionRef = doc(db, 'multiplayer_sessions', sessionId);
    await deleteDoc(sessionRef);
  }

  // Participant Management
  async addParticipant(
    sessionId: string,
    participantData: Omit<MultiplayerParticipant, 'id' | 'sessionId' | 'joinedAt' | 'lastSeen'>
  ): Promise<void> {
    const participantRef = doc(db, 'multiplayer_sessions', sessionId, 'participants', participantData.userId);
    const participant: MultiplayerParticipant = {
      ...participantData,
      id: participantData.userId,
      sessionId,
      joinedAt: serverTimestamp() as Timestamp,
      lastSeen: serverTimestamp() as Timestamp,
    };

    await setDoc(participantRef, participant);
  }

  async updateParticipant(
    sessionId: string,
    userId: string,
    updates: Partial<MultiplayerParticipant>
  ): Promise<void> {
    const participantRef = doc(db, 'multiplayer_sessions', sessionId, 'participants', userId);
    await updateDoc(participantRef, {
      ...updates,
      lastSeen: serverTimestamp(),
    });
  }

  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    const participantRef = doc(db, 'multiplayer_sessions', sessionId, 'participants', userId);
    await deleteDoc(participantRef);
  }

  // Chat Messages Management
  async addChatMessage(
    sessionId: string,
    messageData: Omit<ChatMessage, 'id' | 'sessionId' | 'timestamp' | 'edited'>
  ): Promise<string> {
    const messageRef = doc(collection(db, 'multiplayer_sessions', sessionId, 'chat_messages'));
    const message: ChatMessage = {
      ...messageData,
      id: messageRef.id,
      sessionId,
      timestamp: serverTimestamp() as Timestamp,
      edited: false,
    };

    await setDoc(messageRef, message);
    return messageRef.id;
  }

  async getChatMessages(
    sessionId: string,
    messageType: 'global' | 'office' | 'all' = 'all',
    limitCount: number = 50
  ): Promise<ChatMessage[]> {
    const messagesRef = collection(db, 'multiplayer_sessions', sessionId, 'chat_messages');
    let messagesQuery = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    if (messageType !== 'all') {
      messagesQuery = query(
        messagesRef,
        where('type', '==', messageType),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(messagesQuery);
    return snapshot.docs.map(doc => doc.data() as ChatMessage);
  }

  // Office Zone Management
  async updateOfficeZone(
    sessionId: string,
    zoneData: Omit<OfficeZone, 'sessionId' | 'lastUpdated'>
  ): Promise<void> {
    const zoneRef = doc(db, 'multiplayer_sessions', sessionId, 'office_zones', zoneData.id);
    const zone: OfficeZone = {
      ...zoneData,
      sessionId,
      lastUpdated: serverTimestamp() as Timestamp,
    };

    await setDoc(zoneRef, zone);
  }

  async addToOfficeZone(
    sessionId: string,
    zoneName: string,
    userId: string
  ): Promise<void> {
    const zoneRef = doc(db, 'multiplayer_sessions', sessionId, 'office_zones', zoneName);
    await updateDoc(zoneRef, {
      occupants: [...(await getDocs(query(collection(zoneRef, 'occupants')))).docs.map(d => d.id), userId],
      lastUpdated: serverTimestamp(),
    });
  }

  async removeFromOfficeZone(
    sessionId: string,
    zoneName: string,
    userId: string
  ): Promise<void> {
    const zoneRef = doc(db, 'multiplayer_sessions', sessionId, 'office_zones', zoneName);
    const currentOccupants = (await getDocs(query(collection(zoneRef, 'occupants')))).docs.map(d => d.id);
    await updateDoc(zoneRef, {
      occupants: currentOccupants.filter(id => id !== userId),
      lastUpdated: serverTimestamp(),
    });
  }

  // Multiplayer Rooms Management (Persistent Configurations)
  async createMultiplayerRoom(
    roomData: Omit<MultiplayerRoom, 'id' | 'createdAt' | 'updatedAt' | 'stats'>
  ): Promise<string> {
    const roomRef = doc(collection(db, 'multiplayer_rooms'));
    const room: MultiplayerRoom = {
      ...roomData,
      id: roomRef.id,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      stats: {
        totalSessions: 0,
        totalParticipants: 0,
        lastUsed: serverTimestamp() as Timestamp,
      },
    };

    await setDoc(roomRef, room);
    return roomRef.id;
  }

  async getPublicMultiplayerRooms(limitCount: number = 20): Promise<MultiplayerRoom[]> {
    const roomsQuery = query(
      collection(db, 'multiplayer_rooms'),
      where('isPublic', '==', true),
      orderBy('stats.lastUsed', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(roomsQuery);
    return snapshot.docs.map(doc => doc.data() as MultiplayerRoom);
  }

  async getUserRooms(userId: string): Promise<MultiplayerRoom[]> {
    const roomsQuery = query(
      collection(db, 'multiplayer_rooms'),
      where('owner', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(roomsQuery);
    return snapshot.docs.map(doc => doc.data() as MultiplayerRoom);
  }

  // Analytics and Statistics
  async updateRoomStats(roomId: string, sessionData: {
    participantCount: number;
    sessionDuration: number;
  }): Promise<void> {
    const roomRef = doc(db, 'multiplayer_rooms', roomId);
    await updateDoc(roomRef, {
      'stats.totalSessions': (await getDocs(query(collection(roomRef, 'sessions')))).size + 1,
      'stats.totalParticipants': sessionData.participantCount,
      'stats.lastUsed': serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// Export singleton instance
export const multiplayerDb = MultiplayerDatabaseService.getInstance();

// Utility functions for common operations
export const createQuickMultiplayerSession = async (
  userId: string,
  username: string,
  roomName: string = `Room-${Date.now()}`,
  isPublic: boolean = true
) => {
  return await multiplayerDb.createMultiplayerSession({
    roomName,
    roomType: isPublic ? 'public' : 'private',
    colyseusRoomId: '',  // Will be set when Colyseus room is created
    createdBy: userId,
    participants: [userId],
    maxParticipants: 50,
    isActive: true,
    settings: {
      allowChat: true,
      allowVideo: true,
      allowScreenShare: true,
      moderatedChat: false,
    },
  });
};

export const joinMultiplayerSession = async (
  sessionId: string,
  userId: string,
  username: string,
  avatar: string = 'default'
) => {
  await multiplayerDb.addParticipant(sessionId, {
    userId,
    username,
    avatar,
    position: { x: 400, y: 300 },
    status: 'online',
    isMicOn: false,
    isWebcamOn: false,
    isScreenSharing: false,
  });
};