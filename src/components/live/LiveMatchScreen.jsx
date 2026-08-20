import { memo, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useTournamentStore } from '../../store/tournamentStore'
import { useLanguage } from '../../i18n/LanguageContext'
import { TimerDisplay } from './TimerDisplay'
import { SponsorTicker } from './SponsorTicker'
import AppIcon from '../common/AppIcon'

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

  const { t, language } = useLanguage()

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
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900/95 to-black p-4">
      {/* Title */}
      <h2 className="shrink-0 text-center font-headline text-[clamp(1.4rem,2.8vw,3.2rem)] font-black tracking-tight text-white flex items-center justify-center gap-3">
        <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
        <span>{language === 'ar' ? 'المباريات المباشرة' : 'LIVE ARENA MATCH'}</span>
      </h2>

      {activeMatch ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeMatch.id}
            initial={reduceMotion ? { opacity: 0 } : { x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: -100, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4"
          >
            {/* Clock Timer */}
            <div className="flex items-center gap-3 rounded-2xl border border-sky-400/30 bg-sky-950/50 px-6 py-2 shadow-[0_0_30px_rgba(56,189,248,0.25)]">
              <AppIcon name="timer" size={24} className="text-sky-400" />
              <TimerDisplay
                matchId={activeMatch.id}
                className="font-mono text-[clamp(1.8rem,3.2vw,3.8rem)] font-black text-white tabular-nums tracking-widest"
              />
            </div>

            <p className="font-bold text-xs uppercase tracking-widest text-emerald-400 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1">
              {activeMatch.stageName ? `${activeMatch.stageName} • ` : ''}
              {language === 'ar' ? 'الشوط جار الآن' : 'IN PLAY'}
            </p>

            {/* Scoreboard Arena */}
            <article className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-6 max-w-5xl">
              <TeamName
                align="right"
                teamName={teamMap.get(activeMatch.homeTeamId)?.teamName || '--'}
                clubName={teamMap.get(activeMatch.homeTeamId)?.clubName || 'Club 1'}
              />
              <ScoreBoard homeScore={activeMatch.homeScore} awayScore={activeMatch.awayScore} />
              <TeamName
                align="left"
                teamName={teamMap.get(activeMatch.awayTeamId)?.teamName || '--'}
                clubName={teamMap.get(activeMatch.awayTeamId)?.clubName || 'Club 2'}
              />
            </article>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center rounded-3xl border border-white/10 bg-slate-950/50 p-6 text-center">
          <div className="space-y-2">
            <AppIcon name="soccer" size={48} className="mx-auto text-slate-600 animate-bounce" />
            <p className="font-bold text-[clamp(1.1rem,1.8vw,2rem)] text-slate-400">
              {language === 'ar' ? 'لا توجد مباريات مباشرة في هذا الوقت' : 'No Live Matches In Play Right Now'}
            </p>
            <p className="text-xs text-slate-500">
              {language === 'ar' ? 'استخدم لوحة التحكم لبدء المباراة' : 'Use Match Control console to kick off next fixture'}
            </p>
          </div>
        </div>
      )}

      <SponsorTicker sponsorUrls={sponsorUrls} speed={90} className="mt-2 shrink-0" />
    </section>
  )
})

const TeamName = memo(function TeamName({ teamName, clubName, align }) {
  return (
    <div className={['min-w-0 flex flex-col gap-1', align === 'left' ? 'items-start text-left' : 'items-end text-right'].join(' ')}>
      <p className="w-full truncate font-headline text-[clamp(1.6rem,3.8vw,4.8rem)] font-black text-white" title={teamName}>
        {teamName}
      </p>
      <p className="w-full truncate text-[clamp(0.85rem,1.3vw,1.5rem)] text-slate-400 font-semibold" title={clubName}>
        {clubName}
      </p>
    </div>
  )
})

const ScoreBoard = memo(function ScoreBoard({ homeScore, awayScore }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/70 px-6 py-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <span className="font-mono text-[clamp(2.5rem,5vw,6rem)] font-black text-cyan-400 tabular-nums">
        {homeScore ?? 0}
      </span>
      <span className="text-[clamp(1.8rem,3vw,3.5rem)] font-bold text-slate-600">:</span>
      <span className="font-mono text-[clamp(2.5rem,5vw,6rem)] font-black text-amber-400 tabular-nums">
        {awayScore ?? 0}
      </span>
    </div>
  )
})
