import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export default function SaasLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, role } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    if (role === 'SUPER_ADMIN') return <Navigate to="/saas/businesses" replace />
    return <Navigate to="/saas" replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const normalizedUsername = username.trim()
      const normalizedPassword = password.trim()

      if (!normalizedUsername || !normalizedPassword) {
        setError('Please enter your username and password.')
        return
      }

      const result = await login({ username: normalizedUsername, password: normalizedPassword })
      const from = location.state?.from
      const safeRedirect = typeof from === 'string' && from !== '/saas/login' ? from : result.redirectTo
      navigate(safeRedirect, { replace: true })
    } catch (requestError) {
      const backendMessage = String(requestError?.response?.data?.message || '').toLowerCase()
      if (backendMessage.includes('subscription expired')) {
        setError('Your subscription has expired. Please contact support.')
      } else if (backendMessage.includes('invalid credentials')) {
        setError('Invalid username or password.')
      } else if (requestError?.response?.status === 400) {
        setError('Please check your login details and try again.')
      } else {
        setError('Unable to sign in right now. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form className="w-full rounded-2xl border border-white/10 bg-white/5 p-6" onSubmit={onSubmit}>
        <h1 className="mb-1 text-xl font-semibold">Tournament Control Panel</h1>
        <p className="mb-4 text-sm text-white/70">Sign in to manage matches, finance, and live display.</p>
        {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          placeholder="Username"
          autoComplete="username"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          placeholder="Password"
          autoComplete="current-password"
          required
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-[#c9a227] px-3 py-2 font-semibold text-[#07162b] disabled:opacity-70"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
