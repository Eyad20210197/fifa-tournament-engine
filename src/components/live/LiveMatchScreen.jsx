import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useTournamentStore, computeRemainingMs } from '../../store/tournamentStore'
import { useNow } from '../../hooks/useNow'
import { formatArabicNumber } from '../../utils/format'

export function LiveMatchScreen() {
  const matchId = useTournamentStore((s) => s.liveMatchState.matchId)
  const timer = useTournamentStore((s) => s.liveMatchState.timer)
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const sponsorLogo = useTournamentStore((s) => s.sponsor.logoBase64)
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
  const highlightedMatch = featuredMatches[0] ?? null

  const highlightedHome = highlightedMatch?.homeTeamId ? teamMap.get(highlightedMatch.homeTeamId) : null
  const highlightedAway = highlightedMatch?.awayTeamId ? teamMap.get(highlightedMatch.awayTeamId) : null

  return (
    <section className="relative flex h-full min-h-[72vh] flex-col rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_45%),linear-gradient(140deg,rgba(11,15,24,0.92),rgba(5,8,14,0.96))] p-[2.2vw] backdrop-blur">
      <div className="mb-[1.8vh]">
        <h2 className="text-3xl font-semibold text-white">المباريات المباشرة</h2>
      </div>

      {featuredMatches.length ? (
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          {featuredMatches.map((item, index) => (
            <LiveMatchCard key={item.id} match={item} teamMap={teamMap} timer={timer} now={now} highlighted={index === 0} />
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

      <footer className="mt-[2vh] grid min-h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-2">
        <p className="truncate text-[clamp(0.88rem,1.1vw,1.35rem)] text-[var(--text-primary)]">{highlightedHome?.teamName}</p>
        <div className="mx-auto rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-[clamp(0.78rem,0.95vw,1rem)] text-[var(--text-secondary)]">
          رعاية البث
        </div>
        <p className="truncate text-left text-[clamp(0.88rem,1.1vw,1.35rem)] text-[var(--text-primary)]">{highlightedAway?.teamName}</p>

        <div className="col-span-3 mt-1 grid place-items-center rounded-xl border border-white/10 bg-white/5 py-2">
          {sponsorLogo ? (
            <img src={sponsorLogo} alt="الراعي" className="h-[clamp(36px,5vh,64px)] w-auto object-contain" loading="lazy" />
          ) : (
            <span className="text-[clamp(0.8rem,1vw,1.1rem)] text-[var(--text-secondary)]">مساحة الراعي</span>
          )}
        </div>
      </footer>
    </section>
  )
}

function TeamMark({ team }) {
  return (
    <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-white/15 bg-white/5">
      {team?.logo ? <img alt="شعار الفريق" src={team.logo} className="h-full w-full object-cover" /> : <span className="text-base">⚽</span>}
    </div>
  )
}

function LiveMatchCard({ match, teamMap, timer, now, highlighted = false }) {
  const home = match?.homeTeamId ? teamMap.get(match.homeTeamId) : null
  const away = match?.awayTeamId ? teamMap.get(match.awayTeamId) : null
  const remainingMs = computeRemainingMs(timer, now)

  return (
    <article
      className={[
        'flex h-full flex-col justify-between rounded-2xl p-4 backdrop-blur-lg',
        highlighted ? 'border-2 border-amber-400/50 bg-black/30' : 'border border-white/10 bg-black/20',
      ].join(' ')}
    >
      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-3 text-lg font-semibold text-white">{formatMs(remainingMs)}</div>
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Home Team & Score */}
          <div className="flex items-center justify-end gap-3">
            <div className="flex-1 text-right">
              <p className="truncate font-semibold text-white">{home?.teamName || '--'}</p>
              <p className="truncate text-xs text-gray-400">{home?.clubName || '--'}</p>
            </div>
            <TeamMark team={home} />
          </div>

          <div className="flex items-center text-center">
            <AnimatedScore value={match?.homeScore ?? 0} className="text-3xl font-bold text-amber-400" />
            <span className="mx-2 text-2xl text-gray-400">-</span>
            <AnimatedScore value={match?.awayScore ?? 0} className="text-3xl font-bold text-amber-400" />
          </div>

          {/* Away Team & Score */}
          <div className="flex items-center justify-start gap-3">
            <TeamMark team={away} />
            <div className="flex-1 text-left">
              <p className="truncate font-semibold text-white">{away?.teamName || '--'}</p>
              <p className="truncate text-xs text-gray-400">{away?.clubName || '--'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <StatusPill status={match?.status} />
        <span className="text-gray-400">مباراة #{formatArabicNumber(match?.order ?? 0)}</span>
      </div>
    </article>
  )
}

function AnimatedScore({ value, className }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        className={className}
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

function StatusPill({ status }) {
  const statusConfig = {
    live: { text: 'مباشر', className: 'border-rose-400/40 bg-rose-500/10 text-rose-100' },
    finished: { text: 'انتهت', className: 'border-white/20 bg-white/5 text-white/80' },
    pending: { text: 'لم تبدأ', className: 'border-sky-400/40 bg-sky-500/10 text-sky-100' },
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}>
      {config.text}
    </div>
  )
}

function formatMs(ms) {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = formatArabicNumber(Math.floor(totalSeconds / 60), { minimumIntegerDigits: 2, useGrouping: false })
  const seconds = formatArabicNumber(totalSeconds % 60, { minimumIntegerDigits: 2, useGrouping: false })
  return `${minutes}:${seconds}`
}