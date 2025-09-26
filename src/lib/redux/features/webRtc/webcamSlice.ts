import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MediaConnection } from "peerjs";

interface InitialState {
  myWebcamStream: MediaStream | null;
  peerStreams: Map<string, { call: MediaConnection; stream: MediaStream }>;
  isWebcamOn: boolean;
  isMicOn: boolean;
  isDisconnectedFromVideoCalls: boolean;
}

const initialState: InitialState = {
  myWebcamStream: null,
  peerStreams: new Map(),
  isWebcamOn: false,
  isMicOn: false,
  isDisconnectedFromVideoCalls: false,
};

const webcamSlice = createSlice({
  name: "webcam",
  initialState,
  reducers: {
    /* For FloatingActions.tsx */
    setMyWebcamStream: (state, action: PayloadAction<MediaStream>) => {
      state.myWebcamStream = action.payload;
      state.isWebcamOn = true;
      state.isMicOn = true;
      state.isDisconnectedFromVideoCalls = false;
    },
    toggleWebcam: (state) => {
      state.isWebcamOn = !state.isWebcamOn;
    },
    toggleMic: (state) => {
      state.isMicOn = !state.isMicOn;
    },
    disconnectFromVideoCall: (state) => {
      state.myWebcamStream = null;
      state.isDisconnectedFromVideoCalls = true;
    },
    turnOffWebcamAndMic: (state) => {
      state.isWebcamOn = false;
      state.isMicOn = false;
    },

    /* For GameScene.tsx */
    addWebcamStream: (
      state,
      action: PayloadAction<{
        peerId: string;
        call: MediaConnection;
        userStream: MediaStream;
      }>
    ) => {
      const { peerId, call, userStream: stream } = action.payload;
      state.peerStreams.set(peerId, { call, stream });
    },
    /** disconnect remote player when he leaves the office. */
    disconnectUserForVideoCalling: (
      state,
      action: PayloadAction<string>
    ) => {
      const sanitizedId = action.payload.replace(/[^a-zA-Z0-9]/g, '');
      const peer = state.peerStreams.get(sanitizedId);

      if (peer) {
        peer.call.close();
        state.peerStreams.delete(sanitizedId);
      }
    },
    removeAllPeerConnectionsForVideoCalling: (state) => {
      state.peerStreams.forEach((peer) => {
        peer.call.close();
      });
      state.peerStreams.clear();
    },
  },
});

export const {
  setMyWebcamStream,
  toggleWebcam,
  toggleMic,
  disconnectFromVideoCall,
  turnOffWebcamAndMic,
  addWebcamStream,
  disconnectUserForVideoCalling,
  removeAllPeerConnectionsForVideoCalling,
} = webcamSlice.actions;

export default webcamSlice.reducer;