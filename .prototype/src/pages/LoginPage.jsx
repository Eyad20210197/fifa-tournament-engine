import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, language, toggleLanguage, isRtl } = useLanguage()
  const branding = usePrototypeStore((s) => s.branding)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const quickRoles = [
    {
      role: 'SUPER_ADMIN',
      title: language === 'ar' ? 'المشرف العام (Super Admin)' : 'Super Admin',
      username: 'superadmin',
      redirectTo: '/super-admin',
      icon: 'building',
      color: 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20',
    },
    {
      role: 'ADMIN',
      title: language === 'ar' ? 'مدير الصالة (Arena Admin)' : 'Business Arena Admin',
      username: 'admin',
      redirectTo: '/schedule',
      icon: 'trophy',
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    },
    {
      role: 'OPERATOR',
      title: language === 'ar' ? 'حكم المباراة (Referee / Operator)' : 'Match Referee Operator',
      username: 'operator',
      redirectTo: '/control',
      icon: 'gamepad',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
    },
    {
      role: 'DISPLAY',
      title: language === 'ar' ? 'شاشة العرض (Spectator Cinema)' : 'Spectator Cinema Display',
      username: 'spectator',
      redirectTo: '/display',
      icon: 'tv',
      color: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20',
    },
  ]

  function handleLogin(targetRoute = '/', userRole = 'ADMIN') {
    setLoading(true)
    setTimeout(() => {
      localStorage.setItem('fifa_prototype_logged_in', 'true')
      localStorage.setItem('fifa_prototype_user_role', userRole)
      setLoading(false)
      navigate(targetRoute, { replace: true })
    }, 200)
  }

  function onSubmit(e) {
    e.preventDefault()
    const role = username.toLowerCase().includes('super')
      ? 'SUPER_ADMIN'
      : username.toLowerCase().includes('operator')
      ? 'OPERATOR'
      : 'ADMIN'
    const target = role === 'SUPER_ADMIN' ? '/super-admin' : role === 'OPERATOR' ? '/control' : '/schedule'
    handleLogin(target, role)
  }

  return (
    <div className="relative grid min-h-[90vh] place-items-center px-4 py-8">
      {/* Top Floating Language Switcher */}
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

      <SpotlightCard className="w-full max-w-md border border-white/10 bg-slate-950/85 p-6 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] md:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/20 text-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.3)]">
            <AppIcon name="trophy" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            <ShinyText text={branding?.brand_name || t('appName')} />
          </h1>
          <p className="text-xs text-slate-400">
            {language === 'ar'
              ? 'تسجيل الدخول التفاعلي لنسخة العرض (Showcase Prototype)'
              : 'Interactive Showcase Prototype Authentication'}
          </p>
        </div>

        {/* Standard Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'اسم المستخدم' : 'Username'}
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
              placeholder="admin / superadmin / operator"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-400 bg-sky-500 py-3 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:bg-sky-400 active:scale-95 transition"
          >
            <AppIcon name="check" size={16} />
            <span>{loading ? t('loading') : (language === 'ar' ? 'تسجيل الدخول' : 'Sign In')}</span>
          </button>
        </form>

        {/* 1-Click Quick Demo Switcher */}
        <div className="space-y-2.5 pt-3 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
            {language === 'ar' ? '⚡ الدخول السريع بنقرة واحدة (1-Click Demo Roles)' : '⚡ 1-Click Quick Demo Login'}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {quickRoles.map((qr) => (
              <button
                key={qr.role}
                type="button"
                onClick={() => handleLogin(qr.redirectTo, qr.role)}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-bold transition ${qr.color}`}
              >
                <AppIcon name={qr.icon} size={15} className="shrink-0" />
                <span className="truncate">{qr.title}</span>
              </button>
            ))}
          </div>
        </div>
      </SpotlightCard>
    </div>
  )
}
