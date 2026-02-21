import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments } from '../../services/tournamentService'
import { fetchBusinesses } from '../../services/brandingService'
import { useAuth } from '../../auth/useAuth'
import { ROLES } from '../../auth/roles'
import { formatArabicNumber } from '../../utils/format'

export default function DashboardHomePage() {
  const { user, role } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0 })

  useEffect(() => {
    if (role === ROLES.SUPER_ADMIN) {
      fetchBusinesses()
        .then((rows) => {
          const active = rows.filter((item) => new Date(item.subscription_expires_at || 0).getTime() > Date.now()).length
          setStats({ total: rows.length, active, draft: Math.max(0, rows.length - active) })
        })
        .catch(() => setStats({ total: 0, active: 0, draft: 0 }))
      return
    }

    fetchTournaments()
      .then((rows) => {
        const active = rows.filter((item) => item.status === 'scheduled' || item.status === 'live').length
        const draft = rows.filter((item) => item.status === 'draft').length
        setStats({ total: rows.length, active, draft })
      })
      .catch(() => setStats({ total: 0, active: 0, draft: 0 }))
  }, [role])

  const cards =
    role === ROLES.SUPER_ADMIN
      ? [
          { label: 'Total Businesses', value: stats.total },
          { label: 'Active Subscriptions', value: stats.active },
          { label: 'Expired Subscriptions', value: stats.draft },
        ]
      : [
          { label: 'Total Tournaments', value: stats.total },
          { label: 'Scheduled / Live', value: stats.active },
          { label: 'Draft Tournaments', value: stats.draft },
        ]

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-2xl font-semibold">Welcome, {user?.username || '--'}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Operational snapshot with direct shortcuts.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--secondary-color)]">{formatArabicNumber(card.value)}</p>
          </article>
        ))}
      </div>

      {role === ROLES.ADMIN ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-[var(--text-secondary)]">Admin workflow</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/saas/schedule" className="rounded-xl bg-[var(--primary-color)] px-3 py-2 text-xs font-semibold text-[#07162b]">
              Manage Tournament
            </Link>
            <Link to="/saas/finance" className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs">
              Finance
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  )
}
