import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import type { User } from '../types'

interface FieldErrors {
  username?: string
  email?: string
  password?: string
  general?: string
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const next: FieldErrors = {}
    if (username.length < 3) next.username = 'Username must be at least 3 characters.'
    if (!email.includes('@')) next.email = 'Enter a valid email address.'
    if (password.length < 8) next.password = 'Password must be at least 8 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setErrors({})
    setLoading(true)
    try {
      const res = await register(username, email, password)
      localStorage.setItem('token', res.token)
      const user: User = {
        user_id: res.user_id,
        username: res.username,
        email,
        coin_balance: 25000,
      }
      setAuth(user, res.token)
      navigate('/lobby')
    } catch (err: unknown) {
      const e = err as { status: number; detail: string }
      if (e.status === 409) {
        const detail = e.detail ?? ''
        if (detail.toLowerCase().includes('username')) {
          setErrors({ username: detail })
        } else if (detail.toLowerCase().includes('email')) {
          setErrors({ email: detail })
        } else {
          setErrors({ general: detail })
        }
      } else {
        setErrors({ general: e.detail ?? 'Something went wrong.' })
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
        <h2 className="text-gold-light text-xl font-display text-center mb-6">Create Account</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gold-light text-sm mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-marble border border-gold rounded px-3 py-2 text-white
                         focus:outline-none focus:ring-1 focus:ring-gold placeholder-gray-500"
              placeholder="Choose a username"
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-gold-light text-sm mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-marble border border-gold rounded px-3 py-2 text-white
                         focus:outline-none focus:ring-1 focus:ring-gold placeholder-gray-500"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
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
              placeholder="At least 8 characters"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {errors.general && (
            <p className="text-red-400 text-sm text-center">{errors.general}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-gold hover:text-gold-light underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
