import { useEffect, useState } from 'react'
import { fetchTournaments } from '../../services/tournamentService'
import { useAuth } from '../../auth/useAuth'

export default function DashboardHomePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ tournaments: '--', active: '--' })

  useEffect(() => {
    fetchTournaments()
      .then((rows) => {
        const active = rows.filter((item) => item.status === 'active').length
        setStats({ tournaments: rows.length, active })
      })
      .catch(() => setStats({ tournaments: '--', active: '--' }))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">???? ???? SaaS</h1>
      <p className="text-sm text-white/65">?????? {user?.username || '--'}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">?????? ????????</p>
          <p className="mt-2 text-xl font-semibold">{stats.tournaments}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">?????? ????</p>
          <p className="mt-2 text-xl font-semibold">{stats.active}</p>
        </div>
      </div>
    </div>
  )
}
