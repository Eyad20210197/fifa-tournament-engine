import { motion } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function ControlPage() {
  const { t, language } = useLanguage()
  const matches = usePrototypeStore((s) => s.matches)
  const teams = usePrototypeStore((s) => s.teams)
  const liveMatchId = usePrototypeStore((s) => s.liveMatchId)
  const setLiveMatchId = usePrototypeStore((s) => s.setLiveMatchId)
  const incrementHomeScore = usePrototypeStore((s) => s.incrementHomeScore)
  const incrementAwayScore = usePrototypeStore((s) => s.incrementAwayScore)
  const undoGoal = usePrototypeStore((s) => s.undoGoal)
  const startMatch = usePrototypeStore((s) => s.startMatch)
  const endMatch = usePrototypeStore((s) => s.endMatch)
  const confirmResult = usePrototypeStore((s) => s.confirmResult)
  const restartMatch = usePrototypeStore((s) => s.restartMatch)
  const toggleTimer = usePrototypeStore((s) => s.toggleTimer)
  const resetTimer = usePrototypeStore((s) => s.resetTimer)
  const adjustTimerSeconds = usePrototypeStore((s) => s.adjustTimerSeconds)

  const teamById = new Map(teams.map((t) => [t.id, t]))
  const selectedMatch = matches.find((m) => m.id === liveMatchId) || matches[0]

  function formatTime(seconds = 0) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-400">
            <AppIcon name="gamepad" size={22} />
          </div>
          <div>
            <ShinyText text={t('navControl')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'التحكيم المباشر، تسجيل الأهداف، وتعديل عداد المباراة لحظياً' : 'Live match scorekeeper, stopwatch, and referee operations'}
            </p>
          </div>
        </div>
      </SpotlightCard>

      <div className="grid gap-6 xl:grid-cols-4">
        {/* Left Column: Match Fixtures List */}
        <SpotlightCard className="border border-white/10 p-4 xl:col-span-1 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {language === 'ar' ? 'قائمة المباريات' : 'Fixtures'} ({matches.length})
            </span>
            <AppIcon name="calendar" size={14} className="text-slate-400" />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {matches.map((m) => {
              const isSelected = m.id === selectedMatch?.id
              const home = teamById.get(m.home_team_id)?.team_name || 'Team 1'
              const away = teamById.get(m.away_team_id)?.team_name || 'Team 2'
              const isLive = m.status === 'live'

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLiveMatchId(m.id)}
                  className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                    isSelected
                      ? 'border-sky-400 bg-sky-500/20 text-white shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                      : 'border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">#{m.id} • {m.stage_name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isLive ? 'LIVE' : m.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-bold">
                    <span className="truncate max-w-[80px]">{home}</span>
                    <span className="rounded-lg bg-black/50 px-2 py-0.5 font-mono text-amber-300">
                      {m.home_score} : {m.away_score}
                    </span>
                    <span className="truncate max-w-[80px]">{away}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </SpotlightCard>

        {/* Right Column: Active Live Referee Controls */}
        <SpotlightCard className="border border-white/10 p-6 xl:col-span-3 space-y-6">
          {/* Match Score Display Banner */}
          <div className="rounded-2xl border border-sky-500/20 bg-slate-900/90 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Teams & Current Score */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg sm:text-2xl font-black text-white">
                    {teamById.get(selectedMatch?.home_team_id)?.team_name || 'Home'}
                  </p>
                  <p className="text-xs text-slate-400 font-semibold">
                    {teamById.get(selectedMatch?.home_team_id)?.club_name || 'Club 1'}
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-black/80 px-5 py-2.5 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                  <span className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono tabular-nums">
                    {selectedMatch?.home_score ?? 0}
                  </span>
                  <span className="text-xl font-bold text-slate-600">:</span>
                  <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tabular-nums">
                    {selectedMatch?.away_score ?? 0}
                  </span>
                </div>

                <div className="text-left">
                  <p className="text-lg sm:text-2xl font-black text-white">
                    {teamById.get(selectedMatch?.away_team_id)?.team_name || 'Away'}
                  </p>
                  <p className="text-xs text-slate-400 font-semibold">
                    {teamById.get(selectedMatch?.away_team_id)?.club_name || 'Club 2'}
                  </p>
                </div>
              </div>

              {/* Live Timer */}
              <div className="flex flex-col items-center rounded-2xl border border-sky-400/30 bg-sky-950/50 px-6 py-2.5 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                  {language === 'ar' ? 'عداد المباراة' : 'MATCH CLOCK'}
                </span>
                <span className="font-mono text-3xl font-black text-white tabular-nums tracking-widest">
                  {formatTime(selectedMatch?.timer_seconds || 600)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Sections */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Goal Scorekeeper */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AppIcon name="soccer" size={14} className="text-sky-400" />
                <span>{language === 'ar' ? 'تسجيل الأهداف (Goal Buttons)' : 'Goal Scorekeeper'}</span>
              </span>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selectedMatch && incrementHomeScore(selectedMatch.id)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500 py-3.5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:bg-cyan-400 transition"
                >
                  <AppIcon name="plus" size={16} />
                  <span>{language === 'ar' ? '+ هدف للأول (Home)' : '+1 Home Goal'}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selectedMatch && incrementAwayScore(selectedMatch.id)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-500 py-3.5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:bg-amber-400 transition"
                >
                  <AppIcon name="plus" size={16} />
                  <span>{language === 'ar' ? '+ هدف للثاني (Away)' : '+1 Away Goal'}</span>
                </motion.button>
              </div>

              <button
                type="button"
                onClick={() => selectedMatch && undoGoal(selectedMatch.id)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
              >
                <AppIcon name="refresh" size={13} />
                <span>{t('undo')}</span>
              </button>
            </div>

            {/* Lifecycle */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AppIcon name="sliders" size={14} className="text-emerald-400" />
                <span>{language === 'ar' ? 'إدارة حالة المباراة' : 'Match Lifecycle'}</span>
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => selectedMatch && startMatch(selectedMatch.id)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400 bg-emerald-500 py-3 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition"
                >
                  <AppIcon name="play" size={15} />
                  <span>{t('startMatch')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectedMatch && endMatch(selectedMatch.id)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 py-3 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition"
                >
                  <AppIcon name="pause" size={15} />
                  <span>{t('endMatch')}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => selectedMatch && confirmResult(selectedMatch.id)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition"
                >
                  <AppIcon name="check" size={14} />
                  <span>{t('confirmResult')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectedMatch && restartMatch(selectedMatch.id)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <AppIcon name="refresh" size={14} />
                  <span>{t('restartMatch')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stopwatch Controls */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AppIcon name="timer" size={14} className="text-amber-400" />
              <span>{language === 'ar' ? 'التحكم بالساعة والوقت' : 'Timer Adjustments'}</span>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => selectedMatch && toggleTimer(selectedMatch.id)}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition"
              >
                <AppIcon name={selectedMatch?.timer_running ? 'pause' : 'play'} size={14} />
                <span>{selectedMatch?.timer_running ? 'Pause Timer' : 'Play Timer'}</span>
              </button>

              <button
                type="button"
                onClick={() => selectedMatch && resetTimer(selectedMatch.id)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/20 transition"
              >
                <AppIcon name="refresh" size={13} />
                <span>{t('resetTimer')}</span>
              </button>

              <div className="h-4 w-px bg-white/15 mx-1" />

              <button
                type="button"
                onClick={() => selectedMatch && adjustTimerSeconds(selectedMatch.id, +30)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 font-mono"
              >
                +30s
              </button>

              <button
                type="button"
                onClick={() => selectedMatch && adjustTimerSeconds(selectedMatch.id, -30)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 font-mono"
              >
                -30s
              </button>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  )
}
