import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// Fix for TypeScript decorators
declare const type: any;

// Message types for chat system
type MessageType = "PLAYER_JOINED" | "PLAYER_LEFT" | "REGULAR_MESSAGE" | "SYSTEM_MESSAGE";

// Office zones available in SyncroSpace
export type OfficeNames = 
  | "conference-a"
  | "brainstorm" 
  | "collaboration"
  | "coffee"
  | "quiet-work"
  | "presentation";

// Player schema - represents each user in the virtual office
export class Player extends Schema {
  @type("number") x: number = 400;
  @type("number") y: number = 300;
  @type("string") username: string = "";
  @type("string") avatar: string = "adam"; // Character selection (adam, ash, lucy, nancy)
  @type("string") anim: string = "idle"; // Current animation state
  @type("boolean") isMicOn: boolean = false;
  @type("boolean") isWebcamOn: boolean = false;
  @type("boolean") isDisconnected: boolean = false;
  @type("string") status: string = "online"; // online, away, busy, offline
  @type("string") currentOffice: string = ""; // Current office zone
}

// Chat message schema for both office and global chats
export class ChatMessage extends Schema {
  @type("string") id: string = "";
  @type("string") username: string = "";
  @type("string") message: string = "";
  @type("string") type: MessageType = "REGULAR_MESSAGE";
  @type("number") timestamp: number = Date.now();
  @type("string") office?: string; // Office name for office-specific messages
}

// Proximity data for spatial audio
export class ProximityData extends Schema {
  @type("string") playerId: string = "";
  @type("number") distance: number = 0;
  @type("number") volume: number = 0;
}

// Main room state - manages all players and office zones
export class SyncroSpaceRoomState extends Schema {
  // Core player management
  @type({ map: Player }) players = new MapSchema<Player>();
  
  // Global chat for entire office
  @type([ChatMessage]) globalChat = new ArraySchema<ChatMessage>();
  
  // Office-specific members and chats (based on our 6 office zones)
  // Conference Room A
  @type({ map: "string" }) conferenceAMembers = new MapSchema<string>();
  @type([ChatMessage]) conferenceAChat = new ArraySchema<ChatMessage>();
  
  // Brainstorm Zone  
  @type({ map: "string" }) brainstormMembers = new MapSchema<string>();
  @type([ChatMessage]) brainstormChat = new ArraySchema<ChatMessage>();
  
  // Collaboration Hub
  @type({ map: "string" }) collaborationMembers = new MapSchema<string>();
  @type([ChatMessage]) collaborationChat = new ArraySchema<ChatMessage>();
  
  // Coffee Corner
  @type({ map: "string" }) coffeeMembers = new MapSchema<string>();
  @type([ChatMessage]) coffeeChat = new ArraySchema<ChatMessage>();
  
  // Quiet Work Area
  @type({ map: "string" }) quietWorkMembers = new MapSchema<string>();
  @type([ChatMessage]) quietWorkChat = new ArraySchema<ChatMessage>();
  
  // Presentation Stage
  @type({ map: "string" }) presentationMembers = new MapSchema<string>();
  @type([ChatMessage]) presentationChat = new ArraySchema<ChatMessage>();
  
  // Proximity data for spatial audio
  @type({ map: ProximityData }) proximityData = new MapSchema<ProximityData>();
  
  // Room metadata
  @type("string") roomName: string = "";
  @type("boolean") hasPassword: boolean = false;
  @type("number") maxPlayers: number = 50;
  @type("number") createdAt: number = Date.now();
}