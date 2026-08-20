import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { RamadanStage } from '../components/common/RamadanStage'
import { useTournamentStore } from '../store/tournamentStore'
import { OpeningScreen } from '../components/live/OpeningScreen'
import { LiveMatchScreen } from '../components/live/LiveMatchScreen'
import { StandingsTable } from '../components/standings/StandingsTable'
import { BracketView } from '../components/bracket/BracketView'
import { ScheduleList } from '../components/schedule/ScheduleList'
import { fetchCurrentLiveState } from '../services/liveStateService'
import { fetchTournamentDetails, fetchTournaments } from '../services/tournamentService'
import { useAuth } from '../auth/useAuth'
import { useLanguage } from '../i18n/LanguageContext'
import { useAblyChannel } from '../hooks/useAblyChannel'
import { matchChannel, tournamentChannel } from '../services/channelNames'
import {
  isLikelyIncompleteLiveSnapshot,
  mapTournamentDetailsToLiveState,
  mergeLiveSnapshotWithTournamentDetails,
} from '../utils/tournament/liveSnapshot'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'

export default function Display() {
  const hydrated = useTournamentStore((s) => s._meta.hydrated)
  const tournamentId = useTournamentStore((s) => s.tournament.id)
  const tournamentName = useTournamentStore((s) => s.tournament.name)
  const liveMatchId = useTournamentStore((s) => s.liveMatchState.matchId)
  const activeScreen = useTournamentStore((s) => s.activeScreen)
  const setActiveScreen = useTournamentStore((s) => s.setActiveScreen)
  const { branding } = useAuth()
  const { t, language, toggleLanguage, isRtl } = useLanguage()

  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))

  // Cross-Tab 0ms instant broadcast channel sync
  useEffect(() => {
    let channel = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('fifa_live_state')
        const onMessage = (event) => {
          if (event.data?.type === 'SCREEN_CHANGE' && event.data?.screen) {
            useTournamentStore.setState((s) => ({ ...s, activeScreen: event.data.screen }))
          } else if (event.data?.type === 'STATE_UPDATE' && event.data?.snapshot) {
            useTournamentStore.getState().applyRemoteState(event.data.snapshot)
          }
        }
        channel.addEventListener('message', onMessage)
      }
    } catch {
      // ignore
    }

    return () => {
      channel?.close?.()
    }
  }, [])

  // Initial Snapshot Bootstrap
  useEffect(() => {
    const { style: htmlStyle } = document.documentElement
    const { style: bodyStyle } = document.body
    const prevHtmlOverflow = htmlStyle.overflow
    const prevBodyOverflow = bodyStyle.overflow
    htmlStyle.overflow = 'hidden'
    bodyStyle.overflow = 'hidden'

    void fetchCurrentLiveState()
      .then(async (snapshot) => {
        if (snapshot && !isLikelyIncompleteLiveSnapshot(snapshot)) {
          const snapshotTournamentId = Number(snapshot?.tournament?.id)
          if (Number.isFinite(snapshotTournamentId) && snapshotTournamentId > 0) {
            const details = await fetchTournamentDetails(snapshotTournamentId).catch(() => null)
            if (details) {
              useTournamentStore.getState().applyRemoteState(mergeLiveSnapshotWithTournamentDetails(snapshot, details))
              return
            }
          }

          useTournamentStore.getState().applyRemoteState(snapshot)
          return
        }

        const tournaments = await fetchTournaments().catch(() => [])
        const target =
          tournaments.find((item) => item.status === 'live') ||
          tournaments.find((item) => item.status === 'scheduled') ||
          tournaments[0]
        if (!target?.id) return

        const details = await fetchTournamentDetails(Number(target.id)).catch(() => null)
        if (details) {
          useTournamentStore.getState().applyRemoteState(mapTournamentDetailsToLiveState(details))
        }
      })
      .finally(() => {
        useTournamentStore.setState((state) => ({
          ...state,
          _meta: { ...state._meta, hydrated: true },
        }))
      })

    return () => {
      htmlStyle.overflow = prevHtmlOverflow
      bodyStyle.overflow = prevBodyOverflow
    }
  }, [])

  // Fast Real-Time Fallback Polling (Every 2.5 seconds)
  useEffect(() => {
    const syncFromServer = async () => {
      const snapshot = await fetchCurrentLiveState().catch(() => null)
      if (!snapshot || typeof snapshot !== 'object' || isLikelyIncompleteLiveSnapshot(snapshot)) return

      const snapshotTournamentId = Number(snapshot?.tournament?.id)
      if (Number.isFinite(snapshotTournamentId) && snapshotTournamentId > 0) {
        const details = await fetchTournamentDetails(snapshotTournamentId).catch(() => null)
        if (details) {
          useTournamentStore.getState().applyRemoteState(mergeLiveSnapshotWithTournamentDetails(snapshot, details))
          return
        }
      }

      useTournamentStore.getState().applyRemoteState(snapshot)
    }

    const intervalId = setInterval(() => {
      void syncFromServer()
    }, 2500)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  // Ably Real-Time Listeners
  useAblyChannel(tournamentChannel(tournamentId), 'state:update', (data) => {
    const snapshot = data?.snapshot || data?.payload || data
    if (snapshot && typeof snapshot === 'object' && !isLikelyIncompleteLiveSnapshot(snapshot)) {
      useTournamentStore.getState().applyRemoteState(snapshot)
    }
  })

  useAblyChannel(tournamentChannel(tournamentId), 'timer:update', (data) => {
    if (data?.matchId != null) {
      useTournamentStore.getState().applyMatchTimerUpdate(data)
    }
  })

  useAblyChannel(tournamentChannel(tournamentId), 'timer:clear', (data) => {
    if (data?.matchId != null) {
      useTournamentStore.getState().clearMatchTimerLocal(data.matchId)
    }
  })

  const applyMatchScoreUpdate = (data) => {
    const matchId = Number(data?.matchId)
    if (!Number.isFinite(matchId) || matchId <= 0) return
    useTournamentStore.setState((state) => ({
      ...state,
      matches: state.matches.map((match) =>
        Number(match.id) === matchId
          ? {
              ...match,
              homeScore: Number(data?.homeScore ?? match.homeScore ?? 0),
              awayScore: Number(data?.awayScore ?? match.awayScore ?? 0),
              status: data?.status || match.status,
            }
          : match,
      ),
    }))
  }

  useAblyChannel(matchChannel(liveMatchId), 'score:update', applyMatchScoreUpdate)
  useAblyChannel(matchChannel(liveMatchId), 'match:update', applyMatchScoreUpdate)

  const navScreens = useMemo(
    () => [
      { id: 'opening', label: language === 'ar' ? 'الافتتاح' : 'Opening', icon: 'sparkles' },
      { id: 'live', label: language === 'ar' ? 'مباراة مباشرة' : 'Live Match', icon: 'live' },
      { id: 'standings', label: language === 'ar' ? 'الترتيب' : 'Standings', icon: 'trophy' },
      { id: 'bracket', label: language === 'ar' ? 'الشجرة' : 'Bracket', icon: 'layers' },
      { id: 'schedule', label: language === 'ar' ? 'الجدول' : 'Schedule', icon: 'calendar' },
    ],
    [language],
  )

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => null)
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => null)
      setIsFullscreen(false)
    }
  }

  return (
    <RamadanStage variant="display">
      <div className="mx-auto flex h-[100dvh] w-[98vw] max-w-[2500px] flex-col overflow-hidden py-2 px-2">
        {/* Top Floating Cinema Navigation & Screen Switcher Bar */}
        <header className="mb-2 shrink-0 rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Brand Logo & Tournament Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                <AppIcon name="trophy" size={18} />
              </div>
              <div>
                <ShinyText
                  text={tournamentName || branding?.brand_name || t('appName')}
                  className="text-sm font-black text-white truncate max-w-[220px]"
                />
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                    {language === 'ar' ? 'البث المباشر للشاشة' : 'LIVE CINEMA BROADCAST'}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Screen Switcher Tabs */}
            <nav className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/90 p-1">
              {navScreens.map((s) => {
                const active = activeScreen === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveScreen(s.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
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

            {/* Right Quick Controls: Language & Fullscreen */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 active:scale-95"
                title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
              >
                <AppIcon name="globe" size={13} className="text-sky-400" />
                <span>{language === 'ar' ? 'English' : 'عربي'}</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                <AppIcon name={isFullscreen ? 'contract' : 'expand'} size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Screen View with Motion Transitions */}
        <AnimatePresence mode="wait">
          <motion.section
            key={activeScreen}
            initial={{ opacity: 0, scale: 0.99, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-0 flex-1 overflow-hidden"
          >
            {!hydrated ? (
              <CenterMessage>{language === 'ar' ? 'جار تحميل شاشة العرض المباشر...' : 'Loading spectator display...'}</CenterMessage>
            ) : activeScreen === 'opening' ? (
              <OpeningScreen />
            ) : activeScreen === 'live' ? (
              <LiveMatchScreen />
            ) : activeScreen === 'standings' ? (
              <StandingsTable />
            ) : activeScreen === 'bracket' ? (
              <BracketView />
            ) : activeScreen === 'schedule' ? (
              <ScheduleList />
            ) : (
              <CenterMessage>{language === 'ar' ? 'الشاشة المطلوبة غير متوفرة' : 'Requested view is unavailable'}</CenterMessage>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </RamadanStage>
  )
}

function CenterMessage({ children }) {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-[clamp(1rem,1.5vw,1.8rem)] text-slate-300 backdrop-blur-xl">
      {children}
    </div>
  )
}
