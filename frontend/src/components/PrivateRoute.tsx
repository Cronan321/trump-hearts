import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export default function PrivateRoute() {
  const token = useAuthStore((s) => s.token)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  if (!token || isTokenExpired(token)) {
    if (token) clearAuth()
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
