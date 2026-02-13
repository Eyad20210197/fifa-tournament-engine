import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { RamadanStage } from '../components/common/RamadanStage'
import { hasValidSession, loginWithCredentials } from '../auth/authUtils'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const query = useMemo(() => new URLSearchParams(location.search), [location.search])
  const reason = query.get('reason')

  if (hasValidSession()) {
    return <Navigate to="/control" replace />
  }

  function onSubmit(event) {
    event.preventDefault()
    setError('')

    const result = loginWithCredentials(username, password)
    if (!result.ok) {
      if (result.reason === 'expired') {
        setError('انتهت مدة الاشتراك')
        return
      }
      setError('بيانات الدخول غير صحيحة')
      return
    }

    navigate('/control', { replace: true })
  }

  return (
    <RamadanStage>
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-xs text-white/60">دخول النظام</div>
          <h1 className="mt-2 text-2xl font-semibold text-white/95">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-white/70">أدخل اسم المستخدم وكلمة المرور للوصول إلى لوحة التحكم والبث.</p>

          {reason === 'expired' ? (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              انتهت مدة الاشتراك
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-2 block text-sm text-white/85" htmlFor="username">
                اسم المستخدم
              </label>
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c9a227]/60"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/85" htmlFor="password">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c9a227]/60"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#c9a227] px-4 py-3 text-sm font-semibold text-[#07162b] transition hover:bg-[#f6d365]"
            >
              دخول
            </button>
          </form>
        </div>
      </div>
    </RamadanStage>
  )
}

