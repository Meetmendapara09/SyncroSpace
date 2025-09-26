# SyncroSpace Multiplayer Server

A real-time multiplayer server built with **Colyseus** and **PeerJS** for the SyncroSpace virtual office platform. This server handles real-time synchronization, proximity-based audio, office zone management, and video calling infrastructure.

## 🎯 Features

### **Real-Time Multiplayer**
- ✅ Player position synchronization 
- ✅ Character animation states (idle, walking)
- ✅ Avatar selection (Adam, Ash, Lucy, Nancy)
- ✅ Status updates (mic, camera, online status)

### **Office Zone Management**
- ✅ 6 Office Zones: Conference Room A, Brainstorm Zone, Collaboration Hub, Coffee Corner, Quiet Work Area, Presentation Stage
- ✅ Zone-based chat systems
- ✅ Join/leave notifications
- ✅ Member tracking per zone

### **Communication Systems**
- ✅ Global chat for entire office
- ✅ Office-specific chat channels
- ✅ Real-time message delivery
- ✅ Message history and persistence

### **Proximity Features**
- ✅ Spatial audio calculations
- ✅ Distance-based volume control
- ✅ Nearby player detection
- ✅ 150-pixel proximity threshold

### **Video Calling Integration**
- ✅ WebRTC signaling support
- ✅ Office-based video calls
- ✅ Proximity-based video calls
- ✅ Screen sharing coordination

## 🚀 Quick Start

### **Installation**
```bash
cd server
npm install
```

### **Development**
```bash
npm run dev
```
Server will start on `http://localhost:2567`

### **Production**
```bash
npm run build
npm start
```

### **Testing**
```bash
npm test
```

## 📡 Server Endpoints

### **WebSocket Connections**
- `ws://localhost:2567` - Main Colyseus server

### **HTTP Endpoints**
- `GET /health` - Server health check
- `GET /api/rooms` - Available rooms list
- `GET /colyseus` - Colyseus monitor (development only)

## 🏢 Room Types

### **PUBLIC_ROOM**
- Open to all users
- No password required
- Up to 50 concurrent users
- Default office layout

### **PRIVATE_ROOM**
- Custom room creation
- Password protection available
- Configurable max players
- Custom room names

### **LOBBY_ROOM**
- Room discovery
- Real-time room listings
- Metadata synchronization

## 📨 Message Protocol

### **Client → Server Messages**

#### **Player Updates**
```typescript
{
  type: "UPDATE_PLAYER",
  data: {
    x: number,
    y: number,
    anim: string,
    status: {
      isMicOn: boolean,
      isWebcamOn: boolean,
      isDisconnected: boolean,
      status: "online" | "away" | "busy" | "offline"
    }
  }
}
```

#### **Office Management**
```typescript
// Join Office
{
  type: "JOIN_OFFICE",
  data: { username: string, office: OfficeNames }
}

// Leave Office
{
  type: "LEAVE_OFFICE", 
  data: { username: string, office: OfficeNames }
}
```

#### **Chat Messages**
```typescript
// Global Chat
{
  type: "SEND_GLOBAL_MESSAGE",
  data: { username: string, message: string }
}

// Office Chat
{
  type: "SEND_OFFICE_MESSAGE",
  data: { username: string, message: string, office: OfficeNames }
}
```

#### **Video Calling**
```typescript
// Direct Video Call
{
  type: "CONNECT_TO_VIDEO_CALL",
  data: targetSessionId
}

// Office Video Call
{
  type: "CONNECT_TO_OFFICE_VIDEO_CALL",
  data: officeName
}

// Proximity Video Call
{
  type: "CONNECT_TO_PROXIMITY_VIDEO_CALL", 
  data: nearbyPlayerIds[]
}
```

### **Server → Client Messages**

#### **Player Events**
- `USER_JOINED_OFFICE` - Player joined office zone
- `PLAYER_LEFT_OFFICE` - Player left office zone
- `PROXIMITY_UPDATE` - Nearby players for spatial audio

#### **Chat Events** 
- `NEW_GLOBAL_MESSAGE` - New global chat message
- `NEW_OFFICE_MESSAGE` - New office-specific message
- `GET_GLOBAL_CHAT` - Chat history on join
- `GET_OFFICE_CHAT` - Office chat history

#### **Video Call Events**
- `INCOMING_VIDEO_CALL` - Incoming video call request
- `VIDEO_CALL_ENDED` - Video call terminated
- `SCREEN_SHARE_STARTED` - Screen sharing initiated
- `SCREEN_SHARE_STOPPED` - Screen sharing ended

## 🏗️ Architecture

```
server/
├── src/
│   ├── index.ts                 # Main server entry point
│   └── rooms/
│       ├── SyncroSpaceRoom.ts   # Main room handler
│       └── schema/
│           └── SyncroSpaceRoomState.ts  # State schema
├── test/
│   └── SyncroSpaceRoom_test.ts  # Room tests
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Configuration

### **Environment Variables**
```bash
PORT=2567                    # Server port (default: 2567)
NODE_ENV=development        # Environment mode
COLYSEUS_PRESENCE=memory    # Presence driver (memory/redis)
```

### **Room Configuration**
```typescript
// Public Room
{
  name: "Public Office",
  password: null,
  maxPlayers: 50
}

// Private Room (customizable)
{
  name: "Custom Room Name",
  password: "optional_password", 
  maxPlayers: 10-100
}
```

## 🎮 Client Integration

### **Connection Example**
```typescript
import { Client } from "colyseus.js";

const client = new Client("ws://localhost:2567");
const room = await client.joinOrCreate("PUBLIC_ROOM", {
  username: "PlayerName",
  avatar: "adam",
  x: 400,
  y: 300,
  isMicOn: true,
  isWebcamOn: false
});
```

### **State Listening**
```typescript
// Player updates
room.state.players.onAdd((player, sessionId) => {
  console.log("Player joined:", player.username);
});

room.state.players.onChange((player, sessionId) => {
  console.log("Player updated:", player.username, player.x, player.y);
});

// Chat messages
room.onMessage("NEW_GLOBAL_MESSAGE", (data) => {
  console.log("New message:", data.username, data.message);
});
```

## 🧪 Testing

The server includes comprehensive tests for:
- ✅ Room connection and authentication
- ✅ Player state synchronization  
- ✅ Office zone management
- ✅ Chat message handling
- ✅ Proximity calculations
- ✅ Video call signaling

Run tests with:
```bash
npm test
```

## 📊 Monitoring

### **Colyseus Monitor**
Access the built-in monitor at `http://localhost:2567/colyseus` to view:
- Active rooms and players
- Real-time message traffic
- State synchronization
- Performance metrics

### **Health Checks**
```bash
curl http://localhost:2567/health
```

Returns server status, uptime, and room statistics.

## 🔧 Development

### **Hot Reload**
```bash
npm run dev
```

### **Building**
```bash
npm run build
```

### **Load Testing**
```bash
npm run loadtest
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

---

**🚀 Ready to power your virtual office with real-time multiplayer capabilities!**