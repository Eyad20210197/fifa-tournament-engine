import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'
import { useSwipePages } from '../../hooks/useSwipePages'

const MATCHES_PER_PAGE = 4

export function BracketView() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)

  const stagePages = useMemo(() => {
    const nameById = new Map(teams.map((team) => [team.id, team.teamName]))
    const knockout = matches.filter((item) => item.mode === 'knockout').slice()
    knockout.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))

    const grouped = new Map()
    for (const match of knockout) {
      const stageName = String(match.stageName || `الجولة ${formatArabicNumber(match.round ?? 1)}`)
      if (!grouped.has(stageName)) grouped.set(stageName, [])
      grouped.get(stageName).push({
        ...match,
        homeName: nameById.get(match.homeTeamId) || '--',
        awayName: nameById.get(match.awayTeamId) || '--',
      })
    }

    const pages = []
    for (const [stageName, stageMatches] of grouped.entries()) {
      const totalParts = Math.ceil(stageMatches.length / MATCHES_PER_PAGE) || 1
      for (let i = 0; i < stageMatches.length; i += MATCHES_PER_PAGE) {
        pages.push({
          stageName,
          partIndex: Math.floor(i / MATCHES_PER_PAGE) + 1,
          totalParts,
          matches: stageMatches.slice(i, i + MATCHES_PER_PAGE),
        })
      }
    }
    return pages
  }, [matches, teams])

  const { page, pageIndex, pages, swipeHandlers } = useSwipePages(stagePages, 1, 12000)
  const active = page[0] || null

  if (!active) {
    return (
      <section className="grid h-full place-items-center overflow-hidden">
        <p className="font-headline text-[clamp(1.2rem,2vw,2.2rem)] text-white/65">لا توجد شجرة إقصائية بعد</p>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col gap-3 overflow-hidden px-2 py-2" {...swipeHandlers}>
      <h2 className="shrink-0 text-center font-headline text-[clamp(1.6rem,3.4vw,4rem)] font-semibold">شجرة البطولة</h2>
      <p className="shrink-0 text-center font-headline text-[clamp(1rem,1.8vw,2.2rem)] text-[var(--secondary-color)]">
        {active.stageName}
        {active.totalParts > 1 ? ` • ${active.partIndex}/${active.totalParts}` : ''}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={pageIndex}
          initial={{ x: 120, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -120, opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="grid min-h-0 flex-1 auto-rows-fr gap-3"
        >
          {active.matches.map((match) => {
            const isFinished = match.winner_team_id != null
            const homeWon = isFinished && match.winner_team_id === match.homeTeamId
            const awayWon = isFinished && match.winner_team_id === match.awayTeamId

            const homeClasses = [
              'truncate',
              'text-right',
              'font-headline',
              'text-[clamp(1.2rem,2.4vw,2.8rem)]',
              'text-cyan-50',
              homeWon ? 'text-yellow-400' : '',
              awayWon ? 'line-through' : '',
            ]
              .join(' ')
              .trim()

            const awayClasses = [
              'truncate',
              'text-left',
              'font-headline',
              'text-[clamp(1.2rem,2.4vw,2.8rem)]',
              'text-cyan-50',
              awayWon ? 'text-yellow-400' : '',
              homeWon ? 'line-through' : '',
            ]
              .join(' ')
              .trim()

            return (
              <article
                key={match.id}
                className="grid grid-cols-[1.7fr_1fr_1.7fr] items-center gap-4 rounded-xl border border-cyan-300/25 bg-[linear-gradient(120deg,rgba(7,19,42,0.75),rgba(0,0,0,0.55))] px-4 py-4 shadow-[0_0_28px_rgba(71,216,255,0.14)]"
              >
                <p className={homeClasses}>{match.homeName}</p>
                <div className="text-center">
                  <p className="font-latin text-[clamp(1.5rem,3vw,3.6rem)] text-[var(--secondary-color)]">
                    {isUpcomingMatch(match.status)
                      ? 'VS'
                      : `${formatArabicNumber(match.homeScore ?? 0)} : ${formatArabicNumber(match.awayScore ?? 0)}`}
                  </p>
                  <p className="font-headline text-[clamp(0.8rem,1.05vw,1.2rem)] text-cyan-100/80">
                    {match.legNumber === 2 ? 'إياب' : 'ذهاب'}
                  </p>
                  <p className="font-headline text-[clamp(0.8rem,1.05vw,1.2rem)] text-cyan-100/80">
                    {statusLabel(match.status)}
                  </p>
                </div>
                <p className={awayClasses}>{match.awayName}</p>
              </article>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {pages.length > 1 ? <p className="shrink-0 text-center font-latin text-xs text-white/60">{pageIndex + 1} / {pages.length}</p> : null}
    </section>
  )
}

function statusLabel(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'live') return 'Live'
  if (value === 'finished' || value === 'ended') return 'Ended'
  if (value === 'et' || value === 'extra_time') return 'ET'
  if (value === 'penalties' || value === 'pens') return 'Penalties'
  return 'Upcoming'
}

function isUpcomingMatch(status) {
  return String(status || '').toLowerCase() === 'pending'
}
