import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore, computeRemainingMs } from '../../store/tournamentStore'
import { useNow } from '../../hooks/useNow'
import { formatArabicNumber } from '../../utils/format'

export function MatchControl() {
  const tournamentFormat = useTournamentStore((s) => s.tournament.format)
  const teams = useTournamentStore((s) => s.teams)
  const matches = useTournamentStore((s) => s.matches)
  const liveMatchId = useTournamentStore((s) => s.liveMatchState.matchId)
  const timer = useTournamentStore((s) => s.liveMatchState.timer)

  const startMatch = useTournamentStore((s) => s.startMatch)
  const setLiveMatch = useTournamentStore((s) => s.setLiveMatch)
  const goalHome = useTournamentStore((s) => s.incrementHomeScore)
  const goalAway = useTournamentStore((s) => s.incrementAwayScore)
  const undo = useTournamentStore((s) => s.undoGoal)
  const endMatch = useTournamentStore((s) => s.endMatch)
  const confirmResult = useTournamentStore((s) => s.confirmResult)
  const restartMatch = useTournamentStore((s) => s.restartMatch)

  const timerStart = useTournamentStore((s) => s.startTimer)
  const timerPause = useTournamentStore((s) => s.pauseTimer)
  const timerReset = useTournamentStore((s) => s.resetTimer)
  const timerSetDuration = useTournamentStore((s) => s.setTimerDurationMinutes)
  const timerAdjust = useTournamentStore((s) => s.adjustTimerSeconds)

  const [selectedId, setSelectedId] = useState(liveMatchId)
  const [error, setError] = useState(null)

  const now = useNow(250)
  const remainingMs = computeRemainingMs(timer, now)

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const matchById = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches])
  const selectedMatch = (selectedId && matchById.get(selectedId)) || null

  const sortedMatches = useMemo(() => {
    const list = matches.slice()
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)))
    return list
  }, [matches])

  function pickMatch(id) {
    setSelectedId(id)
    setError(null)
    if (id) setLiveMatch(id)
  }

  function safe(action) {
    setError(null)
    try {
      action()
    } catch (requestError) {
      setError(requestError?.message || 'حدث خطأ غير متوقع')
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <h3 className="text-xl font-semibold">التحكم بالمباراة</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">النمط الحالي: {tournamentFormat}</p>

      {error ? <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 xl:col-span-1">
          <p className="mb-2 text-sm text-[var(--text-secondary)]">اختيار المباراة</p>
          <div className="max-h-[380px] space-y-2 overflow-auto">
            {sortedMatches.length ? (
              sortedMatches.map((match) => {
                const isActive = match.id === selectedId
                const home = teamById.get(match.homeTeamId)?.teamName || '--'
                const away = teamById.get(match.awayTeamId)?.teamName || '--'
                return (
                  <button
                    key={match.id}
                    onClick={() => pickMatch(match.id)}
                    className={[
                      'w-full rounded-2xl border px-3 py-2 text-right text-sm',
                      isActive
                        ? 'border-[var(--primary-color)]/60 bg-[var(--primary-color)]/10 text-[var(--secondary-color)]'
                        : 'border-white/10 bg-white/5 text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    <p className="truncate">{home} ضد {away}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {statusArabic(match.status)} • {formatArabicNumber(match.homeScore ?? 0)} - {formatArabicNumber(match.awayScore ?? 0)}
                    </p>
                  </button>
                )
              })
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-[var(--text-secondary)]">لا توجد مباريات حاليا.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">المباراة المحددة</p>
              <p className="mt-1 text-lg font-semibold">
                {selectedMatch
                  ? `${teamById.get(selectedMatch.homeTeamId)?.teamName || '--'} ضد ${teamById.get(selectedMatch.awayTeamId)?.teamName || '--'}`
                  : '--'}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--primary-color)]/35 bg-[var(--primary-color)]/10 px-4 py-2">
              <p className="text-xs text-[var(--text-secondary)]">العد التنازلي</p>
              <p className="text-2xl font-semibold text-[var(--secondary-color)]">{formatMs(remainingMs)}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-sm text-[var(--text-secondary)]">النتيجة</p>
              <div className="flex flex-wrap gap-2">
                <ActionBtn onClick={() => safe(() => selectedId && goalHome(selectedId))} disabled={!selectedId}>هدف للأول</ActionBtn>
                <ActionBtn onClick={() => safe(() => selectedId && goalAway(selectedId))} disabled={!selectedId}>هدف للثاني</ActionBtn>
                <GhostBtn onClick={() => safe(() => selectedId && undo(selectedId))} disabled={!selectedId}>تراجع</GhostBtn>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-sm text-[var(--text-secondary)]">إدارة المباراة</p>
              <div className="flex flex-wrap gap-2">
                <motion.button whileTap={{ scale: 0.99 }} className="min-h-11 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#062217]" onClick={() => safe(() => selectedId && startMatch(selectedId))} disabled={!selectedId}>بدء</motion.button>
                <GhostBtn onClick={() => safe(() => selectedId && endMatch(selectedId))} disabled={!selectedId}>إنهاء</GhostBtn>
                <GhostBtn onClick={() => safe(() => selectedId && confirmResult(selectedId))} disabled={!selectedId}>تأكيد</GhostBtn>
                <button className="min-h-11 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100" onClick={() => safe(() => selectedId && restartMatch(selectedId))} disabled={!selectedId}>إعادة</button>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-sm text-[var(--text-secondary)]">إدارة العداد</p>
            <div className="flex flex-wrap gap-2">
              <ActionBtn onClick={() => safe(() => timerStart())}>تشغيل</ActionBtn>
              <GhostBtn onClick={() => safe(() => timerPause())}>إيقاف</GhostBtn>
              <GhostBtn onClick={() => safe(() => timerReset())}>إعادة ضبط</GhostBtn>
              <GhostBtn onClick={() => safe(() => timerAdjust(+30))}>+٣٠ث</GhostBtn>
              <GhostBtn onClick={() => safe(() => timerAdjust(-30))}>-٣٠ث</GhostBtn>
              <GhostBtn onClick={() => safe(() => timerSetDuration(8))}>٨ دقائق</GhostBtn>
              <GhostBtn onClick={() => safe(() => timerSetDuration(10))}>١٠ دقائق</GhostBtn>
              <GhostBtn onClick={() => safe(() => timerSetDuration(12))}>١٢ دقيقة</GhostBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ children, onClick, disabled = false }) {
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  )
}

function GhostBtn({ children, onClick, disabled = false }) {
  return (
    <button
      className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm disabled:opacity-60"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function statusArabic(status) {
  if (status === 'pending') return 'لم تبدأ'
  if (status === 'live') return 'مباشر'
  if (status === 'finished') return 'انتهت'
  return '--'
}

function formatMs(ms) {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = formatArabicNumber(Math.floor(totalSeconds / 60), { minimumIntegerDigits: 2, useGrouping: false })
  const seconds = formatArabicNumber(totalSeconds % 60, { minimumIntegerDigits: 2, useGrouping: false })
  return `${minutes}:${seconds}`
}
