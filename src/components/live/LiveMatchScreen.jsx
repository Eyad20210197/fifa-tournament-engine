import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { useTournamentStore, computeRemainingMs } from '../../store/tournamentStore'
import { useNow } from '../../hooks/useNow'
import { playGoalSound } from '../../utils/sound'
import { GoalCelebration } from './GoalCelebration'
import { formatArabicNumber } from '../../utils/format'

export function LiveMatchScreen() {
  const matchId = useTournamentStore((s) => s.liveMatchState.matchId)
  const timer = useTournamentStore((s) => s.liveMatchState.timer)
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const sponsorLogo = useTournamentStore((s) => s.sponsor.logoBase64)
  const goalEvents = useTournamentStore((s) => s.liveMatchState.goalEvents)
  const now = useNow(250)

  const match = useMemo(() => {
    if (matchId) return matches.find((m) => m.id === matchId) ?? null
    return matches.find((m) => m.status === 'live') ?? null
  }, [matches, matchId])

  const featuredMatches = useMemo(() => {
    const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id))
    const live = matches.filter((m) => m.status === 'live').sort(byOrder)
    if (!live.length) return []

    if (!match) return live.slice(0, 4)

    const rest = live.filter((m) => m.id !== match.id)
    return [match, ...rest].slice(0, 4)
  }, [matches, match])

  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const home = match?.homeTeamId ? teamMap.get(match.homeTeamId) : null
  const away = match?.awayTeamId ? teamMap.get(match.awayTeamId) : null
  const remainingMs = computeRemainingMs(timer, now)

  const lastGoalIdRef = useRef(null)
  const lastGoal = goalEvents?.length ? goalEvents[goalEvents.length - 1] : null
  const goalAppliesToThisMatch = Boolean(lastGoal && match?.id && lastGoal.matchId === match.id)
  const showGoalOverlay = Boolean(goalAppliesToThisMatch && now - (lastGoal?.at ?? 0) < 1100)

  useEffect(() => {
    if (!lastGoal || !goalAppliesToThisMatch) return
    if (lastGoalIdRef.current === lastGoal.id) return
    lastGoalIdRef.current = lastGoal.id
    playGoalSound()
  }, [lastGoal, goalAppliesToThisMatch])

  return (
    <section className="relative flex h-full min-h-[72vh] flex-col justify-between rounded-3xl border border-white/10 bg-black/25 p-[2.2vw] backdrop-blur">
      <div className="mb-[1.8vh] flex items-center justify-between gap-4">
        <LivePill live={match?.status === 'live'} />
        <div className="rounded-2xl border border-[var(--primary-color)]/40 bg-[var(--primary-color)]/10 px-6 py-3 text-center">
          <p className="text-[clamp(0.75rem,1vw,1.2rem)] text-[var(--text-secondary)]">العد التنازلي</p>
          <p className="text-[clamp(1.7rem,3.2vw,4rem)] font-semibold text-[var(--secondary-color)]">{formatMs(remainingMs)}</p>
        </div>
      </div>

      {featuredMatches.length ? (
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          {featuredMatches.map((item, index) => (
            <LiveMatchCard key={item.id} match={item} teamMap={teamMap} highlighted={index === 0} />
          ))}
        </div>
      ) : (
        <div className="grid flex-1 place-items-center rounded-3xl border border-white/10 bg-black/20 p-6 text-center">
          <div>
            <p className="text-[clamp(1rem,1.5vw,1.6rem)] text-[var(--text-primary)]">لا توجد مباريات مباشرة حاليا</p>
            <p className="mt-2 text-[clamp(0.85rem,1.1vw,1.2rem)] text-[var(--text-secondary)]">
              ابدأ مباراة من صفحة التحكم لتظهر هنا بشكل مباشر
            </p>
          </div>
        </div>
      )}

      <footer className="mt-[2vh] grid min-h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-2">
        <p className="truncate text-[clamp(0.9rem,1.15vw,1.45rem)] text-[var(--text-primary)]">{home?.teamName || 'الفريق الأول'}</p>
        <div className="mx-auto rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-[clamp(0.8rem,1vw,1.1rem)] text-[var(--text-secondary)]">
          رعاية
        </div>
        <p className="truncate text-left text-[clamp(0.9rem,1.15vw,1.45rem)] text-[var(--text-primary)]">{away?.teamName || 'الفريق الثاني'}</p>

        <div className="col-span-3 mt-1 grid place-items-center rounded-xl border border-white/10 bg-white/5 py-2">
          {sponsorLogo ? (
            <img src={sponsorLogo} alt="الراعي" className="h-[clamp(36px,5vh,64px)] w-auto object-contain" loading="lazy" />
          ) : (
            <span className="text-[clamp(0.8rem,1vw,1.1rem)] text-[var(--text-secondary)]">مساحة الراعي</span>
          )}
        </div>
      </footer>

      <GoalCelebration
        open={showGoalOverlay}
        sideLabel={lastGoal?.side === 'home' ? 'هدف للفريق الأول' : 'هدف للفريق الثاني'}
        teamName={lastGoal?.side === 'home' ? home?.teamName : away?.teamName}
      />
    </section>
  )
}

