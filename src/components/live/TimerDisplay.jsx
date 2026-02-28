import { memo, useEffect, useState } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'

function TimerDisplayBase({ matchId, className = '' }) {
  const [tick, setTick] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setTick(Date.now())
    }, 250)
    return () => clearInterval(id)
  }, [])

  const timer = useTournamentStore((state) => {
    const id = Number(matchId)
    if (!Number.isFinite(id) || id <= 0) return null
    return state.matchTimers[id] || null
  })

  const remainingMs = getRemainingMs(timer, tick)
  return <span className={className}>{formatMs(remainingMs)}</span>
}

export const TimerDisplay = memo(TimerDisplayBase)

function formatMs(ms) {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = formatArabicNumber(Math.floor(totalSeconds / 60), {
    minimumIntegerDigits: 2,
    useGrouping: false,
  })
  const seconds = formatArabicNumber(totalSeconds % 60, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  })
  return `${minutes}:${seconds}`
}

function getRemainingMs(timer, nowMs) {
  if (!timer) return 0
  const base = Math.max(0, Number(timer.remainingMs ?? 0))
  if (String(timer.status || '') !== 'running') return base
  const syncedAt = Number(timer.syncedAt ?? nowMs)
  const elapsed = Math.max(0, nowMs - syncedAt)
  return Math.max(0, base - elapsed)
}
