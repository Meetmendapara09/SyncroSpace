'use client';

import { auth, rtdb, db } from './firebase';
import { ref, set, onValue, off, push, serverTimestamp, update, remove } from 'firebase/database';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAppDispatch, useAppSelector } from './redux/hooks';
import { 
  setCurrentUser, 
  setUserPosition,
  joinOffice, 
  leaveOffice, 
  addConnectedUser,
  updateConnectedUser,
  removeConnectedUser,
  setNearbyUsers
} from './redux/features/user/userSlice';
import {
  setRoomJoined,
  setPlayerPosition,
  setCurrentOffice
} from './redux/features/room/roomSlice';
import {
  pushNewOfficeMessage,
  pushNewGlobalMessage,
  toggleChatWindow,
  clearUnreadCount
} from './redux/features/chat/chatSlice';
import videoCalling from './video-calling';
import { ProximityAudioManager } from './proximity-audio';
import { EventEmitter } from 'events';

// Create a central event bus for cross-component communication
class FeatureEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to avoid warnings when many components subscribe
    this.setMaxListeners(20);
  }
  
  // Event types
  static EVENTS = {
    CHARACTER_SELECTED: 'character:selected',
    ROOM_JOINED: 'room:joined',
    POSITION_UPDATED: 'position:updated',
    NEARBY_USERS_CHANGED: 'nearby:changed',
    MESSAGE_RECEIVED: 'message:received',
    WEBCAM_TOGGLED: 'webcam:toggled',
    MIC_TOGGLED: 'mic:toggled',
    SCREEN_SHARE_TOGGLED: 'screen:toggled',
    USER_JOINED: 'user:joined',
    USER_LEFT: 'user:left',
    SESSION_RESTORED: 'session:restored',
    OFFICE_ZONE_ENTERED: 'zone:entered',
    OFFICE_ZONE_EXITED: 'zone:exited'
  };
}

// Create singleton instance of event bus
export const eventBus = new FeatureEventBus();

// Feature Integration Service class
class FeatureIntegrationService {
  private static instance: FeatureIntegrationService;
  private userId: string | null = null;
  private username: string | null = null;
  private currentRoomId: string | null = null;
  private currentOfficeId: string | null = null;
  private characterId: string | null = null;
  private presenceRef: any = null;
  private messageListeners: { [key: string]: any } = {};
  private roomListeners: { [key: string]: any } = {};
  private userPositionRef: any = null;
  
  // Make constructor private to enforce singleton pattern
  private constructor() {}
  
  // Get singleton instance
  public static getInstance(): FeatureIntegrationService {
    if (!FeatureIntegrationService.instance) {
      FeatureIntegrationService.instance = new FeatureIntegrationService();
    }
    return FeatureIntegrationService.instance;
  }
  
  // Initialize service with user data
  public initialize(userId: string, username: string, avatar?: string): void {
    this.userId = userId;
    this.username = username;
    this.characterId = avatar || 'adam';
    
    // Set user presence in Firebase
    this.setupUserPresence();
    
    console.log(`Feature Integration Service initialized for user: ${username}`);
    
    // Setup event listeners for global events
    this.setupEventListeners();
  }
  
  // Clean up all listeners and references
  public cleanup(): void {
    // Remove presence listeners
    if (this.presenceRef) {
      off(this.presenceRef);
    }
    
    // Remove message listeners
    Object.values(this.messageListeners).forEach(listener => {
      off(listener);
    });
    
    // Remove room listeners
    Object.values(this.roomListeners).forEach(listener => {
      off(listener);
    });
    
    // Remove position listener
    if (this.userPositionRef) {
      off(this.userPositionRef);
    }
    
    // Clear user presence
    if (this.userId && this.currentRoomId) {
      this.setUserOffline();
    }
    
    console.log('Feature Integration Service cleaned up');
  }
  
