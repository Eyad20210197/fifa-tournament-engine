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
        setError('يرجى إدخال اسم المستخدم وكلمة المرور.')
        return
      }

      const result = await login({ username: normalizedUsername, password: normalizedPassword })
      const from = location.state?.from
      const safeRedirect = typeof from === 'string' && from !== '/saas/login' ? from : result.redirectTo
      navigate(safeRedirect, { replace: true })
    } catch (requestError) {
      const backendMessage = String(requestError?.response?.data?.message || '').toLowerCase()
      if (backendMessage.includes('subscription expired')) {
        setError('انتهى الاشتراك. يرجى التواصل مع الدعم.')
      } else if (backendMessage.includes('invalid credentials')) {
        setError('بيانات الدخول غير صحيحة.')
      } else if (requestError?.response?.status === 400) {
        setError('تحقق من بيانات تسجيل الدخول ثم حاول مرة أخرى.')
      } else {
        setError('تعذر تسجيل الدخول حاليا. حاول لاحقا.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[var(--surface-card)]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur md:p-8"
        onSubmit={onSubmit}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--primary-color)]/35 bg-[var(--primary-color)]/10 text-2xl">
            🏆
          </div>
          <h1 className="mt-4 text-2xl font-semibold">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">منصة إدارة البطولات متعددة المستأجرين</p>
        </div>

        {error ? (
          <p className="mb-4 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
        ) : null}

        <label className="mb-2 block text-sm text-[var(--text-secondary)]" htmlFor="username">
          اسم المستخدم
        </label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mb-4 min-h-11 w-full rounded-2xl border border-white/15 bg-black/25 px-3 py-2 outline-none transition focus:border-[var(--primary-color)]/70"
          placeholder="أدخل اسم المستخدم"
          autoComplete="username"
          required
        />

        <label className="mb-2 block text-sm text-[var(--text-secondary)]" htmlFor="password">
          كلمة المرور
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-6 min-h-11 w-full rounded-2xl border border-white/15 bg-black/25 px-3 py-2 outline-none transition focus:border-[var(--primary-color)]/70"
          placeholder="أدخل كلمة المرور"
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          className="min-h-11 w-full rounded-2xl bg-[var(--primary-color)] px-3 py-2 font-semibold text-[#07162b] transition hover:brightness-105 disabled:opacity-70"
          disabled={loading}
        >
          {loading ? 'جار تسجيل الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
