import { NavLink } from 'react-router-dom'

export default function AppSidebar({ items, userName, roleLabel, onNavigate, onLogout }) {
  return (
    <aside className="flex h-full flex-col rounded-3xl border border-white/10 bg-[var(--surface-card)]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-[var(--text-secondary)]">منصة إدارة البطولات</p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">لوحة التحكم</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{userName || '--'} • {roleLabel}</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition',
                isActive
                  ? 'border-[var(--primary-color)]/40 bg-[var(--primary-color)]/12 text-[var(--secondary-color)]'
                  : 'border-transparent bg-white/5 text-[var(--text-primary)] hover:border-white/10 hover:bg-white/10',
              ].join(' ')
            }
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="mt-4 min-h-11 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
        onClick={onLogout}
      >
        تسجيل الخروج
      </button>
    </aside>
  )
}
