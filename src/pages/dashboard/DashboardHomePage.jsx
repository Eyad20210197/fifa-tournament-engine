import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments } from '../../services/tournamentService'
import { fetchBusinesses } from '../../services/brandingService'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { ROLES } from '../../auth/roles'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

export default function DashboardHomePage() {
  const { user, role } = useAuth()
  const { t, language, isRtl } = useLanguage()
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0 })
  const [recentTournaments, setRecentTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role === ROLES.SUPER_ADMIN) {
      fetchBusinesses()
        .then((rows) => {
          const active = rows.filter((item) => new Date(item.subscription_expires_at || 0).getTime() > Date.now()).length
          setStats({ total: rows.length, active, draft: Math.max(0, rows.length - active) })
          setLoading(false)
        })
        .catch(() => {
          setStats({ total: 0, active: 0, draft: 0 })
          setLoading(false)
        })
      return
    }

    fetchTournaments()
      .then((rows) => {
        const active = rows.filter((item) => item.status === 'scheduled' || item.status === 'live').length
        const draft = rows.filter((item) => item.status === 'draft').length
        setStats({ total: rows.length, active, draft })
        setRecentTournaments(rows.slice(0, 4))
        setLoading(false)
      })
      .catch(() => {
        setStats({ total: 0, active: 0, draft: 0 })
        setLoading(false)
      })
  }, [role])

  const kpis =
    role === ROLES.SUPER_ADMIN
      ? [
          { label: language === 'ar' ? 'إجمالي الأنشطة التجارية' : 'Total Venues', value: stats.total, icon: 'building', color: 'text-sky-400', border: 'border-sky-500/30' },
          { label: language === 'ar' ? 'الاشتراكات النشطة' : 'Active Subscriptions', value: stats.active, icon: 'check', color: 'text-emerald-400', border: 'border-emerald-500/30' },
          { label: language === 'ar' ? 'الاشتراكات المنتهية' : 'Expired Subscriptions', value: stats.draft, icon: 'alert', color: 'text-rose-400', border: 'border-rose-500/30' },
        ]
      : [
          { label: t('activeTournaments'), value: stats.active, icon: 'trophy', color: 'text-amber-400', border: 'border-amber-500/30' },
          { label: language === 'ar' ? 'إجمالي البطولات المنشأة' : 'Total Championships', value: stats.total, icon: 'chart', color: 'text-sky-400', border: 'border-sky-500/30' },
          { label: language === 'ar' ? 'مسودات قيد التجهيز' : 'Drafts in Preparation', value: stats.draft, icon: 'edit', color: 'text-purple-400', border: 'border-purple-500/30' },
        ]

  return (
    <section className="space-y-6">
      {/* Welcome Hero Banner */}
      <SpotlightCard className="border border-sky-500/20 bg-gradient-to-r from-slate-950 via-sky-950/30 to-slate-950 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-sky-400">
                {language === 'ar' ? 'النظام متصل • منصة فيفا العالمية' : 'SYSTEM ONLINE • GLOBAL FIFA TOURNAMENT'}
              </p>
            </div>
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              {language === 'ar' ? `مرحباً بك، ${user?.username || 'الكابتن'}` : `Welcome, ${user?.username || 'Captain'}`}
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              {t('appSubtitle')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/saas/schedule"
              className="flex items-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition hover:bg-sky-400 active:scale-95"
            >
              <AppIcon name="plus" size={15} />
              <span>{t('createNewTournament')}</span>
            </Link>

            <Link
              to="/display"
              target="_blank"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 active:scale-95"
            >
              <AppIcon name="display" size={15} className="text-amber-400" />
              <span>{t('launchDisplay')}</span>
            </Link>

            <Link
              to="/control"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 active:scale-95"
            >
              <AppIcon name="gamepad" size={15} className="text-emerald-400" />
              <span>{t('openMatchControl')}</span>
            </Link>
          </div>
        </div>
      </SpotlightCard>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <SpotlightCard key={idx} className={`border ${kpi.border} bg-slate-950/80 p-5`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">{kpi.label}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                <AppIcon name={kpi.icon} size={18} className={kpi.color} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-white">
              {loading ? '--' : kpi.value}
            </p>
          </SpotlightCard>
        ))}
      </div>

      {/* Quick Launchpad & Tournaments Section */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Active Tournaments / Recent List */}
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <AppIcon name="trophy" size={16} className="text-amber-400" />
              <span>{t('recentTournaments')}</span>
            </h3>
            <Link to="/saas/tournaments" className="text-xs font-bold text-sky-400 hover:text-sky-300">
              {t('all')} &rarr;
            </Link>
          </div>

          {recentTournaments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <AppIcon name="trophy" size={32} className="mx-auto mb-2 text-slate-600" />
              <p>{t('noActiveTournaments')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentTournaments.map((tourney) => (
                <div
                  key={tourney.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3.5 transition hover:border-sky-500/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{tourney.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {tourney.format} • {tourney.teams_count || 0} {language === 'ar' ? 'فريق' : 'teams'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      tourney.status === 'live'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    {tourney.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>

        {/* Station Runtime & Fast Controls */}
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <AppIcon name="gamepad" size={16} className="text-indigo-400" />
              <span>{t('stationsStatus')}</span>
            </h3>
            <Link to="/saas/device-runtime" className="text-xs font-bold text-sky-400 hover:text-sky-300">
              {language === 'ar' ? 'إدارة الأجهزة' : 'Manage'} &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">PS5 #{num}</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold">{t('online')}</p>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </div>
    </section>
  )
}
