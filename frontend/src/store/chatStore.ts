import { create } from 'zustand'

export interface ChatMessage {
  sender: string
  text: string
  timestamp: string // ISO string
}

interface ChatState {
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),
}))
