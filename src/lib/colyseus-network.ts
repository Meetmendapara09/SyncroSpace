import { Client, Room } from 'colyseus.js';
import store from '@/lib/redux/store';
import { 
  setPlayerPosition,
  setCurrentOffice
} from '@/lib/redux/features/room/roomSlice';
import {
  addMessage
} from '@/lib/redux/features/chat/chatSlice';
import { multiplayerDb, createQuickMultiplayerSession, joinMultiplayerSession } from './multiplayer-database';

// Server configuration
const SERVER_URL = process.env.NODE_ENV === 'production' 
  ? 'wss://your-server.com' 
  : 'ws://localhost:2567';

// Office zone types matching our server
export type OfficeNames = 
  | "conference-a"
  | "brainstorm" 
  | "collaboration"
  | "coffee"
  | "quiet-work"
  | "presentation";

// Player interface matching server schema
interface Player {
  x: number;
  y: number;
  username: string;
  avatar: string;
  anim: string;
  isMicOn: boolean;
  isWebcamOn: boolean;
  isDisconnected: boolean;
  status: string;
  currentOffice: string;
}

// Chat message interface
interface ChatMessage {
  id: string;
  username: string;
  message: string;
  type: string;
  timestamp: number;
  office?: string;
}

export class ColyseusNetworkManager {
  private client: Client;
  private room: Room | null = null;
  private lobbyRoom: Room | null = null;
  private isConnected = false;
  private currentFirebaseSessionId: string | null = null;

  constructor() {
    this.client = new Client(SERVER_URL);
  }

  // Connect to lobby for room discovery
  async joinLobby() {
    try {
      this.lobbyRoom = await this.client.joinOrCreate("LOBBY_ROOM");
      console.log("✅ Connected to lobby");
      return true;
    } catch (error) {
      console.error("❌ Failed to join lobby:", error);
      return false;
    }
  }

  // Join or create a public room
  async joinPublicRoom(options: {
    username: string;
    avatar: string;
    isMicOn?: boolean;
    isWebcamOn?: boolean;
    userId?: string;
  }) {
    try {
      console.log("🔗 Joining public room...", options);
      
      // Create Firebase session
      if (options.userId) {
        this.currentFirebaseSessionId = await createQuickMultiplayerSession(
          options.userId,
          options.username,
          `Public Room - ${Date.now()}`,
          true
        );
      }
      
      this.room = await this.client.joinOrCreate("PUBLIC_ROOM", {
        username: options.username,
        avatar: options.avatar,
        isMicOn: options.isMicOn || false,
        isWebcamOn: options.isWebcamOn || false,
        x: 400,
        y: 300
      });

      // Update Firebase with Colyseus room ID
      if (this.currentFirebaseSessionId) {
        await multiplayerDb.updateMultiplayerSession(this.currentFirebaseSessionId, {
          colyseusRoomId: this.room.roomId
        });

        // Add user as participant
        if (options.userId) {
          await joinMultiplayerSession(
            this.currentFirebaseSessionId,
            options.userId,
            options.username,
            options.avatar
          );
        }
      }

      await this.setupRoomHandlers();
      this.isConnected = true;
      
      console.log("✅ Successfully joined public room!");
      return true;
    } catch (error) {
      console.error("❌ Failed to join public room:", error);
      return false;
    }
  }

  // Create a private room
  async createPrivateRoom(options: {
    roomName: string;
    password?: string;
    username: string;
    avatar: string;
    maxPlayers?: number;
    isMicOn?: boolean;
    isWebcamOn?: boolean;
  }) {
    try {
      console.log("🏠 Creating private room...", options.roomName);
      
      this.room = await this.client.create("PRIVATE_ROOM", {
        name: options.roomName,
        password: options.password || null,
        maxPlayers: options.maxPlayers || 50,
        username: options.username,
        avatar: options.avatar,
        isMicOn: options.isMicOn || false,
        isWebcamOn: options.isWebcamOn || false,
        x: 400,
        y: 300
      });

      await this.setupRoomHandlers();
      this.isConnected = true;
      
      console.log("✅ Successfully created private room!");
      return true;
    } catch (error) {
      console.error("❌ Failed to create private room:", error);
      return false;
    }
  }

