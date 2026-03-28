import type { TableResponse, RuleConfig } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export interface CreateTableBody {
  name: string
  rule_config: RuleConfig
}

export async function getTables(token: string): Promise<TableResponse[]> {
  const res = await fetch(`${BASE_URL}/tables`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function createTable(token: string, body: CreateTableBody): Promise<TableResponse> {
  const res = await fetch(`${BASE_URL}/tables`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function joinTable(token: string, tableId: string): Promise<{ table_id: string; seat_index: number }> {
  const res = await fetch(`${BASE_URL}/tables/${tableId}/join`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}
