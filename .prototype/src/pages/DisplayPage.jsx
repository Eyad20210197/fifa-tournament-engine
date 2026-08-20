import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'

export default function DisplayPage() {
  const { t, language, toggleLanguage, isRtl } = useLanguage()
  const activeScreen = usePrototypeStore((s) => s.activeScreen)
  const setActiveScreen = usePrototypeStore((s) => s.setActiveScreen)
  const branding = usePrototypeStore((s) => s.branding)
  const tournaments = usePrototypeStore((s) => s.tournaments)
  const matches = usePrototypeStore((s) => s.matches)
  const teams = usePrototypeStore((s) => s.teams)
  const standings = usePrototypeStore((s) => s.standings)
  const bracketMatches = usePrototypeStore((s) => s.bracketMatches)
  const liveMatchId = usePrototypeStore((s) => s.liveMatchId)

  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))

  const activeTournament = tournaments[0] || {}
  const activeMatch = matches.find((m) => m.id === liveMatchId) || matches[0]
  const teamById = new Map(teams.map((t) => [t.id, t]))

  const navScreens = [
    { id: 'opening', label: language === 'ar' ? 'الافتتاح' : 'Opening', icon: 'sparkles' },
    { id: 'live', label: language === 'ar' ? 'مباراة مباشرة' : 'Live Match', icon: 'live' },
    { id: 'standings', label: language === 'ar' ? 'الترتيب' : 'Standings', icon: 'trophy' },
    { id: 'bracket', label: language === 'ar' ? 'الشجرة' : 'Bracket', icon: 'layers' },
    { id: 'schedule', label: language === 'ar' ? 'الجدول' : 'Schedule', icon: 'calendar' },
  ]

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => null)
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => null)
      setIsFullscreen(false)
    }
  }

  function formatTime(seconds = 0) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#040711] p-3">
      {/* Top Floating Cinema Navigation */}
      <header className="mb-2 shrink-0 rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-2 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Live Status */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
              <AppIcon name="trophy" size={18} />
            </Link>
            <div>
              <ShinyText
                text={activeTournament.name || branding?.brand_name || 'FIFA Elite Cup'}
                className="text-xs sm:text-sm font-black text-white truncate max-w-[240px]"
              />
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                  {language === 'ar' ? 'البث المباشر للشاشات' : 'LIVE CINEMA BROADCAST'}
                </p>
              </div>
            </div>
          </div>

          {/* Screen Switcher Tabs */}
          <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 p-1">
            {navScreens.map((s) => {
              const active = activeScreen === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveScreen(s.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? 'border border-sky-400 bg-sky-500/25 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                      : 'border border-transparent text-slate-400 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <AppIcon name={s.icon} size={14} className={active ? 'text-sky-400' : ''} />
                  <span>{s.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Controls: Language, Fullscreen, Exit to Hub */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10"
              title="Return to Hub"
            >
              <AppIcon name="arrow" size={13} />
              <span className="hidden sm:inline">{language === 'ar' ? 'الرئيسية' : 'Hub'}</span>
            </Link>

            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1 rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/20"
            >
              <AppIcon name="globe" size={13} className="text-sky-400" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <AppIcon name={isFullscreen ? 'contract' : 'expand'} size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Screen Views */}
      <AnimatePresence mode="wait">
        {/* VIEW 1: OPENING */}
        {activeScreen === 'opening' && (
          <motion.div
            key="opening"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-center"
          >
            <div className="max-w-2xl space-y-4">
              <div className="h-20 w-20 mx-auto flex items-center justify-center rounded-3xl border border-sky-400/40 bg-sky-500/20 text-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.4)] animate-bounce">
                <AppIcon name="trophy" size={40} />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white">
                <ShinyText text={activeTournament.name || 'FIFA Grand Championship 2026'} />
              </h1>
              <p className="text-sm font-bold text-sky-400 uppercase tracking-widest">
                {language === 'ar' ? 'أهلاً بكم في الصالة الرسمية لبطولات الفيفا' : 'WELCOME TO THE OFFICIAL ARENA STAGE'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveScreen('live')}
                  className="rounded-xl border border-sky-400 bg-sky-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:bg-sky-400 transition"
                >
                  {language === 'ar' ? 'الانتقال للمباراة المباشرة' : 'Switch to Live Match'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: LIVE MATCH */}
        {activeScreen === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex min-h-0 flex-1 flex-col items-center justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 via-slate-900/90 to-black p-6"
          >
            {/* Arena Header */}
            <div className="flex items-center justify-between w-full max-w-5xl border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  {language === 'ar' ? 'المباراة المباشرة الآن' : 'LIVE ARENA MATCH'}
                </span>
              </div>
              <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-mono font-bold text-sky-300">
                {activeMatch.stage_name} • Station #1
              </span>
            </div>

            {/* Main Scoreboard Arena */}
            <div className="grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-8 my-auto">
              {/* Home Team */}
              <div className="text-right space-y-1">
                <p className="text-2xl sm:text-4xl font-black text-white">
                  {teamById.get(activeMatch.home_team_id)?.team_name || 'Real Madrid'}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 font-bold">
                  {teamById.get(activeMatch.home_team_id)?.club_name || 'Real Madrid CF'}
                </p>
              </div>

              {/* Score & Clock */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/80 px-6 py-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                  <span className="text-5xl sm:text-7xl font-black text-cyan-400 font-mono tabular-nums">
                    {activeMatch.home_score ?? 0}
                  </span>
                  <span className="text-3xl sm:text-5xl font-bold text-slate-600">:</span>
                  <span className="text-5xl sm:text-7xl font-black text-amber-400 font-mono tabular-nums">
                    {activeMatch.away_score ?? 0}
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-950/50 px-4 py-1.5 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                  <AppIcon name="timer" size={16} className="text-sky-400" />
                  <span className="font-mono text-xl sm:text-2xl font-black text-white tabular-nums tracking-wider">
                    {formatTime(activeMatch.timer_seconds || 432)}
                  </span>
                </div>
              </div>

              {/* Away Team */}
              <div className="text-left space-y-1">
                <p className="text-2xl sm:text-4xl font-black text-white">
                  {teamById.get(activeMatch.away_team_id)?.team_name || 'FC Barcelona'}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 font-bold">
                  {teamById.get(activeMatch.away_team_id)?.club_name || 'FC Barcelona'}
                </p>
              </div>
            </div>

            {/* Bottom Sponsor Banner */}
            <div className="w-full max-w-5xl rounded-xl border border-white/10 bg-slate-900/60 p-2.5 flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold">{branding?.brand_name}</span>
              <span className="font-mono text-amber-400 font-bold">{language === 'ar' ? 'البطولة برعاية PlayStation' : 'Sponsored by PlayStation Arena'}</span>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: STANDINGS */}
        {activeScreen === 'standings' && (
          <motion.div
            key="standings"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-5 space-y-4"
          >
            <h2 className="text-center text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
              <AppIcon name="trophy" size={24} className="text-amber-400" />
              <span>{language === 'ar' ? 'جدول ترتيب دوري النخبة' : 'LEAGUE TABLE STANDINGS'}</span>
            </h2>

            <div className="grid grid-cols-[0.3fr_1.8fr_0.5fr_0.5fr_0.5fr_0.6fr] px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>{language === 'ar' ? 'المركز' : 'POS'}</span>
              <span>{language === 'ar' ? 'الفريق' : 'CLUB'}</span>
              <span className="text-center">{language === 'ar' ? 'لعب' : 'PL'}</span>
              <span className="text-center">{language === 'ar' ? 'فارق' : 'GD'}</span>
              <span className="text-center">{language === 'ar' ? 'له' : 'GF'}</span>
              <span className="text-center text-amber-400">{language === 'ar' ? 'نقاط' : 'PTS'}</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {standings.map((row, idx) => {
                const team = teamById.get(row.teamId)
                const isLeader = idx === 0
                return (
                  <div
                    key={row.teamId}
                    className={`grid grid-cols-[0.3fr_1.8fr_0.5fr_0.5fr_0.5fr_0.6fr] items-center px-4 py-2.5 rounded-xl border transition-all ${
                      isLeader
                        ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-slate-900/80 to-slate-900/80 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                        : 'border-white/10 bg-slate-900/60'
                    }`}
                  >
                    <span className={`font-mono text-base font-black ${isLeader ? 'text-amber-400' : 'text-slate-400'}`}>
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-white truncate">
                      {team?.team_name || '--'}
                    </span>
                    <span className="text-center font-mono text-slate-300 font-bold">{row.played}</span>
                    <span className="text-center font-mono text-slate-300 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                    <span className="text-center font-mono text-slate-300 font-bold">{row.gf}</span>
                    <span className={`text-center font-mono text-base font-black ${isLeader ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {row.points}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* VIEW 4: BRACKET */}
        {activeScreen === 'bracket' && (
          <motion.div
            key="bracket"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-5 space-y-4"
          >
            <h2 className="text-center text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
              <AppIcon name="layers" size={24} className="text-sky-400" />
              <span>{language === 'ar' ? 'شجرة الأدوار الإقصائية والنهائيات' : 'KNOCKOUT PLAYOFF BRACKET'}</span>
            </h2>

            <div className="flex-1 space-y-3 max-w-4xl mx-auto w-full overflow-y-auto">
              {bracketMatches.map((bm) => (
                <div
                  key={bm.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-2.5 shadow-lg"
                >
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{bm.stage}</span>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="text-right">
                      <p className={`text-base font-bold truncate ${bm.winnerName === bm.homeName ? 'text-amber-400 font-black' : 'text-white'}`}>
                        {bm.homeName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/60 px-4 py-1 font-mono">
                      <span className="text-xl font-black text-cyan-300">{bm.homeScore}</span>
                      <span className="text-slate-500 font-bold">:</span>
                      <span className="text-xl font-black text-amber-300">{bm.awayScore}</span>
                    </div>

                    <div className="text-left">
                      <p className={`text-base font-bold truncate ${bm.winnerName === bm.awayName ? 'text-amber-400 font-black' : 'text-white'}`}>
                        {bm.awayName}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW 5: SCHEDULE */}
        {activeScreen === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-5 space-y-4"
          >
            <h2 className="text-center text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
              <AppIcon name="calendar" size={24} className="text-sky-400" />
              <span>{language === 'ar' ? 'جدول وتوقيت المباريات' : 'MATCH FIXTURES & TIMETABLE'}</span>
            </h2>

            <div className="flex-1 space-y-2.5 max-w-4xl mx-auto w-full overflow-y-auto">
              {matches.map((m) => {
                const home = teamById.get(m.home_team_id)?.team_name || '--'
                const away = teamById.get(m.away_team_id)?.team_name || '--'
                const isLive = m.status === 'live'
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      isLive
                        ? 'border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                        : 'border-white/10 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-black/50 px-2.5 py-1 font-mono text-xs font-bold text-slate-400">
                        #{m.id}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {home} <span className="text-amber-400 font-mono">VS</span> {away}
                        </p>
                        <p className="text-[11px] text-slate-400">{m.stage_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          isLive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isLive ? 'LIVE' : m.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
