import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

export default function SaasLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, role } = useAuth()
  const { t, language, toggleLanguage, isRtl } = useLanguage()

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
        setError(language === 'ar' ? 'يرجى إدخال اسم المستخدم وكلمة المرور.' : 'Please enter username and password.')
        return
      }

      const result = await login({ username: normalizedUsername, password: normalizedPassword })
      const from = location.state?.from
      const safeRedirect = typeof from === 'string' && from !== '/saas/login' ? from : result.redirectTo
      navigate(safeRedirect, { replace: true })
    } catch (requestError) {
      const backendMessage = String(requestError?.response?.data?.message || '').toLowerCase()
      if (backendMessage.includes('subscription expired')) {
        setError(language === 'ar' ? 'انتهى الاشتراك. يرجى التواصل مع الدعم.' : 'Subscription expired. Please contact support.')
      } else if (backendMessage.includes('invalid credentials')) {
        setError(language === 'ar' ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.')
      } else if (requestError?.response?.status === 400) {
        setError(language === 'ar' ? 'تحقق من بيانات تسجيل الدخول ثم حاول مرة أخرى.' : 'Please check your login details and try again.')
      } else {
        setError(language === 'ar' ? 'تعذر تسجيل الدخول حاليا. حاول لاحقا.' : 'Unable to sign in right now. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-8">
      {/* Language Switcher Floating in Top Corner */}
      <div className={`fixed top-4 z-50 ${isRtl ? 'left-4' : 'right-4'}`}>
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-slate-950/80 px-3.5 py-2 text-xs font-bold text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)] backdrop-blur-md transition hover:bg-sky-500/20 active:scale-95"
        >
          <AppIcon name="globe" size={15} className="text-sky-400" />
          <span>{language === 'ar' ? 'English' : 'عربي'}</span>
        </button>
      </div>

      <SpotlightCard className="w-full max-w-md border border-white/10 bg-slate-950/85 p-6 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] md:p-8">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/20 text-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.3)]">
              <AppIcon name="trophy" size={32} />
            </div>
            <h1 className="mt-4 text-2xl font-black text-white tracking-tight">
              <ShinyText text={t('appName')} />
            </h1>
            <p className="mt-1 text-xs text-slate-400">{t('appSubtitle')}</p>
          </div>

          {error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-200">
              <AppIcon name="alert" size={16} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300" htmlFor="username">
              {language === 'ar' ? 'اسم المستخدم' : 'Username'}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 flex items-center px-3 text-slate-400">
                <AppIcon name="user" size={16} />
              </div>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full rounded-xl border border-white/15 bg-slate-900/90 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                placeholder={language === 'ar' ? 'أدخل اسم المستخدم (مثال: admin)' : 'Enter username (e.g. admin)'}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300" htmlFor="password">
              {language === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 flex items-center px-3 text-slate-400">
                <AppIcon name="lock" size={16} />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl border border-white/15 bg-slate-900/90 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                placeholder={language === 'ar' ? 'أدخل كلمة المرور (مثال: Admin@123)' : 'Enter password'}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-sky-400 bg-sky-500 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition hover:bg-sky-400 disabled:opacity-50 active:scale-95"
          >
            {loading ? t('loading') : (language === 'ar' ? 'تسجيل الدخول إلى المنصة' : 'Sign In to Arena')}
          </button>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">{language === 'ar' ? 'حساب تجريبي افتراضي:' : 'Default Demo Login:'}</span>
            <span className="mx-1 text-sky-400 font-mono">admin</span> / <span className="text-amber-400 font-mono">Admin@123</span>
          </div>
        </form>
      </SpotlightCard>
    </div>
  )
}
