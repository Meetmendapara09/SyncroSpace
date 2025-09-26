import http from "http";
import express from "express";
import cors from "cors";
import { Server, LobbyRoom } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { SyncroSpaceRoom } from "./rooms/SyncroSpaceRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

// Enable CORS for all origins in development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://localhost:9002', 'https://your-domain.com'] 
    : true,
  credentials: true
}));

app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Colyseus game server
const gameServer = new Server({
  server,
  presence: undefined, // Use default in-memory presence for now
});

// Register room handlers
gameServer
  .define("LOBBY_ROOM", LobbyRoom)
  .enableRealtimeListing();

gameServer
  .define("PUBLIC_ROOM", SyncroSpaceRoom, {
    name: "Public Office",
    password: null,
    maxPlayers: 50
  })
  .enableRealtimeListing();

gameServer
  .define("PRIVATE_ROOM", SyncroSpaceRoom)
  .enableRealtimeListing();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    server: 'SyncroSpace Multiplayer Server',
    version: '1.0.0',
    uptime: process.uptime(),
    rooms: {
      public: 1,
      private: 0 // Will be dynamic based on created rooms
    }
  });
});

// API endpoint to get available rooms
app.get('/api/rooms', async (req, res) => {
  try {
    // In a simple implementation, we'll just return basic info
    // For full room querying, you'd need to implement proper matchmaker queries
    res.json({
      success: true,
      message: 'Rooms endpoint - use WebSocket connection to query actual rooms',
      availableRoomTypes: ['PUBLIC_ROOM', 'PRIVATE_ROOM']
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
  }
});

// Register Colyseus monitor (for development/debugging)
if (process.env.NODE_ENV !== 'production') {
  app.use("/colyseus", monitor());
}

// Start the server
gameServer.listen(port);

console.log(`🚀 SyncroSpace Multiplayer Server listening on:`);
console.log(`   Local:    http://localhost:${port}`);
console.log(`   Monitor:  http://localhost:${port}/colyseus`);
console.log(`   Health:   http://localhost:${port}/health`);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  gameServer.gracefullyShutdown().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  gameServer.gracefullyShutdown().then(() => {
    process.exit(0);
  });
});