import { memo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'

function TimerDisplayBase({ matchId, className = '' }) {
  const timer = useTournamentStore((state) => {
    const id = Number(matchId)
    if (!Number.isFinite(id) || id <= 0) return null
    return state.matchTimers[id] || null
  })

  const remainingMs = Number(timer?.remainingMs ?? 0)
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
