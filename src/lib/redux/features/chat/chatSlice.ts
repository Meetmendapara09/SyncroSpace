import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChatMessageType {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: "office" | "global";
}

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    officeChatMessages: new Array<ChatMessageType>(),
    globalChatMessages: new Array<ChatMessageType>(),
    messages: new Array<ChatMessageType>(), // Combined messages
    focused: false,
    showOfficeChat: false,
    isChatWindowOpen: false,
    unreadCount: 0,
  },
  reducers: {
    /* For office specific chat messages */
    pushNewOfficeMessage: (
      state,
      action: PayloadAction<ChatMessageType>
    ) => {
      state.officeChatMessages.push(action.payload);
      state.messages.push(action.payload);
      if (!state.isChatWindowOpen) {
        state.unreadCount += 1;
      }
    },
    addOfficeChat: (state, action: PayloadAction<ChatMessageType[]>) => {
      state.officeChatMessages = [...action.payload];
    },
    clearOfficeChat: (state) => {
      state.officeChatMessages = [];
    },
    setShowOfficeChat: (state, action: PayloadAction<boolean>) => {
      state.showOfficeChat = action.payload;
    },

    /* For global chat messages */
    pushNewGlobalMessage: (
      state,
      action: PayloadAction<ChatMessageType>
    ) => {
      state.globalChatMessages.push(action.payload);
      state.messages.push(action.payload);
      if (!state.isChatWindowOpen) {
        state.unreadCount += 1;
      }
    },
    addGlobalChat: (state, action: PayloadAction<ChatMessageType[]>) => {
      state.globalChatMessages = [...action.payload];
    },

    /* New unified message actions */
    addMessage: (state, action: PayloadAction<ChatMessageType>) => {
      state.messages.push(action.payload);
      if (action.payload.type === 'office') {
        state.officeChatMessages.push(action.payload);
      } else {
        state.globalChatMessages.push(action.payload);
      }
      if (!state.isChatWindowOpen) {
        state.unreadCount += 1;
      }
    },
    
    toggleChatWindow: (state) => {
      state.isChatWindowOpen = !state.isChatWindowOpen;
      if (state.isChatWindowOpen) {
        state.unreadCount = 0;
      }
    },
    
    clearUnreadCount: (state) => {
      state.unreadCount = 0;
    },
  },
});

export const {
  pushNewOfficeMessage,
  clearOfficeChat,
  addOfficeChat,
  setShowOfficeChat,
  pushNewGlobalMessage,
  addGlobalChat,
  addMessage,
  toggleChatWindow,
  clearUnreadCount,
} = chatSlice.actions;

export default chatSlice.reducer;