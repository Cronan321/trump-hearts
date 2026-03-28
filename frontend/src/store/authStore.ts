import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  updateCoinBalance: (balance: number) => void
}

const storedToken = localStorage.getItem('token')

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: storedToken,
  isAuthenticated: !!storedToken,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
  updateCoinBalance: (balance) =>
    set((state) => state.user ? { user: { ...state.user, coin_balance: balance } } : {}),
}))
