import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import { InteractiveBackground } from '../components/common/InteractiveBackground'

export default function PrototypeLayout() {
  const { t, language, toggleLanguage, isRtl } = useLanguage()
  const branding = usePrototypeStore((s) => s.branding)
  const resetToDefaults = usePrototypeStore((s) => s.resetToDefaults)
  const location = useLocation()

  const navLinks = [
    { path: '/', label: t('navHub'), icon: 'sparkles' },
    { path: '/display', label: t('navDisplay'), icon: 'tv' },
    { path: '/control', label: t('navControl'), icon: 'gamepad' },
    { path: '/schedule', label: t('navSchedule'), icon: 'calendar' },
    { path: '/stations', label: t('navStations'), icon: 'timer' },
    { path: '/branding', label: t('navBranding'), icon: 'palette' },
    { path: '/finance', label: t('navFinance'), icon: 'dollar' },
    { path: '/super-admin', label: t('navSuperAdmin'), icon: 'building' },
  ]

  const isDisplayRoute = location.pathname === '/display'

  return (
    <div className="relative min-h-screen bg-[#040711] text-slate-100 flex flex-col font-sans">
      <InteractiveBackground />

      {/* Top Floating Showcase Bar */}
      {!isDisplayRoute && (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-4 py-2.5 shadow-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            {/* Brand Logo & Title */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition group-hover:scale-105">
                <AppIcon name="trophy" size={20} />
              </div>
              <div>
                <ShinyText
                  text={branding?.brand_name || t('appName')}
                  className="text-sm font-black text-white"
                />
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                    {t('prototypeBadge')}
                  </p>
                </div>
              </div>
            </Link>

            {/* Quick Demo Navigation Tabs */}
            <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 p-1">
              {navLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'border border-sky-400 bg-sky-500/25 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                        : 'border border-transparent text-slate-400 hover:border-white/10 hover:text-white'
                    }`
                  }
                >
                  <AppIcon name={item.icon} size={14} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Right Controls: Reset Data & Language Switcher */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(language === 'ar' ? 'هل تريد استعادة البيانات التجريبية الافتراضية؟' : 'Reset all demo data to default?')) {
                    resetToDefaults()
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                title={language === 'ar' ? 'استعادة البيانات الافتراضية' : 'Reset Demo State'}
              >
                <AppIcon name="refresh" size={13} />
                <span className="hidden sm:inline">{language === 'ar' ? 'إعادة ضبط' : 'Reset Data'}</span>
              </button>

              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 active:scale-95"
              >
                <AppIcon name="globe" size={13} className="text-sky-400" />
                <span>{language === 'ar' ? 'English' : 'عربي'}</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Showcase Page Content */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Showcase Footer Note */}
      {!isDisplayRoute && (
        <footer className="border-t border-white/10 bg-slate-950/60 py-4 px-4 text-center text-xs text-slate-400">
          <p className="flex items-center justify-center gap-2 font-mono">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            <span>{t('syncNotice')}</span>
          </p>
        </footer>
      )}
    </div>
  )
}
