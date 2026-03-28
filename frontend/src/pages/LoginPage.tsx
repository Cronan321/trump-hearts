import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import type { User } from '../types'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await login(credential, password)
      localStorage.setItem('token', res.token)
      const user: User = {
        user_id: res.user_id,
        username: res.username,
        email: credential.includes('@') ? credential : '',
        coin_balance: res.coin_balance,
      }
      setAuth(user, res.token)
      navigate('/lobby')
    } catch (err: unknown) {
      const e = err as { status: number; detail: string }
      if (e.status === 401) {
        setError('Invalid username/email or password.')
      } else {
        setError(e.detail ?? 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-marble">
      <div className="w-full max-w-md p-8 rounded-lg border border-gold shadow-gold bg-marble-light">
        <h1 className="text-gold text-3xl font-display font-bold text-center mb-8 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="Trump Hearts" className="h-10 w-auto" />
          Trump Hearts
        </h1>
        <h2 className="text-gold-light text-xl font-display text-center mb-6">Sign In</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gold-light text-sm mb-1" htmlFor="credential">
              Username or Email
            </label>
            <input
              id="credential"
              type="text"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              required
              className="w-full bg-marble border border-gold rounded px-3 py-2 text-white
                         focus:outline-none focus:ring-1 focus:ring-gold placeholder-gray-500"
              placeholder="Enter username or email"
            />
          </div>

          <div>
            <label className="block text-gold-light text-sm mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-marble border border-gold rounded px-3 py-2 text-white
                         focus:outline-none focus:ring-1 focus:ring-gold placeholder-gray-500"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-gold hover:text-gold-light underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
