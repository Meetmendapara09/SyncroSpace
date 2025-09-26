import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MediaConnection } from "peerjs";

interface ScreenSharingState {
  playerNameMap: Map<string, string>;
  peerStreams: Map<
    string,
    { call: MediaConnection; stream: MediaStream; username: string }
  >;
  myScreenStream: MediaStream | null;
}

const initialState: ScreenSharingState = {
  playerNameMap: new Map(),
  peerStreams: new Map(),
  myScreenStream: null,
};

const screenReducer = createSlice({
  name: "screen-sharing",
  initialState,
  reducers: {
    /** For screen sharing */
    setMyScreenStream: (state, action: PayloadAction<MediaStream>) => {
      state.myScreenStream = action.payload;
    },
    addScreenStream: (
      state,
      action: PayloadAction<{
        peerId: string;
        call: MediaConnection;
        userStream: MediaStream;
      }>
    ) => {
      const { peerId, call, userStream: stream } = action.payload;
      const username = state.playerNameMap.get(peerId) || "Unknown";
      state.peerStreams.set(peerId, { call, stream, username });
    },
    disconnectUserForScreenSharing: (state, action: PayloadAction<string>) => {
      const sanitizedId = action.payload.replace(/[^a-zA-Z0-9]/g, '');
      const peer = state.peerStreams.get(sanitizedId);
      if (peer) {
        peer.call.close();
        state.peerStreams.delete(sanitizedId);
      }
    },
    removeAllPeerConnectionsForScreenSharing: (state) => {
      state.peerStreams.forEach((peer) => {
        peer.call.close();
      });
      state.peerStreams.clear();
    },
    stopScreenSharing: (state) => {
      if (state.myScreenStream) {
        const tracks = state.myScreenStream.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
        state.myScreenStream = null;
      }
    },

    /** For playerNameMap */
    setPlayerNameMap: (
      state,
      action: PayloadAction<{ peerId: string; username: string }>
    ) => {
      state.playerNameMap.set(
        action.payload.peerId,
        action.payload.username
      );
    },
    removePlayerNameMap: (state, action: PayloadAction<string>) => {
      state.playerNameMap.delete(action.payload);
    },
    clearPlayerNameMap: (state) => {
      state.playerNameMap.clear();
    },
  },
});

export const {
  setMyScreenStream,
  addScreenStream,
  disconnectUserForScreenSharing,
  removeAllPeerConnectionsForScreenSharing,
  stopScreenSharing,
  setPlayerNameMap,
  removePlayerNameMap,
  clearPlayerNameMap,
} = screenReducer.actions;

export default screenReducer.reducer;