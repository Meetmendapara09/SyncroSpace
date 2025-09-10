
import { create } from 'zustand';

interface ChatbotState {
  isOpen: boolean;
  toggleChatbot: () => void;
  openChatbot: () => void;
  closeChatbot: () => void;
}

export const useChatbotStore = create<ChatbotState>((set) => ({
  isOpen: false,
  toggleChatbot: () => set((state) => ({ isOpen: !state.isOpen })),
  openChatbot: () => set({ isOpen: true }),
  closeChatbot: () => set({ isOpen: false }),
}));
