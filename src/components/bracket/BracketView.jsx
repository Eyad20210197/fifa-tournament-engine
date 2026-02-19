import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'

export function BracketView() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)

  const { rounds, nameById } = useMemo(() => {
    const nameMap = new Map(teams.map((team) => [team.id, team.teamName]))
    const knockoutMatches = matches.filter((item) => item.mode === 'knockout').slice()
    knockoutMatches.sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || (a.order ?? 0) - (b.order ?? 0))

    const grouped = new Map()
    for (const match of knockoutMatches) {
      const round = match.round ?? 1
      if (!grouped.has(round)) grouped.set(round, [])
      grouped.get(round).push(match)
    }

    return {
      rounds: [...grouped.entries()].sort((a, b) => a[0] - b[0]),
      nameById: (id) => (id ? nameMap.get(id) || '--' : '--'),
    }
  }, [matches, teams])

  return (
    <div className="h-full rounded-3xl border border-white/10 bg-black/20 p-[2vw]">
      <h2 className="mb-4 text-[clamp(1.2rem,2.3vw,3rem)] font-semibold">شجرة البطولة</h2>

      {rounds.length ? (
        <div className="flex h-[72vh] gap-3 overflow-auto pb-2 md:flex-row flex-col">
          {rounds.map(([roundNumber, roundMatches], roundIndex) => (
            <section key={roundNumber} className="min-w-[260px] flex-1 rounded-2xl border border-white/10 bg-black/25 p-3">
              <h3 className="mb-3 text-sm text-[var(--text-secondary)]">الدور {formatArabicNumber(roundNumber)}</h3>
              <div className="space-y-3">
                {roundMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    nameById={nameById}
                    highlight={roundIndex === rounds.length - 1}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid h-[60vh] place-items-center rounded-2xl border border-white/10 bg-black/25 text-[var(--text-secondary)]">
          لا توجد شجرة إقصائية بعد.
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, nameById, highlight = false }) {
  const status = match.status === 'finished' ? 'انتهت' : match.status === 'live' ? 'مباشر' : 'لم تبدأ'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={[
        'rounded-2xl border bg-black/35 p-3',
        highlight ? 'border-[var(--primary-color)]/40' : 'border-white/10',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{status}</span>
        <span className="font-semibold text-[var(--secondary-color)]">
          {formatArabicNumber(match.homeScore ?? 0)} - {formatArabicNumber(match.awayScore ?? 0)}
        </span>
      </div>
      <p className="truncate text-sm font-semibold">{nameById(match.homeTeamId)}</p>
      <p className="mt-1 truncate text-sm font-semibold">{nameById(match.awayTeamId)}</p>
    </motion.article>
  )
}
