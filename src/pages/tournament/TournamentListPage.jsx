import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments } from '../../services/tournamentService'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { ROLES } from '../../auth/roles'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

export default function TournamentListPage() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { role } = useAuth()
  const { t, language, isRtl } = useLanguage()

  useEffect(() => {
    fetchTournaments()
      .then((data) => {
        setTournaments(data || [])
        setLoading(false)
      })
      .catch(() => {
        setTournaments([])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return tournaments
    const q = search.toLowerCase()
    return tournaments.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.format || '').toLowerCase().includes(q))
  }, [tournaments, search])

  return (
    <section className="space-y-5">
      {/* Header & New Tournament Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
            <AppIcon name="trophy" size={22} />
          </div>
          <div>
            <ShinyText text={t('navTournaments')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">{t('appSubtitle')}</p>
          </div>
        </div>

        {role === ROLES.ADMIN ? (
          <Link
            to="/saas/schedule"
            className="flex items-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.3)] transition hover:bg-sky-400 active:scale-95"
          >
            <AppIcon name="plus" size={15} />
            <span>{t('createNewTournament')}</span>
          </Link>
        ) : null}
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 flex items-center px-3 text-slate-400">
          <AppIcon name="search" size={16} />
        </div>
        <input
          className={`w-full rounded-xl border border-white/15 bg-slate-900/80 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <SpotlightCard className="border border-white/10 bg-slate-950/80 py-12 text-center">
          <AppIcon name="trophy" size={36} className="mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">{t('noActiveTournaments')}</p>
        </SpotlightCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <SpotlightCard
              key={item.id}
              className="border border-white/10 bg-slate-950/80 p-5 transition hover:border-sky-500/40"
            >
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    ID #{item.id}
                  </span>
                  <h3 className="truncate text-base font-bold text-white mt-0.5">{item.name}</h3>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    item.status === 'live'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : item.status === 'scheduled'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-slate-800 text-slate-300 border border-white/10'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>{t('tournamentFormat')}:</span>
                  <strong className="text-white">{item.format}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('tournamentStartTime')}:</span>
                  <strong className="text-white">{item.starts_at ? new Date(item.starts_at).toLocaleDateString() : '--'}</strong>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                <Link
                  to="/control"
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <AppIcon name="gamepad" size={13} />
                  <span>{t('navControl')}</span>
                </Link>

                <Link
                  to="/display"
                  target="_blank"
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10"
                >
                  <AppIcon name="display" size={13} className="text-amber-400" />
                  <span>{t('navDisplay')}</span>
                </Link>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}
    </section>
  )
}
