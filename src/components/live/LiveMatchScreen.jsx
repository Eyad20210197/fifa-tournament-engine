import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { useTournamentStore, computeRemainingMs } from '../../store/tournamentStore'
import { useNow } from '../../hooks/useNow'
import { playGoalSound } from '../../utils/sound'
import { GoalCelebration } from './GoalCelebration'

export function LiveMatchScreen() {
  const matchId = useTournamentStore((s) => s.liveMatchState.matchId)
  const timer = useTournamentStore((s) => s.liveMatchState.timer)
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const goalEvents = useTournamentStore((s) => s.liveMatchState.goalEvents)
  const now = useNow(250)

  const match = useMemo(() => {
    if (matchId) return matches.find((m) => m.id === matchId) ?? null
    return matches.find((m) => m.status === 'live') ?? null
  }, [matches, matchId])

  const nameMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const home = match?.homeTeamId ? nameMap.get(match.homeTeamId) : null
  const away = match?.awayTeamId ? nameMap.get(match.awayTeamId) : null
  const remainingMs = computeRemainingMs(timer, now)

  const lastGoalIdRef = useRef(null)
  const lastGoal = goalEvents?.length ? goalEvents[goalEvents.length - 1] : null
  const goalAppliesToThisMatch = Boolean(lastGoal && match?.id && lastGoal.matchId === match.id)
  const goalWindowMs = 1100
  const showGoalOverlay = Boolean(goalAppliesToThisMatch && now - (lastGoal?.at ?? 0) < goalWindowMs)

  useEffect(() => {
    if (!lastGoal) return
    if (!goalAppliesToThisMatch) return
    if (lastGoalIdRef.current === lastGoal.id) return
    lastGoalIdRef.current = lastGoal.id
    playGoalSound()
  }, [lastGoal, goalAppliesToThisMatch])

  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/5 p-12 backdrop-blur">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <LivePill live={match?.status === 'live'} />
          <div>
            <div className="text-sm text-white/60">مباراة</div>
            <div className="mt-1 text-3xl font-semibold tracking-wide">
              {home?.teamName || '—'} <span className="mx-2 text-white/40">ضد</span> {away?.teamName || '—'}
            </div>
            <div className="mt-1 text-sm text-white/70">{match ? statusArabic(match.status) : 'لا توجد مباراة محددة'}</div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-[#c9a227]/40 bg-[#c9a227]/10 px-6 py-4"
        >
          <div className="text-xs text-white/70">العداد</div>
          <div className="mt-1 text-3xl font-semibold text-[#f6d365]">{formatMs(remainingMs)}</div>
          <div className="mt-1 text-xs text-white/60">{timer?.running ? 'يعمل' : 'متوقف'}</div>
        </motion.div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6">
        <TeamTile label="الفريق المضيف" team={home} />
        <ScoreTile homeScore={match?.homeScore ?? 0} awayScore={match?.awayScore ?? 0} live={match?.status === 'live'} />
        <TeamTile label="الفريق الضيف" team={away} />
      </div>

      <div className="mt-8 text-xs text-white/50">معرّف المباراة: {match?.id || 'غير محدد'}</div>

      <GoalCelebration
        open={showGoalOverlay}
        sideLabel={lastGoal?.side === 'home' ? 'هدف للمضيف' : 'هدف للضيف'}
        teamName={lastGoal?.side === 'home' ? home?.teamName : away?.teamName}
      />
    </div>
  )
}

function TeamTile({ label, team }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white/90">{team?.teamName || '—'}</div>
      <div className="mx-auto mt-4 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {team?.logo ? <img alt="شعار" src={team.logo} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="mx-auto mt-4 max-w-[22rem] text-sm text-white/70">
        <div className="truncate">{team?.player1 || '—'}</div>
        <div className="truncate">{team?.player2 || '—'}</div>
      </div>
    </div>
  )
}

function ScoreTile({ homeScore, awayScore, live }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-white/10 bg-black/25 p-8">
      <div className="text-sm text-white/60">النتيجة</div>
      <div className="mt-3 text-6xl font-semibold tracking-wider">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`h-${homeScore}`}
            initial={{ scale: 0.96, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="text-[#f6d365]"
          >
            {homeScore}
          </motion.span>
        </AnimatePresence>
        <span className="mx-4 text-white/40">:</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`a-${awayScore}`}
            initial={{ scale: 0.96, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="text-[#f6d365]"
          >
            {awayScore}
          </motion.span>
        </AnimatePresence>
      </div>
      {live ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100"
        >
          مباشر
        </motion.div>
      ) : (
        <div className="mt-4 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/75">
          غير مباشر
        </div>
      )}
    </div>
  )
}

function LivePill({ live }) {
  return live ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100"
    >
      مباشر
    </motion.div>
  ) : (
    <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75">
      غير مباشر
    </div>
  )
}

function formatMs(ms) {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function statusArabic(status) {
  switch (status) {
    case 'pending':
      return 'لم تبدأ'
    case 'live':
      return 'مباشر'
    case 'finished':
      return 'انتهت'
    default:
      return '—'
  }
}
