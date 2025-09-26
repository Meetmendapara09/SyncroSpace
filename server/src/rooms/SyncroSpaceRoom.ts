import { Room, Client } from "colyseus";
import { SyncroSpaceRoomState, Player, ChatMessage, OfficeNames } from "./schema/SyncroSpaceRoomState";

export class SyncroSpaceRoom extends Room<SyncroSpaceRoomState> {
  private roomPassword: string | null = null;
  private hasPassword: boolean = false;
  private maxPlayers: number = 50;

  /** Helper method to get the appropriate state properties for each office */
  private getOfficeData(officeName: OfficeNames) {
    const officeMap = {
      "conference-a": {
        members: this.state.conferenceAMembers,
        chat: this.state.conferenceAChat,
        displayName: "Conference Room A"
      },
      "brainstorm": {
        members: this.state.brainstormMembers,
        chat: this.state.brainstormChat,
        displayName: "Brainstorm Zone"
      },
      "collaboration": {
        members: this.state.collaborationMembers,
        chat: this.state.collaborationChat,
        displayName: "Collaboration Hub"
      },
      "coffee": {
        members: this.state.coffeeMembers,
        chat: this.state.coffeeChat,
        displayName: "Coffee Corner"
      },
      "quiet-work": {
        members: this.state.quietWorkMembers,
        chat: this.state.quietWorkChat,
        displayName: "Quiet Work Area"
      },
      "presentation": {
        members: this.state.presentationMembers,
        chat: this.state.presentationChat,
        displayName: "Presentation Stage"
      }
    };

    return officeMap[officeName];
  }

  /** Helper method to get user's current office, used when user leaves */
  private getUserCurrentOffice(sessionId: string): OfficeNames | null {
    const offices: OfficeNames[] = ["conference-a", "brainstorm", "collaboration", "coffee", "quiet-work", "presentation"];
    
    for (const office of offices) {
      const { members } = this.getOfficeData(office);
      if (members.has(sessionId)) {
        return office;
      }
    }
    
    return null;
  }

  /** Handle player joining an office zone */
  private handleOfficeJoin(client: Client, username: string, officeName: OfficeNames) {
    const sessionId = client.sessionId;
    const { members, chat, displayName } = this.getOfficeData(officeName);

    // Add user to office members
    members.set(sessionId, username);

    // Create join message
    const joinMessage = new ChatMessage();
    joinMessage.id = `${sessionId}-${Date.now()}`;
    joinMessage.username = username;
    joinMessage.message = `Joined ${displayName}`;
    joinMessage.type = "PLAYER_JOINED";
    joinMessage.timestamp = Date.now();
    joinMessage.office = officeName;

    chat.push(joinMessage);

    // Update player's current office
    const player = this.state.players.get(sessionId);
    if (player) {
      player.currentOffice = officeName;
    }

    // Send office chat history to new member
    client.send("GET_OFFICE_CHAT", { office: officeName, messages: chat });

    // Notify other office members
    members.forEach((_, memberId) => {
      if (memberId !== sessionId) {
        this.clients.getById(memberId)?.send("USER_JOINED_OFFICE", {
          playerSessionId: sessionId,
          username,
          office: officeName,
          message: joinMessage.message,
          type: joinMessage.type
        });
      }
    });

    console.log(`${username} joined ${displayName} (${members.size} members)`);
  }

  /** Handle player leaving an office zone */
  private handleOfficeLeave(client: Client, username: string, officeName: OfficeNames) {
    const sessionId = client.sessionId;
    const { members, chat, displayName } = this.getOfficeData(officeName);

    if (!members.has(sessionId)) return;

    // Remove from office members
    members.delete(sessionId);

    // Create leave message
    const leaveMessage = new ChatMessage();
    leaveMessage.id = `${sessionId}-${Date.now()}`;
    leaveMessage.username = username;
    leaveMessage.message = `Left ${displayName}`;
    leaveMessage.type = "PLAYER_LEFT";
    leaveMessage.timestamp = Date.now();
    leaveMessage.office = officeName;

    chat.push(leaveMessage);

    // Update player's current office
    const player = this.state.players.get(sessionId);
    if (player) {
      player.currentOffice = "";
    }

    // Notify remaining office members
    members.forEach((_, memberId) => {
      this.clients.getById(memberId)?.send("PLAYER_LEFT_OFFICE", {
        playerSessionId: sessionId,
        username,
        office: officeName,
        message: leaveMessage.message,
        type: leaveMessage.type
      });
    });

    console.log(`${username} left ${displayName} (${members.size} members remaining)`);
  }

