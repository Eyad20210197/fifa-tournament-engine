import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore, computeRemainingMs } from '../../store/tournamentStore'
import { useNow } from '../../hooks/useNow'

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

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const nameById = useMemo(() => (id) => (id ? teamById.get(id)?.teamName ?? null : null), [teamById])

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches])
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
    } catch (e) {
      setError(e?.message || 'حدث خطأ')
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs text-white/60">التحكم بالمباراة</div>
          <div className="mt-2 text-xl font-semibold text-white/90">تشغيل المباراة والنتيجة والعداد</div>
          <div className="mt-1 text-sm text-white/70">
            النوع الحالي: {tournamentFormat} • يتم إرسال التحديثات فوراً إلى شاشة العرض.
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 xl:col-span-1">
          <div className="text-sm text-white/80">اختيار المباراة</div>
          <div className="mt-3 grid gap-2">
            {sortedMatches.length ? (
              sortedMatches.map((m) => {
                const isActive = m.id === selectedId
                const homeTeam = m.homeTeamId ? teamById.get(m.homeTeamId) : null
                const awayTeam = m.awayTeamId ? teamById.get(m.awayTeamId) : null
                const home = homeTeam?.teamName || '—'
                const away = awayTeam?.teamName || '—'
                return (
                  <button
                    key={m.id}
                    onClick={() => pickMatch(m.id)}
                    className={[
                      'rounded-2xl border px-3 py-3 text-right text-sm transition',
                      isActive
                        ? 'border-[#c9a227]/60 bg-[#c9a227]/10 text-[#f6d365]'
                        : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10',
                    ].join(' ')}
                    title={`${home} ضد ${away}`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 overflow-hidden text-white/90 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] leading-snug">
                        {home} ضد {away}
                      </div>
                      <div className="flex-none text-xs text-white/60">{statusArabic(m.status)}</div>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center justify-between gap-3 text-xs text-white/60">
                      <div className="flex-none">
                        {(m.homeScore ?? 0)}:{(m.awayScore ?? 0)}
                      </div>
                      <div className="min-w-0 truncate">
                        {m.mode === 'knockout' && m.roundLabel ? m.roundLabel : ''}
                      </div>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                لا توجد مباريات بعد. قم بتوليد البطولة أولاً.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 xl:col-span-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-white/80">المباراة المحددة</div>
              <div className="mt-1 text-lg font-semibold text-white/90">
                {selectedMatch
                  ? `${nameById(selectedMatch.homeTeamId) || '—'} ضد ${nameById(selectedMatch.awayTeamId) || '—'}`
                  : '—'}
              </div>
              <div className="mt-1 text-xs text-white/60">
                الحالة: {selectedMatch ? statusArabic(selectedMatch.status) : '—'} • النتيجة:{' '}
                {selectedMatch ? `${selectedMatch.homeScore ?? 0}:${selectedMatch.awayScore ?? 0}` : '—'}
              </div>
            </div>

            <div className="rounded-2xl border border-[#c9a227]/30 bg-[#c9a227]/10 px-4 py-3">
              <div className="text-xs text-white/70">العداد</div>
              <div className="mt-1 text-2xl font-semibold text-[#f6d365]">{formatMs(remainingMs)}</div>
              <div className="mt-1 text-xs text-white/60">{timer?.running ? 'يعمل' : 'متوقف'}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/80">النتيجة</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b] hover:bg-[#f6d365]"
                  onClick={() => safe(() => selectedId && goalHome(selectedId))}
                  disabled={!selectedId}
                >
                  هدف للمضيف
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b] hover:bg-[#f6d365]"
                  onClick={() => safe(() => selectedId && goalAway(selectedId))}
                  disabled={!selectedId}
                >
                  هدف للضيف
                </motion.button>
                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                  onClick={() => safe(() => selectedId && undo(selectedId))}
                  disabled={!selectedId}
                >
                  تراجع عن هدف
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/80">إدارة المباراة</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-[#07162b] hover:bg-emerald-400"
                  onClick={() => safe(() => selectedId && startMatch(selectedId))}
                  disabled={!selectedId}
                >
                  بدء / تشغيل
                </motion.button>
                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                  onClick={() => safe(() => selectedId && endMatch(selectedId))}
                  disabled={!selectedId}
                >
                  إنهاء
                </button>
                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                  onClick={() => safe(() => selectedId && confirmResult(selectedId))}
                  disabled={!selectedId}
                >
                  تأكيد النتيجة
                </button>
                <button
                  className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/15"
                  onClick={() => safe(() => selectedId && restartMatch(selectedId))}
                  disabled={!selectedId}
                >
                  إعادة المباراة
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/80">العداد (تحكم)</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b] hover:bg-[#f6d365]"
                onClick={() => safe(() => timerStart())}
              >
                تشغيل
              </button>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => safe(() => timerPause())}
              >
                إيقاف مؤقت
              </button>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => safe(() => timerReset())}
              >
                إعادة ضبط
              </button>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => safe(() => timerAdjust(+30))}
              >
                +30ث
              </button>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => safe(() => timerAdjust(-30))}
              >
                -30ث
              </button>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => safe(() => timerSetDuration(8))}
              >
                8 دقائق
              </button>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => safe(() => timerSetDuration(10))}
              >
                10 دقائق
              </button>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => safe(() => timerSetDuration(12))}
              >
                12 دقيقة
              </button>
            </div>
            <div className="mt-2 text-xs text-white/60">
              ملاحظة: يتم حساب الوقت محلياً بدون حفظ كل نبضة لضمان الأداء وعدم الكتابة المستمرة في IndexedDB.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
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

function formatMs(ms) {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
