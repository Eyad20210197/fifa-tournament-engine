import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'
import { useSwipePages } from '../../hooks/useSwipePages'

const ROWS_PER_PAGE = 4
const AR_LOCALE = 'ar-EG'
const SCORE_STATUSES = new Set(['finished', 'ended', 'et', 'extra_time', 'penalties', 'pens'])

function getMatchStartMs(match) {
  const value = match?.startsAt || match?.starts_at || ''
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isScoreVisible(match) {
  return SCORE_STATUSES.has(String(match?.status || '').toLowerCase())
}

function compareMatchesForDisplay(a, b, nowMs) {
  const aTime = getMatchStartMs(a)
  const bTime = getMatchStartMs(b)
  const aHas = Number.isFinite(aTime)
  const bHas = Number.isFinite(bTime)
  const aPastOrFinished = isScoreVisible(a) || (aHas && nowMs > 0 && aTime <= nowMs)
  const bPastOrFinished = isScoreVisible(b) || (bHas && nowMs > 0 && bTime <= nowMs)

  if (aPastOrFinished !== bPastOrFinished) return aPastOrFinished ? -1 : 1
  if (aHas && bHas && aTime !== bTime) return aTime - bTime
  if (aHas !== bHas) return aHas ? -1 : 1

  const aOrder = Number(a?.order || 0)
  const bOrder = Number(b?.order || 0)
  if (aOrder !== bOrder) return aOrder - bOrder

  return Number(a?.id || 0) - Number(b?.id || 0)
}

export function ScheduleList() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const liveMatchId = useTournamentStore((s) => s.liveMatchState.matchId)
  const [nowMs, setNowMs] = useState(0)

  useEffect(() => {
    const syncNow = () => setNowMs(Date.now())
    syncNow()
    const intervalId = setInterval(syncNow, 60000)
    return () => clearInterval(intervalId)
  }, [])

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const sorted = useMemo(() => {
    const list = (matches ?? []).slice()
    list.sort((a, b) => compareMatchesForDisplay(a, b, nowMs))
    return list
  }, [matches, nowMs])

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

              <div className="flex flex-col items-center gap-1 text-center">
                {isScoreVisible(match) ? (
                  <p className="font-latin text-[clamp(1.7rem,3.6vw,4.2rem)] text-[var(--secondary-color)]">
                    {formatArabicNumber(match.homeScore ?? 0)} : {formatArabicNumber(match.awayScore ?? 0)}
                  </p>
                ) : (
                  <>
                    <p className="font-headline text-[clamp(0.95rem,1.3vw,1.6rem)] text-white/85">{formatMatchDate(match)}</p>
                    <p className="font-latin text-[clamp(1.05rem,1.55vw,2rem)] text-[var(--secondary-color)]">{formatMatchTime(match)}</p>
                  </>
                )}
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

function formatMatchDate(match) {
  const startsAt = match?.startsAt || match?.starts_at
  if (!startsAt) return '--'
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat(AR_LOCALE, {
    numberingSystem: 'arab',
    dateStyle: 'medium',
  }).format(date)
}

function formatMatchTime(match) {
  const startsAt = match?.startsAt || match?.starts_at
  if (!startsAt) return '--'
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat(AR_LOCALE, {
    numberingSystem: 'arab',
    timeStyle: 'short',
  }).format(date)
}