  /** Calculate distance between two players for proximity audio */
  private calculateDistance(player1: Player, player2: Player): number {
    const dx = player1.x - player2.x;
    const dy = player1.y - player2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Update proximity data for spatial audio */
  private updateProximityData() {
    const proximityThreshold = 150; // Same as client-side
    
    this.state.players.forEach((player1, sessionId1) => {
      const nearbyPlayers: { id: string; distance: number; volume: number }[] = [];
      
      this.state.players.forEach((player2, sessionId2) => {
        if (sessionId1 !== sessionId2) {
          const distance = this.calculateDistance(player1, player2);
          
          if (distance <= proximityThreshold) {
            const volume = Math.max(0, 1 - (distance / proximityThreshold));
            nearbyPlayers.push({
              id: sessionId2,
              distance,
              volume
            });
          }
        }
      });
      
      // Send proximity data to client
      this.clients.getById(sessionId1)?.send("PROXIMITY_UPDATE", {
        nearbyPlayers,
        proximityThreshold
      });
    });
  }

  // Room lifecycle methods
  onAuth(client: Client, options: { roomName?: string; password?: string | null }) {
    if (!this.roomPassword) return true;
    return this.roomPassword === options.password;
  }

  onCreate(options: { name?: string; password?: string | null; maxPlayers?: number }) {
    console.log("SyncroSpace room created with options:", options);
    
    this.setState(new SyncroSpaceRoomState());
    
    // Set room properties
    this.state.roomName = options.name || "SyncroSpace Office";
    this.roomPassword = options.password || null;
    this.hasPassword = !!options.password;
    this.maxPlayers = options.maxPlayers || 50;
    this.state.hasPassword = this.hasPassword;
    this.state.maxPlayers = this.maxPlayers;
    
    this.setMetadata({ 
      name: this.state.roomName, 
      hasPassword: this.hasPassword,
      players: 0,
      maxPlayers: this.maxPlayers
    });

    // Set up message handlers
    this.setupMessageHandlers();
    
    // Start proximity updates
    this.clock.setInterval(() => {
      this.updateProximityData();
    }, 100); // Update every 100ms
  }

  private setupMessageHandlers() {
    // Player movement and state updates
    this.onMessage("UPDATE_PLAYER", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (data.x !== undefined) player.x = data.x;
      if (data.y !== undefined) player.y = data.y;
      if (data.anim !== undefined) player.anim = data.anim;
      
      // Status updates
      if (data.status) {
        if (data.status.isMicOn !== undefined) player.isMicOn = data.status.isMicOn;
        if (data.status.isWebcamOn !== undefined) player.isWebcamOn = data.status.isWebcamOn;
        if (data.status.isDisconnected !== undefined) player.isDisconnected = data.status.isDisconnected;
        if (data.status.status !== undefined) player.status = data.status.status;
      }
    });

    // Office management
    this.onMessage("JOIN_OFFICE", (client, data) => {
      const { username, office } = data;
      if (office && this.getOfficeData(office as OfficeNames)) {
        this.handleOfficeJoin(client, username, office as OfficeNames);
      }
    });

    this.onMessage("LEAVE_OFFICE", (client, data) => {
      const { username, office } = data;
      if (office && this.getOfficeData(office as OfficeNames)) {
        this.handleOfficeLeave(client, username, office as OfficeNames);
      }
    });

    // Chat messages
    this.onMessage("SEND_GLOBAL_MESSAGE", (client, data) => {
      const { username, message } = data;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const chatMessage = new ChatMessage();
      chatMessage.id = `global-${client.sessionId}-${Date.now()}`;
      chatMessage.username = username;
      chatMessage.message = message;
      chatMessage.type = "REGULAR_MESSAGE";
      chatMessage.timestamp = Date.now();

      this.state.globalChat.push(chatMessage);
      
      this.broadcast("NEW_GLOBAL_MESSAGE", {
        id: chatMessage.id,
        username,
        message,
        type: chatMessage.type,
        timestamp: chatMessage.timestamp
      });
    });

    this.onMessage("SEND_OFFICE_MESSAGE", (client, data) => {
      const { username, message, office } = data;
      const officeData = this.getOfficeData(office as OfficeNames);
      if (!officeData) return;

      const chatMessage = new ChatMessage();
      chatMessage.id = `${office}-${client.sessionId}-${Date.now()}`;
      chatMessage.username = username;
      chatMessage.message = message;
      chatMessage.type = "REGULAR_MESSAGE";
      chatMessage.timestamp = Date.now();
      chatMessage.office = office;

      officeData.chat.push(chatMessage);

      // Send to all office members
      officeData.members.forEach((_, memberId) => {
        this.clients.getById(memberId)?.send("NEW_OFFICE_MESSAGE", {
          id: chatMessage.id,
          username,
          message,
          type: chatMessage.type,
          timestamp: chatMessage.timestamp,
          office
        });
      });
    });

    // WebRTC signaling for video calls
    this.onMessage("CONNECT_TO_VIDEO_CALL", (client, targetSessionId) => {
      this.clients.getById(targetSessionId)?.send("INCOMING_VIDEO_CALL", client.sessionId);
    });

    this.onMessage("END_VIDEO_CALL", (client, targetSessionId) => {
      this.clients.getById(targetSessionId)?.send("VIDEO_CALL_ENDED", client.sessionId);
    });

    // Office-based video calls
    this.onMessage("CONNECT_TO_OFFICE_VIDEO_CALL", (client, officeName) => {
      const officeData = this.getOfficeData(officeName as OfficeNames);
      if (!officeData) return;

      officeData.members.forEach((_, memberId) => {
        if (memberId !== client.sessionId) {
          this.clients.getById(memberId)?.send("INCOMING_VIDEO_CALL", client.sessionId);
        }
      });
    });

    // Proximity-based video calls
    this.onMessage("CONNECT_TO_PROXIMITY_VIDEO_CALL", (client, nearbyPlayerIds) => {
      nearbyPlayerIds.forEach((playerId: string) => {
        this.clients.getById(playerId)?.send("INCOMING_VIDEO_CALL", client.sessionId);
      });
    });

    // Screen sharing
    this.onMessage("START_SCREEN_SHARE", (client, data) => {
      const { office, targetUsers } = data;
      const targets = targetUsers || [];
      
      targets.forEach((targetId: string) => {
        this.clients.getById(targetId)?.send("SCREEN_SHARE_STARTED", {
          fromUser: client.sessionId,
          office
        });
      });
    });

    this.onMessage("STOP_SCREEN_SHARE", (client, data) => {
      const { office, targetUsers } = data;
      const targets = targetUsers || [];
      
      targets.forEach((targetId: string) => {
        this.clients.getById(targetId)?.send("SCREEN_SHARE_STOPPED", {
          fromUser: client.sessionId,
          office
        });
      });
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`${options.username} joined the room (${client.sessionId})`);
    
    // Create new player
    const player = new Player();
    player.username = options.username || "Anonymous";
    player.avatar = options.avatar || "adam";
    player.x = options.x || 400;
    player.y = options.y || 300;
    player.anim = `${player.avatar}_idle`;
    player.isMicOn = options.isMicOn || false;
    player.isWebcamOn = options.isWebcamOn || false;
    player.status = "online";

    this.state.players.set(client.sessionId, player);

    // Send welcome message to global chat
    const welcomeMessage = new ChatMessage();
    welcomeMessage.id = `welcome-${client.sessionId}-${Date.now()}`;
    welcomeMessage.username = player.username;
    welcomeMessage.message = "Joined the virtual office!";
    welcomeMessage.type = "PLAYER_JOINED";
    welcomeMessage.timestamp = Date.now();

    this.state.globalChat.push(welcomeMessage);

    // Notify all other players
    this.broadcast("NEW_GLOBAL_MESSAGE", {
      id: welcomeMessage.id,
      username: player.username,
      message: welcomeMessage.message,
      type: welcomeMessage.type,
      timestamp: welcomeMessage.timestamp
    }, { except: [client] });

    // Send chat history to new player
    client.send("GET_GLOBAL_CHAT", this.state.globalChat);

    // Update metadata
    this.setMetadata({ 
      name: this.state.roomName, 
      hasPassword: this.hasPassword,
      players: this.state.players.size,
      maxPlayers: this.maxPlayers
    });
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`${player.username} left the room (${client.sessionId})`);

    // Handle office leave if player was in an office
    const currentOffice = this.getUserCurrentOffice(client.sessionId);
    if (currentOffice) {
      this.handleOfficeLeave(client, player.username, currentOffice);
    }

    // Send leave message to global chat
    const leaveMessage = new ChatMessage();
    leaveMessage.id = `leave-${client.sessionId}-${Date.now()}`;
    leaveMessage.username = player.username;
    leaveMessage.message = "Left the virtual office";
    leaveMessage.type = "PLAYER_LEFT";
    leaveMessage.timestamp = Date.now();

    this.state.globalChat.push(leaveMessage);

    // Remove player from state
    this.state.players.delete(client.sessionId);

    // Notify remaining players
    this.broadcast("NEW_GLOBAL_MESSAGE", {
      id: leaveMessage.id,
      username: player.username,
      message: leaveMessage.message,
      type: leaveMessage.type,
      timestamp: leaveMessage.timestamp
    });

    // Update metadata
    this.setMetadata({ 
      name: this.state.roomName, 
      hasPassword: this.hasPassword,
      players: this.state.players.size,
      maxPlayers: this.maxPlayers
    });
  }

  onDispose() {
    console.log(`SyncroSpace room "${this.state.roomName}" disposed`);
  }
}