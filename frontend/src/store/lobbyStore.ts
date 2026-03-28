import { create } from 'zustand'
import type { TableResponse } from '../types'

interface LobbyState {
  tables: TableResponse[]
  setTables: (tables: TableResponse[]) => void
  addTable: (table: TableResponse) => void
  updateTable: (table: TableResponse) => void
  removeTable: (tableId: string) => void
}

export const useLobbyStore = create<LobbyState>((set) => ({
  tables: [],
  setTables: (tables) => set({ tables }),
  addTable: (table) => set((s) => ({ tables: [...s.tables, table] })),
  updateTable: (table) =>
    set((s) => ({
      tables: s.tables.map((t) => (t.table_id === table.table_id ? table : t)),
    })),
  removeTable: (tableId) =>
    set((s) => ({ tables: s.tables.filter((t) => t.table_id !== tableId) })),
}))
