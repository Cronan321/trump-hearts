const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface TokenResponse {
  user_id: string
  username: string
  token: string
}

export interface LoginResponse {
  user_id: string
  username: string
  token: string
  coin_balance: number
}

export interface UserProfileResponse {
  user_id: string
  username: string
  email: string
  coin_balance: number
  game_history_summary: Record<string, number>
}

export interface ApiError {
  detail: string
}

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })
  if (!res.ok) {
    const err: ApiError = await res.json()
    throw { status: res.status, detail: err.detail }
  }
  return res.json()
}

export async function login(
  credential: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, password }),
  })
  if (!res.ok) {
    const err: ApiError = await res.json()
    throw { status: res.status, detail: err.detail }
  }
  return res.json()
}

export async function getMe(token: string): Promise<UserProfileResponse> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err: ApiError = await res.json()
    throw { status: res.status, detail: err.detail }
  }
  return res.json()
}
