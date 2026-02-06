import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'

export function BracketView() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)

  const { rounds, nameById } = useMemo(() => {
    const nameMap = new Map(teams.map((t) => [t.id, t.teamName]))
    const ko = matches.filter((m) => m.mode === 'knockout').slice()
    ko.sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || (a.order ?? 0) - (b.order ?? 0))
    const grouped = new Map()
    for (const m of ko) {
      const r = m.round ?? 1
      if (!grouped.has(r)) grouped.set(r, [])
      grouped.get(r).push(m)
    }
    const orderedRounds = [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, ms]) => ({ round, label: ms[0]?.roundLabel ?? `الدور ${round}`, matches: ms }))
    return {
      rounds: orderedRounds,
      nameById: (id) => (id ? nameMap.get(id) ?? null : null),
    }
  }, [matches, teams])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur">
      <div className="text-sm text-white/60">خروج مغلوب</div>
      <div className="mt-2 text-3xl font-semibold">شجرة البطولة</div>
      {rounds.length ? (
        <div className="mt-6 grid gap-4 lg:grid-flow-col lg:auto-cols-fr">
          {rounds.map((r, idx) => (
            <div key={r.round} className="rounded-3xl border border-white/10 bg-black/15 p-4">
              <div className="text-sm text-white/70">{r.label}</div>
              <div className="mt-3 grid gap-3">
                {r.matches.map((m) => (
                  <MatchCard key={m.id} match={m} nameById={nameById} highlight={idx === rounds.length - 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-white/60">
          لا توجد شجرة بعد. اختر «خروج مغلوب» ثم قم بتوليد البطولة من لوحة التحكم.
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, nameById, highlight = false }) {
  const home = nameById(match.homeTeamId) || (match.homeTeamId ? '—' : 'انتظار')
  const away = nameById(match.awayTeamId) || (match.awayTeamId ? '—' : 'انتظار')
  const status = match.status === 'finished' ? 'انتهت' : match.status === 'live' ? 'مباشر' : 'لم تبدأ'
  const winner =
    match.winnerTeamId && (match.winnerTeamId === match.homeTeamId || match.winnerTeamId === match.awayTeamId)
      ? match.winnerTeamId
      : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={[
        'rounded-2xl border bg-black/25 p-4',
        highlight ? 'border-[#c9a227]/40 shadow-[0_0_20px_rgba(201,162,39,0.10)]' : 'border-white/10',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3 text-xs text-white/60">
        <div>{status}</div>
        <div className="font-semibold text-[#f6d365]">
          {(match.homeScore ?? 0)}:{(match.awayScore ?? 0)}
        </div>
      </div>
      <motion.div
        layout
        className={['mt-2 text-sm font-semibold', winner === match.homeTeamId ? 'text-[#f6d365]' : 'text-white/90'].join(' ')}
      >
        {home}
      </motion.div>
      <motion.div
        layout
        className={['mt-1 text-sm font-semibold', winner === match.awayTeamId ? 'text-[#f6d365]' : 'text-white/90'].join(' ')}
      >
        {away}
      </motion.div>
    </motion.div>
  )
}
