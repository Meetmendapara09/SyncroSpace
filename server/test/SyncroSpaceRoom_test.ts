import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { SyncroSpaceRoomState } from "../src/rooms/schema/SyncroSpaceRoomState";
import { SyncroSpaceRoom } from "../src/rooms/SyncroSpaceRoom";

describe("SyncroSpace Multiplayer Server", () => {
  let colyseus: ColyseusTestServer;

  before(async () => {
    const appConfig = {
      initializeGameServer: (gameServer: any) => {
        gameServer.define("PUBLIC_ROOM", SyncroSpaceRoom, {
          name: "Test Office",
          maxPlayers: 10
        });
      }
    };
    colyseus = await boot(appConfig);
  });

  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("should connect to a room", async () => {
    const room = await colyseus.createRoom<SyncroSpaceRoomState>("PUBLIC_ROOM", {});
    const client = await colyseus.connectTo(room);

    assert.strictEqual(client.sessionId, room.clients[0].sessionId);
  });

  it("should join room with player data", async () => {
    const room = await colyseus.createRoom<SyncroSpaceRoomState>("PUBLIC_ROOM", {});
    const client = await colyseus.connectTo(room, {
      username: "TestPlayer",
      avatar: "adam",
      x: 400,
      y: 300
    });

    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.ok(player);
    assert.strictEqual(player.username, "TestPlayer");
    assert.strictEqual(player.avatar, "adam");
  });

  it("should handle office join/leave", async () => {
    const room = await colyseus.createRoom<SyncroSpaceRoomState>("PUBLIC_ROOM", {});
    const client = await colyseus.connectTo(room, {
      username: "OfficeTestPlayer",
      avatar: "lucy"
    });

    await room.waitForNextPatch();

    // Join conference room
    client.send("JOIN_OFFICE", { username: "OfficeTestPlayer", office: "conference-a" });
    await room.waitForNextPatch();

    assert.ok(room.state.conferenceAMembers.has(client.sessionId));

    // Leave conference room
    client.send("LEAVE_OFFICE", { username: "OfficeTestPlayer", office: "conference-a" });
    await room.waitForNextPatch();

    assert.ok(!room.state.conferenceAMembers.has(client.sessionId));
  });

  it("should handle chat messages", async () => {
    const room = await colyseus.createRoom<SyncroSpaceRoomState>("PUBLIC_ROOM", {});
    const client = await colyseus.connectTo(room, {
      username: "ChatTestPlayer"
    });

    await room.waitForNextPatch();

    const initialChatLength = room.state.globalChat.length;
    
    client.send("SEND_GLOBAL_MESSAGE", {
      username: "ChatTestPlayer",
      message: "Hello, world!"
    });

    await room.waitForNextPatch();

    assert.strictEqual(room.state.globalChat.length, initialChatLength + 1);
    const lastMessage = room.state.globalChat[room.state.globalChat.length - 1];
    assert.strictEqual(lastMessage.message, "Hello, world!");
    assert.strictEqual(lastMessage.username, "ChatTestPlayer");
  });

  it("should update player position", async () => {
    const room = await colyseus.createRoom<SyncroSpaceRoomState>("PUBLIC_ROOM", {});
    const client = await colyseus.connectTo(room, {
      username: "MoveTestPlayer",
      x: 100,
      y: 100
    });

    await room.waitForNextPatch();

    client.send("UPDATE_PLAYER", {
      x: 200,
      y: 250,
      anim: "adam_walk_down"
    });

    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.strictEqual(player.x, 200);
    assert.strictEqual(player.y, 250);
    assert.strictEqual(player.anim, "adam_walk_down");
  });
});