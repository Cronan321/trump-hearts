import { create } from 'zustand'
import type { GameState, Card } from '../types'

export interface TrickRecord {
  roundNumber: number
  trickNumber: number
  cardsPlayed: Record<string, Card>  // player_id -> Card
  winnerId: string
}

interface GameStore {
  gameState: GameState | null
  setGameState: (state: GameState) => void
  trickHistory: TrickRecord[]
  addTrickToHistory: (trick: TrickRecord) => void
  clearHistory: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  setGameState: (state) => set({ gameState: state }),
  trickHistory: [],
  addTrickToHistory: (trick) => set((s) => ({ trickHistory: [...s.trickHistory, trick] })),
  clearHistory: () => set({ trickHistory: [] }),
}))
