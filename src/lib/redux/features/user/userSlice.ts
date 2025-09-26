import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  currentUserId: string | null;
  username: string;
  avatar?: string;
  isInOffice: boolean;
  currentOfficeId: string | null;
  position: {
    x: number;
    y: number;
  };
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: number;
}

interface ConnectedUser {
  userId: string;
  username: string;
  position: { x: number; y: number };
  avatar?: string;
  isWebcamEnabled: boolean;
  isMicEnabled: boolean;
  status: UserState['status'];
  lastSeen: number;
}

const initialState = {
  currentUserId: null as string | null,
  username: '',
  avatar: undefined as string | undefined,
  isInOffice: false,
  currentOfficeId: null as string | null,
  position: { x: 400, y: 300 },
  status: 'offline' as 'online' | 'away' | 'busy' | 'offline',
  lastSeen: Date.now(),
  connectedUsers: new Map<string, ConnectedUser>(),
  nearbyUsers: [] as string[], // User IDs within proximity range
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<{
      userId: string;
      username: string;
      avatar?: string;
    }>) => {
      state.currentUserId = action.payload.userId;
      state.username = action.payload.username;
      state.avatar = action.payload.avatar;
      state.status = 'online';
      state.lastSeen = Date.now();
    },

    setUserPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.position = action.payload;
      state.lastSeen = Date.now();
    },

    joinOffice: (state, action: PayloadAction<string>) => {
      state.currentOfficeId = action.payload;
      state.isInOffice = true;
      state.status = 'online';
      state.lastSeen = Date.now();
    },

    leaveOffice: (state) => {
      state.currentOfficeId = null;
      state.isInOffice = false;
      state.connectedUsers.clear();
      state.nearbyUsers = [];
    },

    setUserStatus: (state, action: PayloadAction<UserState['status']>) => {
      state.status = action.payload;
      state.lastSeen = Date.now();
    },

    // Connected users management
    addConnectedUser: (state, action: PayloadAction<ConnectedUser>) => {
      state.connectedUsers.set(action.payload.userId, action.payload);
    },

    updateConnectedUser: (state, action: PayloadAction<{
      userId: string;
      updates: Partial<ConnectedUser>;
    }>) => {
      const user = state.connectedUsers.get(action.payload.userId);
      if (user) {
        state.connectedUsers.set(action.payload.userId, {
          ...user,
          ...action.payload.updates,
          lastSeen: Date.now(),
        });
      }
    },

    removeConnectedUser: (state, action: PayloadAction<string>) => {
      state.connectedUsers.delete(action.payload);
      state.nearbyUsers = state.nearbyUsers.filter(id => id !== action.payload);
    },

    setNearbyUsers: (state, action: PayloadAction<string[]>) => {
      state.nearbyUsers = action.payload;
    },

    updateLastSeen: (state) => {
      state.lastSeen = Date.now();
    },

    resetUserState: () => initialState,
  },
});

export const {
  setCurrentUser,
  setUserPosition,
  joinOffice,
  leaveOffice,
  setUserStatus,
  addConnectedUser,
  updateConnectedUser,
  removeConnectedUser,
  setNearbyUsers,
  updateLastSeen,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer;