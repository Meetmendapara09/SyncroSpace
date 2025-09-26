"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncroSpaceRoomState = exports.ProximityData = exports.ChatMessage = exports.Player = void 0;
const schema_1 = require("@colyseus/schema");
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 400;
        this.y = 300;
        this.username = "";
        this.avatar = "adam";
        this.anim = "idle";
        this.isMicOn = false;
        this.isWebcamOn = false;
        this.isDisconnected = false;
        this.status = "online";
        this.currentOffice = "";
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "username", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "avatar", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "anim", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isMicOn", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isWebcamOn", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isDisconnected", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "status", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "currentOffice", void 0);
class ChatMessage extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.username = "";
        this.message = "";
        this.type = "REGULAR_MESSAGE";
        this.timestamp = Date.now();
    }
}
exports.ChatMessage = ChatMessage;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "username", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "message", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatMessage.prototype, "timestamp", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "office", void 0);
class ProximityData extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.playerId = "";
        this.distance = 0;
        this.volume = 0;
    }
}
exports.ProximityData = ProximityData;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ProximityData.prototype, "playerId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ProximityData.prototype, "distance", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ProximityData.prototype, "volume", void 0);
class SyncroSpaceRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.globalChat = new schema_1.ArraySchema();
        this.conferenceAMembers = new schema_1.MapSchema();
        this.conferenceAChat = new schema_1.ArraySchema();
        this.brainstormMembers = new schema_1.MapSchema();
        this.brainstormChat = new schema_1.ArraySchema();
        this.collaborationMembers = new schema_1.MapSchema();
        this.collaborationChat = new schema_1.ArraySchema();
        this.coffeeMembers = new schema_1.MapSchema();
        this.coffeeChat = new schema_1.ArraySchema();
        this.quietWorkMembers = new schema_1.MapSchema();
        this.quietWorkChat = new schema_1.ArraySchema();
        this.presentationMembers = new schema_1.MapSchema();
        this.presentationChat = new schema_1.ArraySchema();
        this.proximityData = new schema_1.MapSchema();
        this.roomName = "";
        this.hasPassword = false;
        this.maxPlayers = 50;
        this.createdAt = Date.now();
    }
}
exports.SyncroSpaceRoomState = SyncroSpaceRoomState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)([ChatMessage]),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "globalChat", void 0);
__decorate([
    (0, schema_1.type)({ map: "string" }),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "conferenceAMembers", void 0);
__decorate([
    (0, schema_1.type)([ChatMessage]),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "conferenceAChat", void 0);
__decorate([
    (0, schema_1.type)({ map: "string" }),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "brainstormMembers", void 0);
__decorate([
    (0, schema_1.type)([ChatMessage]),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "brainstormChat", void 0);
__decorate([
    (0, schema_1.type)({ map: "string" }),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "collaborationMembers", void 0);
__decorate([
    (0, schema_1.type)([ChatMessage]),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "collaborationChat", void 0);
__decorate([
    (0, schema_1.type)({ map: "string" }),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "coffeeMembers", void 0);
__decorate([
    (0, schema_1.type)([ChatMessage]),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "coffeeChat", void 0);
__decorate([
    (0, schema_1.type)({ map: "string" }),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "quietWorkMembers", void 0);
__decorate([
    (0, schema_1.type)([ChatMessage]),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "quietWorkChat", void 0);
__decorate([
    (0, schema_1.type)({ map: "string" }),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "presentationMembers", void 0);
__decorate([
    (0, schema_1.type)([ChatMessage]),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "presentationChat", void 0);
__decorate([
    (0, schema_1.type)({ map: ProximityData }),
    __metadata("design:type", Object)
], SyncroSpaceRoomState.prototype, "proximityData", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], SyncroSpaceRoomState.prototype, "roomName", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], SyncroSpaceRoomState.prototype, "hasPassword", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], SyncroSpaceRoomState.prototype, "maxPlayers", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], SyncroSpaceRoomState.prototype, "createdAt", void 0);
