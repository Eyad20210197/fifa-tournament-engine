import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { RamadanStage } from '../components/common/RamadanStage'
import { useTournamentStore } from '../store/tournamentStore'
import { OpeningScreen } from '../components/live/OpeningScreen'
import { LiveMatchScreen } from '../components/live/LiveMatchScreen'
import { StandingsTable } from '../components/standings/StandingsTable'
import { BracketView } from '../components/bracket/BracketView'
import { ScheduleList } from '../components/schedule/ScheduleList'
import {
  acquireLiveStateSocket,
  releaseLiveStateSocket,
  subscribeLiveState,
  subscribeLiveStateConnectionStatus,
} from '../services/liveStateSocket'
import { fetchCurrentLiveState } from '../services/liveStateService'
import { fetchTournamentDetails, fetchTournaments } from '../services/tournamentService'
import { useAuth } from '../auth/useAuth'

const labels = {
  opening: 'الافتتاح',
  live: 'مباراة مباشرة',
  standings: 'الترتيب',
  bracket: 'شجرة البطولة',
  schedule: 'الجدول',
}

function mapDetailsToDisplayState(details) {
  const format = details?.format || 'دوري'
  const mode = format === 'خروج مغلوب' ? 'knockout' : 'league'

  return {
    tournament: {
      name: details?.name || 'Tournament',
      format,
    },
    teams: (details?.teams || []).map((team) => ({
      id: Number(team.id),
      teamName: team.team_name || '--',
      clubName: team.club_name || '',
    })),
    matches: (details?.matches || []).map((match, index) => ({
      id: Number(match.id),
      order: index + 1,
      mode,
      homeTeamId: match.home_team_id ? Number(match.home_team_id) : null,
      awayTeamId: match.away_team_id ? Number(match.away_team_id) : null,
      homeScore: Number(match.home_score || 0),
      awayScore: Number(match.away_score || 0),
      status: match.status || 'pending',
      round: Number(match.round_number || 1),
      resultConfirmed: false,
      winnerTeamId: null,
    })),
    sponsor: {
      urls: details?.sponsor_logo_url ? [details.sponsor_logo_url] : [],
    },
  }
}

export default function Display() {
  const hydrated = useTournamentStore((s) => s._meta.hydrated)
  const tournament = useTournamentStore((s) => s.tournament)
  const activeScreen = useTournamentStore((s) => s.activeScreen)
  const { branding } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  useEffect(() => {
    const { style: htmlStyle } = document.documentElement
    const { style: bodyStyle } = document.body
    const prevHtmlOverflow = htmlStyle.overflow
    const prevBodyOverflow = bodyStyle.overflow
    htmlStyle.overflow = 'hidden'
    bodyStyle.overflow = 'hidden'

    void fetchCurrentLiveState()
      .then(async (snapshot) => {
        const snapshotLooksIncomplete =
          snapshot &&
          Array.isArray(snapshot.teams) &&
          Array.isArray(snapshot.matches) &&
          snapshot.teams.length === 0 &&
          snapshot.matches.length === 0 &&
          (snapshot?.liveMatchState?.matchId != null || (snapshot.activeScreen && snapshot.activeScreen !== 'opening'))

        if (snapshot && !snapshotLooksIncomplete) {
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
          useTournamentStore.getState().applyRemoteState(mapDetailsToDisplayState(details))
        }
      })
      .finally(() => {
        useTournamentStore.setState((state) => ({
          ...state,
          _meta: { ...state._meta, hydrated: true },
        }))
      })

    acquireLiveStateSocket()
    const unsubscribe = subscribeLiveState((message) => {
      if (message?.type === 'STATE_UPDATED' && message.payload) {
        useTournamentStore.getState().applyRemoteState(message.payload)
        return
      }
      if (message?.type === 'MATCH_TIMER_UPDATED' && message.payload) {
        useTournamentStore.getState().applyMatchTimerUpdate(message.payload)
        return
      }
      if (message?.type === 'MATCH_TIMER_CLEARED' && message.payload?.matchId != null) {
        useTournamentStore.getState().clearMatchTimerLocal(message.payload.matchId)
      }
    })
    const unsubscribeStatus = subscribeLiveStateConnectionStatus((status) => {
      setConnectionStatus(status)
    })

    return () => {
      unsubscribe()
      unsubscribeStatus()
      releaseLiveStateSocket()
      htmlStyle.overflow = prevHtmlOverflow
      bodyStyle.overflow = prevBodyOverflow
    }
  }, [])

  return (
    <RamadanStage variant="display">
      <div className="mx-auto flex h-[100dvh] w-[96vw] max-w-[2400px] flex-col overflow-hidden py-2">
        <header className="mb-2 shrink-0 rounded-3xl border border-white/10 bg-black/25 px-4 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AnimatedHeaderLogo brandingLogoUrl={branding?.animated_logo_url} />
              <h1 className="truncate text-[clamp(1.1rem,1.8vw,2.2rem)] font-semibold">{tournament?.name || 'البطولة'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[var(--primary-color)]/45 bg-[var(--primary-color)]/12 px-3 py-1 text-[clamp(0.75rem,0.95vw,1rem)] text-[var(--secondary-color)]">
                {labels[activeScreen] || 'عرض مباشر'}
              </span>
              <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[clamp(0.7rem,0.9vw,0.95rem)] text-white/90">
                WS: {connectionStatus}
              </span>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeScreen}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="min-h-0 flex-1 overflow-hidden"
          >
            {!hydrated ? (
              <CenterMessage>جار تحميل شاشة العرض المباشر...</CenterMessage>
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
              <CenterMessage>الشاشة المطلوبة غير متوفرة</CenterMessage>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </RamadanStage>
  )
}

function CenterMessage({ children }) {
  return (
    <div className="grid h-full place-items-center rounded-3xl border border-white/10 bg-black/20 p-4 text-[clamp(1rem,1.5vw,1.8rem)] text-[var(--text-primary)]">
      {children}
    </div>
  )
}

function AnimatedHeaderLogo({ brandingLogoUrl }) {
  const logoVideoUrl =
    String(brandingLogoUrl || '').trim() || String(import.meta.env.VITE_DISPLAY_LOGO_MOV_URL || '').trim()
  if (!logoVideoUrl) return null

  return (
    <video
      src={logoVideoUrl}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="h-[clamp(40px,3.8vw,88px)] w-[clamp(96px,9vw,190px)] object-contain"
      aria-label="Animated tournament logo"
    />
  )
}
