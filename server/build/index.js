"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const colyseus_1 = require("colyseus");
const monitor_1 = require("@colyseus/monitor");
const SyncroSpaceRoom_1 = require("./rooms/SyncroSpaceRoom");
const port = Number(process.env.PORT || 2567);
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://localhost:9002', 'https://your-domain.com']
        : true,
    credentials: true
}));
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const gameServer = new colyseus_1.Server({
    server,
    presence: undefined,
});
gameServer
    .define("LOBBY_ROOM", colyseus_1.LobbyRoom)
    .enableRealtimeListing();
gameServer
    .define("PUBLIC_ROOM", SyncroSpaceRoom_1.SyncroSpaceRoom, {
    name: "Public Office",
    password: null,
    maxPlayers: 50
})
    .enableRealtimeListing();
gameServer
    .define("PRIVATE_ROOM", SyncroSpaceRoom_1.SyncroSpaceRoom)
    .enableRealtimeListing();
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        server: 'SyncroSpace Multiplayer Server',
        version: '1.0.0',
        uptime: process.uptime(),
        rooms: {
            public: 1,
            private: 0
        }
    });
});
app.get('/api/rooms', async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Rooms endpoint - use WebSocket connection to query actual rooms',
            availableRoomTypes: ['PUBLIC_ROOM', 'PRIVATE_ROOM']
        });
    }
    catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
    }
});
if (process.env.NODE_ENV !== 'production') {
    app.use("/colyseus", (0, monitor_1.monitor)());
}
gameServer.listen(port);
console.log(`🚀 SyncroSpace Multiplayer Server listening on:`);
console.log(`   Local:    http://localhost:${port}`);
console.log(`   Monitor:  http://localhost:${port}/colyseus`);
console.log(`   Health:   http://localhost:${port}/health`);
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
