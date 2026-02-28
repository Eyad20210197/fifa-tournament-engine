import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'
import { useSwipePages } from '../../hooks/useSwipePages'

const ROWS_PER_PAGE = 6

export function StandingsTable() {
  const standings = useTournamentStore((s) => s.standings)
  const teams = useTournamentStore((s) => s.teams)

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const sorted = useMemo(() => {
    const list = (standings ?? []).slice()
    list.sort((a, b) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0)
      if ((b.gd ?? 0) !== (a.gd ?? 0)) return (b.gd ?? 0) - (a.gd ?? 0)
      return (b.gf ?? 0) - (a.gf ?? 0)
    })
    return list.map((row, index) => ({ ...row, rank: index + 1 }))
  }, [standings])

  const { page, pageIndex, pages, swipeHandlers } = useSwipePages(sorted, ROWS_PER_PAGE, 11000)

  return (
    <section className="flex h-full flex-col gap-3 overflow-hidden px-2 py-2" {...swipeHandlers}>
      <h2 className="shrink-0 text-center font-headline text-[clamp(1.6rem,3.4vw,4rem)] font-semibold">جدول الترتيب</h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={pageIndex}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="grid min-h-0 flex-1 auto-rows-fr gap-2"
        >
          {page.map((row) => (
            <article key={row.teamId || row.rank} className="grid grid-cols-[0.35fr_1.7fr_0.55fr_0.55fr_0.55fr_0.65fr] items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-center font-latin text-[clamp(1.2rem,2.3vw,2.8rem)] text-[var(--secondary-color)]">{formatArabicNumber(row.rank)}</p>
              <p className="truncate font-headline text-[clamp(1.2rem,2.6vw,3.2rem)]">{teamById.get(row.teamId)?.teamName || '--'}</p>
              <Stat label="لعب" value={row.played} />
              <Stat label="فارق" value={row.gd} />
              <Stat label="له" value={row.gf} />
              <Stat label="نقاط" value={row.points} emphasize />
            </article>
          ))}
        </motion.div>
      </AnimatePresence>

      {pages.length > 1 ? <p className="shrink-0 text-center font-latin text-xs text-white/60">{pageIndex + 1} / {pages.length}</p> : null}
    </section>
  )
}

function Stat({ label, value, emphasize = false }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <p className="text-[clamp(0.65rem,0.9vw,1rem)] text-white/55">{label}</p>
      <p className={['font-latin text-[clamp(1.1rem,2vw,2.3rem)]', emphasize ? 'text-[var(--secondary-color)]' : 'text-white/90'].join(' ')}>
        {formatArabicNumber(value ?? 0)}
      </p>
    </div>
  )
}
