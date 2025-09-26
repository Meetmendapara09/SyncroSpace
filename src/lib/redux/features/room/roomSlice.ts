import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
  roomJoined: false,
  availableRooms: new Array<{
    roomName: string;
    roomId: string;
    hasPassword: boolean;
  }>(),
  isLoading: true,
  playerPosition: { x: 400, y: 300 } as { x: number; y: number },
  currentOffice: "" as string,
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    setRoomJoined: (state, action: PayloadAction<boolean>) => {
      state.roomJoined = action.payload;
    },
    addAvailableRooms: (
      state,
      action: PayloadAction<{
        roomName: string;
        roomId: string;
        hasPassword: boolean;
      }>
    ) => {
      state.availableRooms.push(action.payload);
    },
    removeFromAvailableRooms: (state, action: PayloadAction<string>) => {
      state.availableRooms = state.availableRooms.filter(
        (room) => room.roomId !== action.payload
      );
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setPlayerPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.playerPosition = action.payload;
    },
    setCurrentOffice: (state, action: PayloadAction<string>) => {
      state.currentOffice = action.payload;
    },
  },
});

export const {
  setRoomJoined,
  addAvailableRooms,
  removeFromAvailableRooms,
  setIsLoading,
  setPlayerPosition,
  setCurrentOffice,
} = roomSlice.actions;

export default roomSlice.reducer;