  // Join existing private room
  async joinPrivateRoom(options: {
    roomId: string;
    password?: string;
    username: string;
    avatar: string;
    isMicOn?: boolean;
    isWebcamOn?: boolean;
  }) {
    try {
      console.log("🚪 Joining private room...", options.roomId);
      
      this.room = await this.client.joinById(options.roomId, {
        password: options.password || null,
        username: options.username,
        avatar: options.avatar,
        isMicOn: options.isMicOn || false,
        isWebcamOn: options.isWebcamOn || false,
        x: 400,
        y: 300
      });

      await this.setupRoomHandlers();
      this.isConnected = true;
      
      console.log("✅ Successfully joined private room!");
      return true;
    } catch (error) {
      console.error("❌ Failed to join private room:", error);
      return false;
    }
  }

  // Set up room event handlers
  private async setupRoomHandlers() {
    if (!this.room) return;

    // Player state changes
    this.room.state.players.onAdd((player: Player, sessionId: string) => {
      console.log("👤 Player joined:", player.username);
      
      // For now, we'll add basic player tracking
      // You can extend this to dispatch to your user slice
    });

    this.room.state.players.onChange((player: Player, sessionId: string) => {
      // Update player state - can be extended to dispatch Redux actions
      console.log("👤 Player updated:", player.username, player.x, player.y);
    });

    this.room.state.players.onRemove((player: Player, sessionId: string) => {
      console.log("👋 Player left:", player.username);
      // Remove player from state
    });

    // Chat messages
    this.room.state.globalChat.onAdd((message: ChatMessage) => {
      store.dispatch(addMessage({
        id: message.id,
        userId: message.username, // Using username as userId for now
        username: message.username,
        message: message.message,
        timestamp: message.timestamp,
        type: 'global' as any
      }));
    });

    // Server messages
    this.room.onMessage("NEW_GLOBAL_MESSAGE", (data) => {
      store.dispatch(addMessage({
        id: data.id,
        userId: data.username,
        username: data.username,
        message: data.message,
        timestamp: data.timestamp,
        type: 'global' as any
      }));
    });

    this.room.onMessage("NEW_OFFICE_MESSAGE", (data) => {
      store.dispatch(addMessage({
        id: data.id,
        userId: data.username,
        username: data.username,
        message: data.message,
        timestamp: data.timestamp,
        type: 'office' as any
      }));
    });

    this.room.onMessage("GET_GLOBAL_CHAT", (messages) => {
      messages.forEach((msg: ChatMessage) => {
        store.dispatch(addMessage({
          id: msg.id,
          userId: msg.username,
          username: msg.username,
          message: msg.message,
          timestamp: msg.timestamp,
          type: 'global' as any
        }));
      });
    });

    this.room.onMessage("GET_OFFICE_CHAT", (data) => {
      const { office, messages } = data;
      messages.forEach((msg: ChatMessage) => {
        store.dispatch(addMessage({
          id: msg.id,
          userId: msg.username,
          username: msg.username,
          message: msg.message,
          timestamp: msg.timestamp,
          type: 'office' as any
        }));
      });
    });

    // Office events
    this.room.onMessage("USER_JOINED_OFFICE", (data) => {
      console.log(`🏢 ${data.username} joined ${data.office}`);
    });

    this.room.onMessage("PLAYER_LEFT_OFFICE", (data) => {
      console.log(`🚪 ${data.username} left ${data.office}`);
    });

    // Video call events
    this.room.onMessage("INCOMING_VIDEO_CALL", (fromSessionId) => {
      console.log("📞 Incoming video call from:", fromSessionId);
      // Handle incoming video call - integrate with existing video calling system
    });

    this.room.onMessage("VIDEO_CALL_ENDED", (fromSessionId) => {
      console.log("📞 Video call ended with:", fromSessionId);
    });

    // Proximity updates for spatial audio
    this.room.onMessage("PROXIMITY_UPDATE", (data) => {
      // Handle proximity data for spatial audio
      const { nearbyPlayers, proximityThreshold } = data;
      // Integrate with existing proximity audio system
    });

    // Screen sharing events
    this.room.onMessage("SCREEN_SHARE_STARTED", (data) => {
      console.log("🖥️ Screen share started by:", data.fromUser);
    });

    this.room.onMessage("SCREEN_SHARE_STOPPED", (data) => {
      console.log("🖥️ Screen share stopped by:", data.fromUser);
    });

    // Connection events
    this.room.onLeave((code) => {
      console.log("🔌 Left room with code:", code);
      this.isConnected = false;
    });

    this.room.onError((code, message) => {
      console.error("💥 Room error:", code, message);
      this.isConnected = false;
    });
  }

