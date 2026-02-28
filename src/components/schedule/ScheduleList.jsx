import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'
import { useSwipePages } from '../../hooks/useSwipePages'

const ROWS_PER_PAGE = 4

export function ScheduleList() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const liveMatchId = useTournamentStore((s) => s.liveMatchState.matchId)

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const sorted = useMemo(() => {
    const list = (matches ?? []).slice()
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)))
    return list
  }, [matches])

  const { page, pageIndex, pages, swipeHandlers } = useSwipePages(sorted, ROWS_PER_PAGE, 11000)

  return (
    <section className="flex h-full flex-col gap-3 overflow-hidden px-2 py-2" {...swipeHandlers}>
      <h2 className="shrink-0 text-center font-headline text-[clamp(1.6rem,3.4vw,4rem)] font-semibold">جدول المباريات</h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={pageIndex}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="grid min-h-0 flex-1 auto-rows-fr gap-3"
        >
          {page.map((match) => (
            <article
              key={match.id}
              className={[
                'grid grid-cols-[1.7fr_1fr_1.7fr] items-center gap-4 rounded-xl border px-4 py-4',
                match.id === liveMatchId ? 'border-[var(--primary-color)]/45 bg-[var(--primary-color)]/12' : 'border-white/10 bg-black/20',
              ].join(' ')}
            >
              <p className="truncate text-right font-headline text-[clamp(1.4rem,2.8vw,3.4rem)]">{teamById.get(match.homeTeamId)?.teamName || '--'}</p>
              <div className="flex flex-col items-center gap-0.5 text-center">
                <p className="font-latin text-[clamp(1.6rem,3.4vw,4rem)] text-[var(--secondary-color)]">
                  {formatArabicNumber(match.homeScore ?? 0)} : {formatArabicNumber(match.awayScore ?? 0)}
                </p>
                <p className="font-headline text-[clamp(0.85rem,1.2vw,1.4rem)] text-white/75">{statusLabel(match.status)}</p>
                <p className="font-latin text-[clamp(0.75rem,0.95vw,1.1rem)] text-white/50">#{formatArabicNumber(match.order ?? 0)}</p>
              </div>
              <p className="truncate text-left font-headline text-[clamp(1.4rem,2.8vw,3.4rem)]">{teamById.get(match.awayTeamId)?.teamName || '--'}</p>
            </article>
          ))}
        </motion.div>
      </AnimatePresence>

      {pages.length > 1 ? <p className="shrink-0 text-center font-latin text-xs text-white/60">{pageIndex + 1} / {pages.length}</p> : null}
    </section>
  )
}

function statusLabel(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'pending') return 'Upcoming'
  if (value === 'live') return 'Live'
  if (value === 'finished' || value === 'ended') return 'Ended'
  if (value === 'et' || value === 'extra_time') return 'ET'
  if (value === 'penalties' || value === 'pens') return 'Penalties'
  return 'Live'
}
