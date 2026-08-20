import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../common/AppIcon'
import ShinyText from '../reactbits/ShinyText'

export default function AppSidebar({ items, userName, roleLabel, onNavigate, onLogout }) {
  const { branding } = useAuth()
  const { t, isRtl, language } = useLanguage()

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* Brand Header */}
      <div className="mb-4">
        {branding?.animated_logo_url ? (
          <video
            src={branding.animated_logo_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full rounded-xl border border-white/10 bg-black/40"
          />
        ) : (
          <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-950/40 via-slate-900/60 to-slate-950/80 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/40 bg-sky-500/20 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                <AppIcon name="trophy" size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  FIFA ESPORTS
                </p>
                <ShinyText
                  text={branding?.brand_name || t('appName')}
                  className="text-sm font-black text-white truncate max-w-[170px]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Card */}
      <div className="mb-3 rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300">
            <AppIcon name="user" size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{userName || '--'}</p>
            <p className="truncate text-[11px] font-medium text-slate-400">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-1 py-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'group flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all duration-200',
                isActive
                  ? 'border-sky-400/50 bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-transparent text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                  : 'border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.08] hover:text-white',
              ].join(' ')
            }
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-colors group-hover:text-sky-400"
              aria-hidden="true"
            >
              <AppIcon name={item.icon} size={15} />
            </span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sign Out Button */}
      <button
        type="button"
        onClick={onLogout}
        className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20 hover:border-rose-400 active:scale-95"
      >
        <AppIcon name="logout" size={14} className="text-rose-400" />
        <span>{t('navLogout')}</span>
      </button>
    </aside>
  )
}