  // Set up user presence tracking
  private setupUserPresence(): void {
    if (!this.userId) return;
    
    const userStatusRef = ref(rtdb, `/users/${this.userId}/status`);
    const userStatusFirestoreRef = doc(db, 'users', this.userId);
    
    // Save online status to the Realtime Database
    const isOfflineForDatabase = {
      state: 'offline',
      lastSeen: serverTimestamp(),
    };
    
    const isOnlineForDatabase = {
      state: 'online',
      lastSeen: serverTimestamp(),
    };
    
    // Save online status to Firestore
    const isOfflineForFirestore = {
      status: 'offline',
      lastSeen: Timestamp.now(),
    };
    
    const isOnlineForFirestore = {
      status: 'online',
      lastSeen: Timestamp.now(),
    };
    
    // Create a reference to the special '.info/connected' path in
    // Realtime Database which returns true when connected
    const connectedRef = ref(rtdb, '.info/connected');
    
    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
        // We're not connected
        updateDoc(userStatusFirestoreRef, isOfflineForFirestore);
        return;
      }
      
      // If we disconnect, update the database
      const onDisconnectRef = ref(rtdb, `/users/${this.userId}/status`);
      onValue(onDisconnectRef, () => {
        // The onDisconnect() call sets up a trigger for when the client disconnects
        set(onDisconnectRef, isOfflineForDatabase).then(() => {
          // Now set the user as online
          set(userStatusRef, isOnlineForDatabase);
          
          // Also update Firestore
          updateDoc(userStatusFirestoreRef, isOnlineForFirestore);
        });
      }, { onlyOnce: true });
    });
  }
  
  // Setup global event listeners
  private setupEventListeners(): void {
    // Listen for character selection
    eventBus.on(FeatureEventBus.EVENTS.CHARACTER_SELECTED, (characterId: string) => {
      this.characterId = characterId;
      this.updateUserData({ avatar: characterId });
    });
    
    // Listen for room joining
    eventBus.on(FeatureEventBus.EVENTS.ROOM_JOINED, (roomId: string) => {
      this.joinRoom(roomId);
    });
    
    // Listen for user position updates
    eventBus.on(FeatureEventBus.EVENTS.POSITION_UPDATED, (position: { x: number, y: number }) => {
      this.updateUserPosition(position);
    });
  }
  
  // Join a virtual room
  public joinRoom(roomId: string): void {
    if (!this.userId || !this.username) return;
    
    this.currentRoomId = roomId;
    
    // Reference to room members
    const roomMembersRef = ref(rtdb, `/rooms/${roomId}/members`);
    
    // Add user to room
    const memberData = {
      userId: this.userId,
      username: this.username,
      avatar: this.characterId,
      joinedAt: serverTimestamp(),
      position: { x: 400, y: 300 },
      isWebcamEnabled: false,
      isMicEnabled: false,
      status: 'online',
    };
    
    // Create user node in room
    const userRef = ref(rtdb, `/rooms/${roomId}/members/${this.userId}`);
    set(userRef, memberData);
    
    // Listen for other users in the room
    onValue(roomMembersRef, (snapshot) => {
      const members = snapshot.val();
      if (!members) return;
      
      Object.entries(members).forEach(([memberId, memberData]: [string, any]) => {
        if (memberId !== this.userId) {
          // Add or update connected user in Redux store
          eventBus.emit(FeatureEventBus.EVENTS.USER_JOINED, {
            userId: memberId,
            ...memberData
          });
        }
      });
    });
    
    // Listen for changes to this room
    const roomRef = ref(rtdb, `/rooms/${roomId}`);
    this.roomListeners[roomId] = onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val();
      if (!roomData) return;
      
      // Handle room data updates
      console.log('Room data updated:', roomData);
    });
    
    // Listen for messages in this room
    this.setupMessageListeners(roomId);
    
    // Setup position tracking
    this.userPositionRef = ref(rtdb, `/rooms/${roomId}/members/${this.userId}/position`);
    
    console.log(`Joined room: ${roomId}`);
  }
  
  // Leave current room
  public leaveRoom(): void {
    if (!this.userId || !this.currentRoomId) return;
    
    // Remove user from room
    const userRef = ref(rtdb, `/rooms/${this.currentRoomId}/members/${this.userId}`);
    remove(userRef);
    
    // Clean up listeners
    if (this.roomListeners[this.currentRoomId]) {
      off(this.roomListeners[this.currentRoomId]);
      delete this.roomListeners[this.currentRoomId];
    }
    
    if (this.messageListeners[this.currentRoomId]) {
      off(this.messageListeners[this.currentRoomId]);
      delete this.messageListeners[this.currentRoomId];
    }
    
    this.currentRoomId = null;
    
    console.log('Left room');
  }
  
  // Update user position in virtual space
  public updateUserPosition(position: { x: number, y: number }): void {
    if (!this.userId || !this.currentRoomId) return;
    
    if (this.userPositionRef) {
      // Update position in Firebase
      update(this.userPositionRef, position);
    }
  }
  
  // Update user data
  public updateUserData(data: any): void {
    if (!this.userId) return;
    
    // Update in Firebase RTDB for current room
    if (this.currentRoomId) {
      const userRef = ref(rtdb, `/rooms/${this.currentRoomId}/members/${this.userId}`);
      update(userRef, data);
    }
    
    // Update in Firestore for persistence
    const userDoc = doc(db, 'users', this.userId);
    updateDoc(userDoc, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }
  
  // Set up listeners for chat messages
  private setupMessageListeners(roomId: string): void {
    // Global chat messages
    const globalMessagesRef = ref(rtdb, `/rooms/${roomId}/messages/global`);
    this.messageListeners[`${roomId}_global`] = onValue(globalMessagesRef, (snapshot) => {
      const messages = snapshot.val();
      if (!messages) return;
      
      // Process new messages
      const messageArray = Object.entries(messages).map(([id, data]: [string, any]) => ({
        id,
        ...data
      }));
      
      // Sort by timestamp
      messageArray.sort((a, b) => a.timestamp - b.timestamp);
      
      // Dispatch newest message that we haven't seen yet
      const latestMessage = messageArray[messageArray.length - 1];
      if (latestMessage && latestMessage.userId !== this.userId) {
        eventBus.emit(FeatureEventBus.EVENTS.MESSAGE_RECEIVED, {
          ...latestMessage,
          type: 'global'
        });
      }
    });
    
    // Proximity chat messages - these are handled differently
    // since they depend on user location, so we listen to all messages
    // and filter based on proximity in the UI
    const proximityMessagesRef = ref(rtdb, `/rooms/${roomId}/messages/proximity`);
    this.messageListeners[`${roomId}_proximity`] = onValue(proximityMessagesRef, (snapshot) => {
      const messages = snapshot.val();
      if (!messages) return;
      
      // Process new messages
      const messageArray = Object.entries(messages).map(([id, data]: [string, any]) => ({
        id,
        ...data
      }));
      
      // Sort by timestamp
      messageArray.sort((a, b) => a.timestamp - b.timestamp);
      
      // Dispatch newest message that we haven't seen yet
      const latestMessage = messageArray[messageArray.length - 1];
      if (latestMessage && latestMessage.userId !== this.userId) {
        eventBus.emit(FeatureEventBus.EVENTS.MESSAGE_RECEIVED, {
          ...latestMessage,
          type: 'office'
        });
      }
    });
  }
  
  // Send a message
  public sendMessage(message: string, type: 'global' | 'office'): void {
    if (!this.userId || !this.username || !this.currentRoomId) return;
    
    const timestamp = Date.now();
    
    // Create base message data
    const messageData = {
      userId: this.userId,
      username: this.username,
      message,
      timestamp,
      avatar: this.characterId,
      type: type === 'global' ? 'global' : 'office'
    };
    
    // For office chat, we need to include user's position for proximity calculation
    if (type === 'office') {
      // Get current position from Realtime DB
      const positionRef = ref(rtdb, `/rooms/${this.currentRoomId}/members/${this.userId}/position`);
      onValue(positionRef, (snapshot) => {
        const position = snapshot.val();
        if (!position) {
          console.error('No position data found for user');
          return;
        }
        
        // Add position data to the message
        const messageWithPosition = {
          ...messageData,
          position: position
        };
        
        // Save to proximity messages collection
        const messageListRef = ref(rtdb, `/rooms/${this.currentRoomId}/messages/proximity`);
        push(messageListRef, messageWithPosition);
        
        // Update chat metrics
        this.updateChatMetrics(type);
        
        console.log(`Sent proximity message at position (${position.x}, ${position.y}): ${message}`);
      }, { onlyOnce: true });
    } else {
      // For global messages, no position needed
      const messageListRef = ref(rtdb, `/rooms/${this.currentRoomId}/messages/global`);
      push(messageListRef, messageData);
      
      // Update chat metrics
      this.updateChatMetrics(type);
      
      console.log(`Sent global message: ${message}`);
    }
  }
  
  // Update chat metrics for analytics
  private updateChatMetrics(type: 'global' | 'office'): void {
    if (!this.userId || !this.currentRoomId) return;
    
    const metricsRef = ref(rtdb, `/chatMetrics/${this.currentRoomId}`);
    
    // Get current message count
    onValue(metricsRef, (snapshot) => {
      const metrics = snapshot.val() || {};
      const currentCount = metrics.messageCount || 0;
      const updates = {
        messageCount: currentCount + 1,
        lastActive: serverTimestamp(),
        [`activeUsers/${this.userId}/lastMessage`]: serverTimestamp()
      };
      
      // Update metrics
      update(metricsRef, updates);
    }, { onlyOnce: true });
  }
  
  // Set user offline
  private setUserOffline(): void {
    if (!this.userId) return;
    
    // Update Realtime DB
    if (this.currentRoomId) {
      const userRef = ref(rtdb, `/rooms/${this.currentRoomId}/members/${this.userId}/status`);
      set(userRef, 'offline');
    }
    
    // Update Firestore
    const userStatusRef = doc(db, 'users', this.userId);
    updateDoc(userStatusRef, {
      status: 'offline',
      lastSeen: Timestamp.now()
    });
    
    console.log('User set to offline');
  }
  
  // Persist session data for later restoration
  public persistSession(): void {
    if (!this.userId || !this.currentRoomId) return;
    
    const sessionData = {
      roomId: this.currentRoomId,
      characterId: this.characterId || 'adam',
      position: null // Will be fetched from the database
    };
    
    // Get current position from database
    const positionRef = ref(rtdb, `/rooms/${this.currentRoomId}/members/${this.userId}/position`);
    onValue(positionRef, (snapshot) => {
      const position = snapshot.val();
      if (position) {
        sessionData.position = position;
        
        // Save session data to Firestore for persistence
        // Make sure userId is definitely a string
        if (typeof this.userId === 'string') {
          const userDocRef = doc(db, 'users', this.userId);
          const sessionsCollectionRef = doc(userDocRef, 'sessions', 'lastSession');
          
          setDoc(sessionsCollectionRef, {
            ...sessionData,
            savedAt: Timestamp.now()
          });
          
          console.log('Session persisted');
        }
      }
    }, { onlyOnce: true });
  }
  
  // Restore previous session
  public async restoreSession(): Promise<{ roomId: string, characterId: string, position: { x: number, y: number } } | null> {
    if (!this.userId || typeof this.userId !== 'string') return null;
    
    try {
      // Get last session from Firestore
      const userDocRef = doc(db, 'users', this.userId);
      const sessionRef = doc(userDocRef, 'sessions', 'lastSession');
      const sessionSnapshot = await getDoc(sessionRef);
      
      if (sessionSnapshot.exists()) {
        const sessionData = sessionSnapshot.data();
        console.log('Session restored', sessionData);
        
        // Emit event for session restored
        eventBus.emit(FeatureEventBus.EVENTS.SESSION_RESTORED, sessionData);
        
        return {
          roomId: sessionData.roomId,
          characterId: sessionData.characterId,
          position: sessionData.position
        };
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
    
    return null;
  }
  
  // Track office zone entry/exit
  public trackZoneMovement(zoneId: string, entered: boolean): void {
    if (!this.userId || !this.currentRoomId) return;
    
    // Update user's current zone in Firebase
    const userZoneRef = ref(rtdb, `/rooms/${this.currentRoomId}/members/${this.userId}/currentZone`);
    if (entered) {
      set(userZoneRef, zoneId);
      eventBus.emit(FeatureEventBus.EVENTS.OFFICE_ZONE_ENTERED, zoneId);
    } else {
      set(userZoneRef, null);
      eventBus.emit(FeatureEventBus.EVENTS.OFFICE_ZONE_EXITED, zoneId);
    }
    
    // Log zone activity for analytics
    const zoneActivityRef = ref(rtdb, `/rooms/${this.currentRoomId}/zoneActivity/${zoneId}`);
    const activityData = {
      userId: this.userId,
      username: this.username,
      action: entered ? 'entered' : 'exited',
      timestamp: serverTimestamp()
    };
    push(zoneActivityRef, activityData);
  }
}

// Export singleton instance
export const featureIntegration = FeatureIntegrationService.getInstance();
export default featureIntegration;