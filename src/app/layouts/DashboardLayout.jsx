import { NavLink, Outlet } from 'react-router-dom'
import { useUiStore } from '../../store/uiStore'
import { useAuth } from '../../auth/useAuth'

const navItems = [
  { to: '/saas', label: '???? ??????', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
  { to: '/saas/businesses', label: '???????', roles: ['SUPER_ADMIN'] },
  { to: '/saas/tournaments', label: '????????', roles: ['ADMIN', 'STAFF'] },
  { to: '/saas/finance', label: '???????', roles: ['ADMIN'] },
  { to: '/saas/branding', label: '??????? ????????', roles: ['ADMIN', 'STAFF'] },
]

export default function DashboardLayout() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const { user, role, logout } = useAuth()

  const visibleNav = navItems.filter((item) => item.roles.includes(role))

  return (
    <div className="min-h-screen bg-[#07162b] text-white">
      <div className="mx-auto flex max-w-7xl gap-4 px-3 py-4 md:px-4">
        <button
          className="fixed right-3 top-3 z-50 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs md:hidden"
          onClick={toggleSidebar}
        >
          ???????
        </button>

        <aside
          className={[
            'fixed right-0 top-0 z-40 h-full w-64 border-l border-white/10 bg-[#0b1f3d] p-4 transition md:static md:h-auto md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
          ].join(' ')}
        >
          <h2 className="mb-1 text-lg font-semibold">???? SaaS</h2>
          <p className="mb-4 text-xs text-white/60">{user?.username || '--'} • {role || '--'}</p>

          <nav className="space-y-2">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  [
                    'block rounded-xl px-3 py-2 text-sm transition',
                    isActive
                      ? 'border border-[#c9a227]/40 bg-[#c9a227]/10 text-[#f6d365]'
                      : 'border border-transparent bg-white/5 text-white/85 hover:bg-white/10',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            className="mt-4 w-full rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
            onClick={() => logout({ redirect: true })}
          >
            ????? ??????
          </button>
        </aside>

        {sidebarOpen ? (
          <button className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} aria-label="close" />
        ) : null}

        <main className="min-w-0 flex-1 pt-12 md:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
