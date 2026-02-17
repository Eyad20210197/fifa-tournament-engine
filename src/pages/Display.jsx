import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { RamadanStage } from '../components/common/RamadanStage'
import { useTournamentStore } from '../store/tournamentStore'
import { OpeningScreen } from '../components/live/OpeningScreen'
import { LiveMatchScreen } from '../components/live/LiveMatchScreen'
import { StandingsTable } from '../components/standings/StandingsTable'
import { BracketView } from '../components/bracket/BracketView'
import { ScheduleList } from '../components/schedule/ScheduleList'
import { ScreenLabel } from '../components/common/ScreenLabel'
import { connectLiveStateSocket, subscribeLiveState } from '../services/liveStateSocket'
import { fetchCurrentLiveState } from '../services/liveStateService'

export default function Display() {
  const hydrated = useTournamentStore((s) => s._meta.hydrated)
  const tournament = useTournamentStore((s) => s.tournament)
  const sponsor = useTournamentStore((s) => s.sponsor)
  const activeScreen = useTournamentStore((s) => s.activeScreen)

  useEffect(() => {
    void fetchCurrentLiveState()
      .then((snapshot) => {
        if (snapshot) {
          useTournamentStore.getState().applyRemoteState(snapshot)
        }
      })
      .finally(() => {
        useTournamentStore.setState((state) => ({
          ...state,
          _meta: { ...state._meta, hydrated: true },
        }))
      })

    connectLiveStateSocket()
    return subscribeLiveState((msg) => {
      if (!msg || msg.type !== 'STATE_UPDATED') return
      if (!msg.payload) return
      useTournamentStore.getState().applyRemoteState(msg.payload)
    })
  }, [])

  return (
    <RamadanStage variant="display">
      <div className="relative mx-auto min-h-screen w-full max-w-[1600px] px-8 py-10">
        <Header tournamentName={tournament?.name} sponsorLogo={sponsor?.logoBase64} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mt-10"
          >
            {!hydrated ? (
              <CenterMessage>Loading live screen...</CenterMessage>
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
              <CenterMessage>Unknown screen</CenterMessage>
            )}
          </motion.div>
        </AnimatePresence>

        <Footer activeScreen={activeScreen} />
      </div>
    </RamadanStage>
  )
}

function Header({ tournamentName, sponsorLogo }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <div className="text-sm text-white/60">Live Broadcast</div>
        <div className="mt-1 text-3xl font-semibold tracking-wide">{tournamentName || 'Tournament'}</div>
      </div>

      <div className="flex items-center gap-4">
        {sponsorLogo ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
            <img alt="Sponsor" src={sponsorLogo} className="h-12 w-auto object-contain" />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 backdrop-blur">
            Sponsor Area
          </div>
        )}
      </div>
    </div>
  )
}

function Footer({ activeScreen }) {
  return (
    <div className="pointer-events-none mt-10 flex items-center justify-between">
      <ScreenLabel>Screen: {screenLabel(activeScreen)}</ScreenLabel>
      <ScreenLabel>Real-time sync via API + WebSocket</ScreenLabel>
    </div>
  )
}

function screenLabel(id) {
  switch (id) {
    case 'opening':
      return 'Opening'
    case 'live':
      return 'Live Match'
    case 'standings':
      return 'Standings'
    case 'bracket':
      return 'Bracket'
    case 'schedule':
      return 'Schedule'
    default:
      return '-'
  }
}

function CenterMessage({ children }) {
  return (
    <div className="grid min-h-[50vh] place-items-center rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur">
      <div className="text-xl text-white/85">{children}</div>
    </div>
  )
}
