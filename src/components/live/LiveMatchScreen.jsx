import { memo, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'
import { TimerDisplay } from './TimerDisplay'
import { SponsorTicker } from './SponsorTicker'

const ROTATE_MS = 10000

export const LiveMatchScreen = memo(function LiveMatchScreen() {
  const { matchId, matches, teams, sponsorUrls } = useTournamentStore(
    useShallow((s) => ({
      matchId: s.liveMatchState.matchId,
      matches: s.matches,
      teams: s.teams,
      sponsorUrls: s.sponsor.urls,
    })),
  )

  const featuredMatches = useMemo(() => {
    const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id))
    const liveMatches = matches.filter((item) => item.status === 'live').sort(byOrder)
    if (!liveMatches.length) return []
    const focused = matchId ? liveMatches.find((item) => item.id === matchId) : null
    return focused ? [focused, ...liveMatches.filter((item) => item.id !== focused.id)] : liveMatches
  }, [matches, matchId])

  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const [activeIndex, setActiveIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0)
  }, [featuredMatches.length, matchId])

  useEffect(() => {
    if (featuredMatches.length <= 1) return undefined
    const id = setInterval(() => {
      setActiveIndex((value) => (value + 1) % featuredMatches.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [featuredMatches.length])

  const activeMatch = featuredMatches[activeIndex] ?? null

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(140deg,rgba(11,15,24,0.92),rgba(5,8,14,0.96))] p-4">
      <h2 className="shrink-0 text-center font-headline text-[clamp(1.3rem,2.6vw,3rem)] font-semibold text-white">المباريات المباشرة</h2>

      {activeMatch ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeMatch.id}
            initial={reduceMotion ? { opacity: 0 } : { x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: -120, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4"
          >
            <TimerDisplay matchId={activeMatch.id} className="font-latin text-[clamp(1.4rem,2.8vw,3.2rem)] text-[var(--secondary-color)] tabular-nums" />
            <p className="font-headline text-[clamp(1rem,1.6vw,1.8rem)] text-white/80">{statusLabel(activeMatch.status)}</p>

            <article className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4">
              <TeamName
                align="right"
                teamName={teamMap.get(activeMatch.homeTeamId)?.teamName || '--'}
                clubName={teamMap.get(activeMatch.homeTeamId)?.clubName || '--'}
              />
              <ScoreBoard homeScore={activeMatch.homeScore} awayScore={activeMatch.awayScore} />
              <TeamName
                align="left"
                teamName={teamMap.get(activeMatch.awayTeamId)?.teamName || '--'}
                clubName={teamMap.get(activeMatch.awayTeamId)?.clubName || '--'}
              />
            </article>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center rounded-3xl border border-white/10 bg-black/20 p-4 text-center">
          <p className="font-arabic text-[clamp(1.1rem,1.8vw,2rem)] text-[var(--text-secondary)]">لا توجد مباريات مباشرة حاليا</p>
        </div>
      )}

      <SponsorTicker sponsorUrls={sponsorUrls} speed={90} className="mt-2 shrink-0" />
    </section>
  )
})

const TeamName = memo(function TeamName({ teamName, clubName, align }) {
  return (
    <div className={['min-w-0 flex flex-col gap-1', align === 'left' ? 'items-start text-left' : 'items-end text-right'].join(' ')}>
      <p className="w-full truncate font-headline text-[clamp(1.6rem,3.8vw,4.8rem)] text-white" title={teamName}>
        {teamName}
      </p>
      <p className="w-full truncate font-arabic text-[clamp(0.85rem,1.3vw,1.5rem)] text-white/65" title={clubName}>
        {clubName}
      </p>
    </div>
  )
})

const ScoreBoard = memo(function ScoreBoard({ homeScore, awayScore }) {
  return (
    <div className="grid min-w-[clamp(180px,20vw,320px)] grid-cols-[1fr_auto_1fr] items-center justify-items-center gap-3">
      <span className="font-latin text-[clamp(2.8rem,7vw,8.2rem)] text-[var(--secondary-color)] tabular-nums">{formatArabicNumber(homeScore ?? 0)}</span>
      <span className="font-latin text-[clamp(1.5rem,2.8vw,3.2rem)] text-white/55">:</span>
      <span className="font-latin text-[clamp(2.8rem,7vw,8.2rem)] text-[var(--secondary-color)] tabular-nums">{formatArabicNumber(awayScore ?? 0)}</span>
    </div>
  )
})

function statusLabel(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'live') return 'Live'
  if (value === 'finished' || value === 'ended') return 'Ended'
  if (value === 'et' || value === 'extra_time') return 'ET'
  if (value === 'penalties' || value === 'pens') return 'Penalties'
  return 'Live'
}