  // Player actions
  updatePlayerPosition(x: number, y: number, anim?: string) {
    if (!this.room || !this.isConnected) return;

    this.room.send("UPDATE_PLAYER", {
      x,
      y,
      anim: anim || "idle"
    });

    // Update local Redux state
    store.dispatch(setPlayerPosition({ x, y }));
  }

  updatePlayerStatus(status: {
    isMicOn?: boolean;
    isWebcamOn?: boolean;
    status?: "online" | "away" | "busy" | "offline";
  }) {
    if (!this.room || !this.isConnected) return;

    this.room.send("UPDATE_PLAYER", {
      status
    });
  }

  // Office management
  joinOffice(office: OfficeNames, username: string) {
    if (!this.room || !this.isConnected) return;

    console.log(`🏢 Joining office: ${office}`);
    this.room.send("JOIN_OFFICE", { username, office });
    store.dispatch(setCurrentOffice(office));
  }

  leaveOffice(office: OfficeNames, username: string) {
    if (!this.room || !this.isConnected) return;

    console.log(`🚪 Leaving office: ${office}`);
    this.room.send("LEAVE_OFFICE", { username, office });
    store.dispatch(setCurrentOffice(""));
  }

  // Chat messaging
  sendGlobalMessage(username: string, message: string) {
    if (!this.room || !this.isConnected) return;

    this.room.send("SEND_GLOBAL_MESSAGE", { username, message });
    
    // Also save to Firebase if session exists
    if (this.currentFirebaseSessionId) {
      multiplayerDb.addChatMessage(this.currentFirebaseSessionId, {
        userId: username, // Should use actual userId
        username,
        message,
        type: 'global'
      });
    }
  }

  sendOfficeMessage(username: string, message: string, office: OfficeNames) {
    if (!this.room || !this.isConnected) return;

    this.room.send("SEND_OFFICE_MESSAGE", { username, message, office });
    
    // Also save to Firebase if session exists
    if (this.currentFirebaseSessionId) {
      multiplayerDb.addChatMessage(this.currentFirebaseSessionId, {
        userId: username, // Should use actual userId
        username,
        message,
        type: 'office',
        office
      });
    }
  }

  // Video calling
  connectToVideoCall(targetSessionId: string) {
    if (!this.room || !this.isConnected) return;

    this.room.send("CONNECT_TO_VIDEO_CALL", targetSessionId);
  }

  endVideoCall(targetSessionId: string) {
    if (!this.room || !this.isConnected) return;

    this.room.send("END_VIDEO_CALL", targetSessionId);
  }

  connectToOfficeVideoCall(officeName: OfficeNames) {
    if (!this.room || !this.isConnected) return;

    this.room.send("CONNECT_TO_OFFICE_VIDEO_CALL", officeName);
  }

  connectToProximityVideoCall(nearbyPlayerIds: string[]) {
    if (!this.room || !this.isConnected) return;

    this.room.send("CONNECT_TO_PROXIMITY_VIDEO_CALL", nearbyPlayerIds);
  }

  // Screen sharing
  startScreenShare(office?: OfficeNames, targetUsers?: string[]) {
    if (!this.room || !this.isConnected) return;

    this.room.send("START_SCREEN_SHARE", { office, targetUsers });
  }

  stopScreenShare(office?: OfficeNames, targetUsers?: string[]) {
    if (!this.room || !this.isConnected) return;

    this.room.send("STOP_SCREEN_SHARE", { office, targetUsers });
  }

  // Utility methods
  isRoomConnected(): boolean {
    return this.isConnected && this.room !== null;
  }

  getRoomId(): string | null {
    return this.room?.roomId || null;
  }

  getSessionId(): string | null {
    return this.room?.sessionId || null;
  }

  getCurrentPlayers(): Player[] {
    if (!this.room) return [];
    
    const players: Player[] = [];
    this.room.state.players.forEach((player: Player) => {
      players.push(player);
    });
    
    return players;
  }

  // Cleanup
  async disconnect() {
    try {
      if (this.room) {
        await this.room.leave();
        this.room = null;
      }
      
      if (this.lobbyRoom) {
        await this.lobbyRoom.leave();
        this.lobbyRoom = null;
      }
      
      this.isConnected = false;
      console.log("👋 Disconnected from server");
    } catch (error) {
      console.error("❌ Error during disconnect:", error);
    }
  }
}

// Singleton instance
export const networkManager = new ColyseusNetworkManager();