function TeamPane({ team, align = 'start' }) {
  return (
    <div className={['flex flex-col items-center gap-4', align === 'end' ? 'lg:items-end' : 'lg:items-start'].join(' ')}>
      <div className="grid h-[clamp(80px,10vw,160px)] w-[clamp(80px,10vw,160px)] place-items-center overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        {team?.logo ? <img alt="شعار الفريق" src={team.logo} className="h-full w-full object-cover" /> : <span className="text-3xl">⚽</span>}
      </div>
      <p className="max-w-[20ch] truncate text-[clamp(1.1rem,2vw,2.7rem)] font-semibold">{team?.teamName || '—'}</p>
    </div>
  )
}

function LiveMatchCard({ match, teamMap, highlighted = false }) {
  const home = match?.homeTeamId ? teamMap.get(match.homeTeamId) : null
  const away = match?.awayTeamId ? teamMap.get(match.awayTeamId) : null

  return (
    <article
      className={[
        'rounded-3xl border bg-black/25 p-5 backdrop-blur',
        highlighted ? 'border-[var(--primary-color)]/45 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]' : 'border-white/10',
      ].join(' ')}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100">مباشر</span>
        <span className="text-xs text-[var(--text-secondary)]">مباراة #{formatArabicNumber(match?.order ?? 0)}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className="truncate text-right text-[clamp(0.95rem,1.25vw,1.3rem)] font-semibold">{home?.teamName || '--'}</p>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[clamp(1.25rem,2.4vw,2rem)] font-bold text-[var(--secondary-color)]">
          <AnimatedScore value={match?.homeScore ?? 0} />
          <span className="mx-2 text-white/50">-</span>
          <AnimatedScore value={match?.awayScore ?? 0} />
        </div>
        <p className="truncate text-[clamp(0.95rem,1.25vw,1.3rem)] font-semibold">{away?.teamName || '--'}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
        <p className="truncate">النادي: {home?.clubName || '--'}</p>
        <p className="truncate text-left">النادي: {away?.clubName || '--'}</p>
      </div>
    </article>
  )
}

function AnimatedScore({ value }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ scale: 0.94, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {formatArabicNumber(value)}
      </motion.span>
    </AnimatePresence>
  )
}

function LivePill({ live }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={[
        'rounded-full border px-4 py-2 text-[clamp(0.78rem,1vw,1.2rem)] font-semibold',
        live ? 'border-rose-400/40 bg-rose-500/10 text-rose-100' : 'border-white/20 bg-white/5 text-white/80',
      ].join(' ')}
    >
      {live ? 'مباشر' : 'غير مباشر'}
    </motion.div>
  )
}

function formatMs(ms) {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = formatArabicNumber(Math.floor(totalSeconds / 60), { minimumIntegerDigits: 2, useGrouping: false })
  const seconds = formatArabicNumber(totalSeconds % 60, { minimumIntegerDigits: 2, useGrouping: false })
  return `${minutes}:${seconds}`
}
