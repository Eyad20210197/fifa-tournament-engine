import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'
import { TimerDisplay } from '../live/TimerDisplay'

export function MatchControl() {
  const {
    tournamentFormat,
    teams,
    matches,
    liveMatchId,
    startMatch,
    setLiveMatch,
    goalHome,
    goalAway,
    undo,
    endMatch,
    confirmResult,
    restartMatch,
    timerStart,
    timerPause,
    timerReset,
    timerSetDuration,
    timerAdjust,
  } = useTournamentStore(
    useShallow((s) => ({
      tournamentFormat: s.tournament.format,
      teams: s.teams,
      matches: s.matches,
      liveMatchId: s.liveMatchState.matchId,
      startMatch: s.startMatch,
      setLiveMatch: s.setLiveMatch,
      goalHome: s.incrementHomeScore,
      goalAway: s.incrementAwayScore,
      undo: s.undoGoal,
      endMatch: s.endMatch,
      confirmResult: s.confirmResult,
      restartMatch: s.restartMatch,
      timerStart: s.startTimer,
      timerPause: s.pauseTimer,
      timerReset: s.resetTimer,
      timerSetDuration: s.setTimerDurationMinutes,
      timerAdjust: s.adjustTimerSeconds,
    })),
  )

  const [selectedId, setSelectedId] = useState(liveMatchId)
  const [error, setError] = useState(null)

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
              <TimerDisplay matchId={selectedId} className="font-latin text-2xl font-semibold text-[var(--secondary-color)] tabular-nums" />
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
              <ActionBtn onClick={() => safe(() => selectedId && timerStart(selectedId))} disabled={!selectedId}>تشغيل</ActionBtn>
              <GhostBtn onClick={() => safe(() => selectedId && timerPause(selectedId))} disabled={!selectedId}>إيقاف</GhostBtn>
              <GhostBtn onClick={() => safe(() => selectedId && timerReset(selectedId))} disabled={!selectedId}>إعادة ضبط</GhostBtn>
              <GhostBtn onClick={() => safe(() => selectedId && timerAdjust(+30, selectedId))} disabled={!selectedId}>+٣٠ث</GhostBtn>
              <GhostBtn onClick={() => safe(() => selectedId && timerAdjust(-30, selectedId))} disabled={!selectedId}>-٣٠ث</GhostBtn>
              <GhostBtn onClick={() => safe(() => selectedId && timerSetDuration(8, selectedId))} disabled={!selectedId}>٨ دقائق</GhostBtn>
              <GhostBtn onClick={() => safe(() => selectedId && timerSetDuration(10, selectedId))} disabled={!selectedId}>١٠ دقائق</GhostBtn>
              <GhostBtn onClick={() => safe(() => selectedId && timerSetDuration(12, selectedId))} disabled={!selectedId}>١٢ دقيقة</GhostBtn>
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
