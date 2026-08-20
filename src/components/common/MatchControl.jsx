import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useTournamentStore } from '../../store/tournamentStore'
import { useLanguage } from '../../i18n/LanguageContext'
import { TimerDisplay } from '../live/TimerDisplay'
import AppIcon from './AppIcon'
import ShinyText from '../reactbits/ShinyText'
import SpotlightCard from '../reactbits/SpotlightCard'

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

  const { t, language, isRtl } = useLanguage()
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
      setError(requestError?.message || (language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'))
    }
  }

  function getStatusLabel(status) {
    if (status === 'live') return language === 'ar' ? 'مباشر الآن' : 'LIVE NOW'
    if (status === 'finished') return language === 'ar' ? 'انتهت' : 'FINISHED'
    return language === 'ar' ? 'قيد الانتظار' : 'SCHEDULED'
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
            <AppIcon name="gamepad" size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-white">{t('matchControlTitle')}</h3>
            <p className="text-xs text-slate-400">
              {t('tournamentFormat')}: <strong className="text-sky-400">{tournamentFormat || '--'}</strong>
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-200">
          <AppIcon name="alert" size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        {/* Left Column: Match Fixture Selector */}
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-3.5 xl:col-span-1">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {language === 'ar' ? 'قائمة المباريات' : 'Match Fixtures'} ({sortedMatches.length})
            </span>
            <AppIcon name="calendar" size={14} className="text-slate-400" />
          </div>

          <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
            {sortedMatches.length ? (
              sortedMatches.map((match) => {
                const isActive = match.id === selectedId
                const home = teamById.get(match.homeTeamId)?.teamName || '--'
                const away = teamById.get(match.awayTeamId)?.teamName || '--'
                const isLive = match.status === 'live'
                const isFinished = match.status === 'finished'

                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => pickMatch(match.id)}
                    className={`w-full rounded-xl border p-3 text-start text-xs transition-all duration-200 ${
                      isActive
                        ? 'border-sky-400 bg-sky-500/20 text-white shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                        : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        #{match.order || match.id} {match.stageName ? `• ${match.stageName}` : ''}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                          isLive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                            : isFinished
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {getStatusLabel(match.status)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="truncate max-w-[90px]">{home}</span>
                      <span className="rounded-lg bg-black/40 px-2 py-0.5 text-xs font-black text-amber-300 font-mono">
                        {match.homeScore ?? 0} : {match.awayScore ?? 0}
                      </span>
                      <span className="truncate max-w-[90px]">{away}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                <AppIcon name="soccer" size={24} className="mx-auto mb-1.5 text-slate-600" />
                <p>{language === 'ar' ? 'لا توجد مباريات مولدة بعد.' : 'No matches generated yet.'}</p>
              </div>
            )}
          </div>
        </SpotlightCard>

        {/* Right Column: Live Referee Control Dashboard */}
        <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5 xl:col-span-3 space-y-5">
          {/* Active Match Banner & Score Display */}
          <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Teams & Score */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="font-bold uppercase tracking-wider">
                    {language === 'ar' ? 'المباراة المختارة للتحكيم المباشر' : 'SELECTED MATCH FOR LIVE REFEREEING'}
                  </span>
                </div>

                {selectedMatch ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-black text-white sm:text-xl truncate max-w-[150px]">
                        {teamById.get(selectedMatch.homeTeamId)?.teamName || '--'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {teamById.get(selectedMatch.homeTeamId)?.clubName || 'Club 1'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-black/60 px-4 py-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      <span className="text-2xl font-black text-cyan-400 font-mono sm:text-3xl">
                        {selectedMatch.homeScore ?? 0}
                      </span>
                      <span className="text-slate-500 font-bold text-lg">:</span>
                      <span className="text-2xl font-black text-amber-400 font-mono sm:text-3xl">
                        {selectedMatch.awayScore ?? 0}
                      </span>
                    </div>

                    <div className="text-left">
                      <p className="text-base font-black text-white sm:text-xl truncate max-w-[150px]">
                        {teamById.get(selectedMatch.awayTeamId)?.teamName || '--'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {teamById.get(selectedMatch.awayTeamId)?.clubName || 'Club 2'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-500">
                    {language === 'ar' ? 'يرجى اختيار مباراة من القائمة للبدء' : 'Please select a match from the fixtures list'}
                  </p>
                )}
              </div>

              {/* Match Timer Display */}
              <div className="flex flex-col items-center rounded-2xl border border-sky-400/30 bg-sky-950/40 px-5 py-2.5 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                  {language === 'ar' ? 'عداد المباراة' : 'MATCH CLOCK'}
                </span>
                <TimerDisplay matchId={selectedId} className="font-mono text-3xl font-black text-white tabular-nums tracking-widest" />
              </div>
            </div>
          </div>

          {/* Core Controls: Goals & Game Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Section 1: Score & Goals */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AppIcon name="soccer" size={14} className="text-sky-400" />
                <span>{language === 'ar' ? 'تسجيل الأهداف والنتيجة' : 'Scorekeeper & Goals'}</span>
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Home Goal */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => safe(() => selectedId && goalHome(selectedId))}
                  disabled={!selectedId}
                  className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500 py-3 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition hover:bg-cyan-400 disabled:opacity-40 active:scale-95"
                >
                  <AppIcon name="plus" size={16} />
                  <span>{language === 'ar' ? 'هدف للأول (Home)' : '+1 Home Goal'}</span>
                </motion.button>

                {/* Away Goal */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => safe(() => selectedId && goalAway(selectedId))}
                  disabled={!selectedId}
                  className="flex items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-500 py-3 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition hover:bg-amber-400 disabled:opacity-40 active:scale-95"
                >
                  <AppIcon name="plus" size={16} />
                  <span>{language === 'ar' ? 'هدف للثاني (Away)' : '+1 Away Goal'}</span>
                </motion.button>
              </div>

              {/* Undo Goal */}
              <button
                type="button"
                onClick={() => safe(() => selectedId && undo(selectedId))}
                disabled={!selectedId}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40 active:scale-95"
              >
                <AppIcon name="refresh" size={14} />
                <span>{language === 'ar' ? 'تراجع عن آخر هدف (Undo Goal)' : 'Undo Last Goal'}</span>
              </button>
            </div>

            {/* Section 2: Match Lifecycle Management */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AppIcon name="sliders" size={14} className="text-emerald-400" />
                <span>{language === 'ar' ? 'إدارة حالة المباراة' : 'Match Lifecycle'}</span>
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Start Match */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => safe(() => selectedId && startMatch(selectedId))}
                  disabled={!selectedId}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400 bg-emerald-500 py-3 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition hover:bg-emerald-400 disabled:opacity-40 active:scale-95"
                >
                  <AppIcon name="play" size={15} />
                  <span>{language === 'ar' ? 'بدء المباراة' : 'Start Match'}</span>
                </motion.button>

                {/* End Match */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => safe(() => selectedId && endMatch(selectedId))}
                  disabled={!selectedId}
                  className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 py-3 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25 disabled:opacity-40 active:scale-95"
                >
                  <AppIcon name="stop" size={15} className="text-rose-400" />
                  <span>{language === 'ar' ? 'إنهاء المباراة' : 'End Match'}</span>
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Confirm Result */}
                <button
                  type="button"
                  onClick={() => safe(() => selectedId && confirmResult(selectedId))}
                  disabled={!selectedId}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-40 active:scale-95"
                >
                  <AppIcon name="check" size={14} />
                  <span>{language === 'ar' ? 'تأكيد النتيجة' : 'Confirm Result'}</span>
                </button>

                {/* Restart Match */}
                <button
                  type="button"
                  onClick={() => safe(() => selectedId && restartMatch(selectedId))}
                  disabled={!selectedId}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40 active:scale-95"
                >
                  <AppIcon name="refresh" size={14} />
                  <span>{language === 'ar' ? 'إعادة تشغيل' : 'Restart Match'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Stopwatch & Timer Adjustments */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AppIcon name="timer" size={14} className="text-amber-400" />
              <span>{language === 'ar' ? 'التحكم بالساعة والوقت' : 'Timer & Duration Controls'}</span>
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => safe(() => selectedId && timerStart(selectedId))}
                disabled={!selectedId}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 disabled:opacity-40 active:scale-95"
              >
                <AppIcon name="play" size={13} />
                <span>{language === 'ar' ? 'تشغيل العداد' : 'Play Timer'}</span>
              </button>

              <button
                type="button"
                onClick={() => safe(() => selectedId && timerPause(selectedId))}
                disabled={!selectedId}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-40 active:scale-95"
              >
                <AppIcon name="pause" size={13} />
                <span>{language === 'ar' ? 'إيقاف مؤقت' : 'Pause Timer'}</span>
              </button>

              <button
                type="button"
                onClick={() => safe(() => selectedId && timerReset(selectedId))}
                disabled={!selectedId}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40 active:scale-95"
              >
                <AppIcon name="refresh" size={13} />
                <span>{language === 'ar' ? 'إعادة ضبط العداد' : 'Reset Timer'}</span>
              </button>

              <div className="h-4 w-px bg-white/15 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={() => safe(() => selectedId && timerAdjust(+30, selectedId))}
                disabled={!selectedId}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-40 font-mono"
              >
                +30s
              </button>

              <button
                type="button"
                onClick={() => safe(() => selectedId && timerAdjust(-30, selectedId))}
                disabled={!selectedId}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-40 font-mono"
              >
                -30s
              </button>

              <div className="h-4 w-px bg-white/15 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={() => safe(() => selectedId && timerSetDuration(8, selectedId))}
                disabled={!selectedId}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
              >
                8m
              </button>

              <button
                type="button"
                onClick={() => safe(() => selectedId && timerSetDuration(10, selectedId))}
                disabled={!selectedId}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
              >
                10m
              </button>

              <button
                type="button"
                onClick={() => safe(() => selectedId && timerSetDuration(12, selectedId))}
                disabled={!selectedId}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
              >
                12m
              </button>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  )
}
