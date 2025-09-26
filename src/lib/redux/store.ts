import { Action, configureStore, ThunkAction } from "@reduxjs/toolkit";
import chatReducer from "./features/chat/chatSlice";
import roomReducer from "./features/room/roomSlice";
import screenReducer from "./features/webRtc/screenSlice";
import webcamReducer from "./features/webRtc/webcamSlice";
import userReducer from "./features/user/userSlice";
import { enableMapSet } from "immer";

// Enable MapSet plugin for Immer to support Map and Set in Redux state
enableMapSet();

const store = configureStore({
  reducer: {
    chat: chatReducer,
    room: roomReducer,
    screen: screenReducer,
    webcam: webcamReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Define the AppThunk type
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default store;