"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncroSpaceRoom = void 0;
const colyseus_1 = require("colyseus");
const SyncroSpaceRoomState_1 = require("./schema/SyncroSpaceRoomState");
class SyncroSpaceRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.roomPassword = null;
        this.hasPassword = false;
        this.maxPlayers = 50;
    }
    getOfficeData(officeName) {
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
    getUserCurrentOffice(sessionId) {
        const offices = ["conference-a", "brainstorm", "collaboration", "coffee", "quiet-work", "presentation"];
        for (const office of offices) {
            const { members } = this.getOfficeData(office);
            if (members.has(sessionId)) {
                return office;
            }
        }
        return null;
    }
    handleOfficeJoin(client, username, officeName) {
        const sessionId = client.sessionId;
        const { members, chat, displayName } = this.getOfficeData(officeName);
        members.set(sessionId, username);
        const joinMessage = new SyncroSpaceRoomState_1.ChatMessage();
        joinMessage.id = `${sessionId}-${Date.now()}`;
        joinMessage.username = username;
        joinMessage.message = `Joined ${displayName}`;
        joinMessage.type = "PLAYER_JOINED";
        joinMessage.timestamp = Date.now();
        joinMessage.office = officeName;
        chat.push(joinMessage);
        const player = this.state.players.get(sessionId);
        if (player) {
            player.currentOffice = officeName;
        }
        client.send("GET_OFFICE_CHAT", { office: officeName, messages: chat });
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
    handleOfficeLeave(client, username, officeName) {
        const sessionId = client.sessionId;
        const { members, chat, displayName } = this.getOfficeData(officeName);
        if (!members.has(sessionId))
            return;
        members.delete(sessionId);
        const leaveMessage = new SyncroSpaceRoomState_1.ChatMessage();
        leaveMessage.id = `${sessionId}-${Date.now()}`;
        leaveMessage.username = username;
        leaveMessage.message = `Left ${displayName}`;
        leaveMessage.type = "PLAYER_LEFT";
        leaveMessage.timestamp = Date.now();
        leaveMessage.office = officeName;
        chat.push(leaveMessage);
        const player = this.state.players.get(sessionId);
        if (player) {
            player.currentOffice = "";
        }
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
    calculateDistance(player1, player2) {
        const dx = player1.x - player2.x;
        const dy = player1.y - player2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    updateProximityData() {
        const proximityThreshold = 150;
        this.state.players.forEach((player1, sessionId1) => {
            const nearbyPlayers = [];
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
            this.clients.getById(sessionId1)?.send("PROXIMITY_UPDATE", {
                nearbyPlayers,
                proximityThreshold
            });
        });
    }
    onAuth(client, options) {
        if (!this.roomPassword)
            return true;
        return this.roomPassword === options.password;
    }
    onCreate(options) {
        console.log("SyncroSpace room created with options:", options);
        this.setState(new SyncroSpaceRoomState_1.SyncroSpaceRoomState());
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
        this.setupMessageHandlers();
        this.clock.setInterval(() => {
            this.updateProximityData();
        }, 100);
    }
    setupMessageHandlers() {
        this.onMessage("UPDATE_PLAYER", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (!player)
                return;
            if (data.x !== undefined)
                player.x = data.x;
            if (data.y !== undefined)
                player.y = data.y;
            if (data.anim !== undefined)
                player.anim = data.anim;
            if (data.status) {
                if (data.status.isMicOn !== undefined)
                    player.isMicOn = data.status.isMicOn;
                if (data.status.isWebcamOn !== undefined)
                    player.isWebcamOn = data.status.isWebcamOn;
                if (data.status.isDisconnected !== undefined)
                    player.isDisconnected = data.status.isDisconnected;
                if (data.status.status !== undefined)
                    player.status = data.status.status;
            }
        });
        this.onMessage("JOIN_OFFICE", (client, data) => {
            const { username, office } = data;
            if (office && this.getOfficeData(office)) {
                this.handleOfficeJoin(client, username, office);
            }
        });
        this.onMessage("LEAVE_OFFICE", (client, data) => {
            const { username, office } = data;
            if (office && this.getOfficeData(office)) {
                this.handleOfficeLeave(client, username, office);
            }
        });
        this.onMessage("SEND_GLOBAL_MESSAGE", (client, data) => {
            const { username, message } = data;
            const player = this.state.players.get(client.sessionId);
            if (!player)
                return;
            const chatMessage = new SyncroSpaceRoomState_1.ChatMessage();
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
            const officeData = this.getOfficeData(office);
            if (!officeData)
                return;
            const chatMessage = new SyncroSpaceRoomState_1.ChatMessage();
            chatMessage.id = `${office}-${client.sessionId}-${Date.now()}`;
            chatMessage.username = username;
            chatMessage.message = message;
            chatMessage.type = "REGULAR_MESSAGE";
            chatMessage.timestamp = Date.now();
            chatMessage.office = office;
            officeData.chat.push(chatMessage);
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
        this.onMessage("CONNECT_TO_VIDEO_CALL", (client, targetSessionId) => {
            this.clients.getById(targetSessionId)?.send("INCOMING_VIDEO_CALL", client.sessionId);
        });
        this.onMessage("END_VIDEO_CALL", (client, targetSessionId) => {
            this.clients.getById(targetSessionId)?.send("VIDEO_CALL_ENDED", client.sessionId);
        });
        this.onMessage("CONNECT_TO_OFFICE_VIDEO_CALL", (client, officeName) => {
            const officeData = this.getOfficeData(officeName);
            if (!officeData)
                return;
            officeData.members.forEach((_, memberId) => {
                if (memberId !== client.sessionId) {
                    this.clients.getById(memberId)?.send("INCOMING_VIDEO_CALL", client.sessionId);
                }
            });
        });
        this.onMessage("CONNECT_TO_PROXIMITY_VIDEO_CALL", (client, nearbyPlayerIds) => {
            nearbyPlayerIds.forEach((playerId) => {
                this.clients.getById(playerId)?.send("INCOMING_VIDEO_CALL", client.sessionId);
            });
        });
        this.onMessage("START_SCREEN_SHARE", (client, data) => {
            const { office, targetUsers } = data;
            const targets = targetUsers || [];
            targets.forEach((targetId) => {
                this.clients.getById(targetId)?.send("SCREEN_SHARE_STARTED", {
                    fromUser: client.sessionId,
                    office
                });
            });
        });
        this.onMessage("STOP_SCREEN_SHARE", (client, data) => {
            const { office, targetUsers } = data;
            const targets = targetUsers || [];
            targets.forEach((targetId) => {
                this.clients.getById(targetId)?.send("SCREEN_SHARE_STOPPED", {
                    fromUser: client.sessionId,
                    office
                });
            });
        });
    }
    onJoin(client, options) {
        console.log(`${options.username} joined the room (${client.sessionId})`);
        const player = new SyncroSpaceRoomState_1.Player();
        player.username = options.username || "Anonymous";
        player.avatar = options.avatar || "adam";
        player.x = options.x || 400;
        player.y = options.y || 300;
        player.anim = `${player.avatar}_idle`;
        player.isMicOn = options.isMicOn || false;
        player.isWebcamOn = options.isWebcamOn || false;
        player.status = "online";
        this.state.players.set(client.sessionId, player);
        const welcomeMessage = new SyncroSpaceRoomState_1.ChatMessage();
        welcomeMessage.id = `welcome-${client.sessionId}-${Date.now()}`;
        welcomeMessage.username = player.username;
        welcomeMessage.message = "Joined the virtual office!";
        welcomeMessage.type = "PLAYER_JOINED";
        welcomeMessage.timestamp = Date.now();
        this.state.globalChat.push(welcomeMessage);
        this.broadcast("NEW_GLOBAL_MESSAGE", {
            id: welcomeMessage.id,
            username: player.username,
            message: welcomeMessage.message,
            type: welcomeMessage.type,
            timestamp: welcomeMessage.timestamp
        }, { except: [client] });
        client.send("GET_GLOBAL_CHAT", this.state.globalChat);
        this.setMetadata({
            name: this.state.roomName,
            hasPassword: this.hasPassword,
            players: this.state.players.size,
            maxPlayers: this.maxPlayers
        });
    }
    onLeave(client, consented) {
        const player = this.state.players.get(client.sessionId);
        if (!player)
            return;
        console.log(`${player.username} left the room (${client.sessionId})`);
        const currentOffice = this.getUserCurrentOffice(client.sessionId);
        if (currentOffice) {
            this.handleOfficeLeave(client, player.username, currentOffice);
        }
        const leaveMessage = new SyncroSpaceRoomState_1.ChatMessage();
        leaveMessage.id = `leave-${client.sessionId}-${Date.now()}`;
        leaveMessage.username = player.username;
        leaveMessage.message = "Left the virtual office";
        leaveMessage.type = "PLAYER_LEFT";
        leaveMessage.timestamp = Date.now();
        this.state.globalChat.push(leaveMessage);
        this.state.players.delete(client.sessionId);
        this.broadcast("NEW_GLOBAL_MESSAGE", {
            id: leaveMessage.id,
            username: player.username,
            message: leaveMessage.message,
            type: leaveMessage.type,
            timestamp: leaveMessage.timestamp
        });
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
exports.SyncroSpaceRoom = SyncroSpaceRoom;
