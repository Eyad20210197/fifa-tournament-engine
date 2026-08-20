import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { useLanguage } from '../../i18n/LanguageContext'
import { useSwipePages } from '../../hooks/useSwipePages'
import AppIcon from '../common/AppIcon'

const ROWS_PER_PAGE = 4

function getMatchStartMs(match) {
  const value = match?.startsAt || match?.starts_at || ''
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function ScheduleList() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const { language } = useLanguage()
  const [nowMs, setNowMs] = useState(0)

  useEffect(() => {
    const syncNow = () => setNowMs(Date.now())
    syncNow()
    const intervalId = setInterval(syncNow, 60000)
    return () => clearInterval(intervalId)
  }, [])

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const sorted = useMemo(() => {
    const list = (matches ?? []).slice()
    list.sort((a, b) => {
      const aTime = getMatchStartMs(a)
      const bTime = getMatchStartMs(b)
      if (aTime && bTime && aTime !== bTime) return aTime - bTime
      return (Number(a?.order || a?.id || 0)) - (Number(b?.order || b?.id || 0))
    })
    return list
  }, [matches])

  const { page, pageIndex, pages, swipeHandlers } = useSwipePages(sorted, ROWS_PER_PAGE, 11000)

  return (
    <section className="flex h-full flex-col gap-3 overflow-hidden px-3 py-2" {...swipeHandlers}>
      <h2 className="shrink-0 text-center font-headline text-[clamp(1.6rem,3.4vw,4rem)] font-black text-white flex items-center justify-center gap-3">
        <AppIcon name="calendar" size={32} className="text-sky-400" />
        <span>{language === 'ar' ? 'جدول مباريات البطولة' : 'TOURNAMENT MATCH FIXTURES'}</span>
      </h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={pageIndex}
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="grid min-h-0 flex-1 auto-rows-fr gap-3 max-w-5xl mx-auto w-full"
        >
          {page.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-slate-400 text-sm">
              {language === 'ar' ? 'لا توجد مباريات مجدولة حالياً' : 'No fixtures scheduled yet'}
            </div>
          ) : (
            page.map((match) => {
              const home = teamById.get(match.homeTeamId)?.teamName || '--'
              const away = teamById.get(match.awayTeamId)?.teamName || '--'
              const isLive = match.status === 'live'
              const isFinished = match.status === 'finished'

              return (
                <article
                  key={match.id}
                  className={`grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border p-4 transition-all ${
                    isLive
                      ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-950/30 via-slate-900/80 to-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'border-white/10 bg-slate-950/80'
                  }`}
                >
                  {/* Home Team */}
                  <div className="min-w-0 text-right">
                    <p className="truncate font-headline text-[clamp(1.1rem,2.2vw,2.5rem)] font-bold text-white">
                      {home}
                    </p>
                  </div>

                  {/* Center Score & Info */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/60 px-4 py-1.5 font-mono">
                      <span className="text-xl font-black text-cyan-300">{match.homeScore ?? 0}</span>
                      <span className="text-slate-500 font-bold">:</span>
                      <span className="text-xl font-black text-amber-300">{match.awayScore ?? 0}</span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
                        isLive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                          : isFinished
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {isLive ? (language === 'ar' ? 'مباشر الآن' : 'LIVE NOW') : isFinished ? (language === 'ar' ? 'انتهت' : 'FINISHED') : (language === 'ar' ? 'قيد الانتظار' : 'SCHEDULED')}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="min-w-0 text-left">
                    <p className="truncate font-headline text-[clamp(1.1rem,2.2vw,2.5rem)] font-bold text-white">
                      {away}
                    </p>
                  </div>
                </article>
              )
            })
          )}
        </motion.div>
      </AnimatePresence>

      {pages.length > 1 ? (
        <p className="shrink-0 text-center font-mono text-xs font-bold text-slate-400">
          {pageIndex + 1} / {pages.length}
        </p>
      ) : null}
    </section>
  )
}
