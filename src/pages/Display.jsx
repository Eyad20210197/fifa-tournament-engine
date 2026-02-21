import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { RamadanStage } from '../components/common/RamadanStage'
import { useTournamentStore } from '../store/tournamentStore'
import { OpeningScreen } from '../components/live/OpeningScreen'
import { LiveMatchScreen } from '../components/live/LiveMatchScreen'
import { StandingsTable } from '../components/standings/StandingsTable'
import { BracketView } from '../components/bracket/BracketView'
import { ScheduleList } from '../components/schedule/ScheduleList'
import { connectLiveStateSocket, subscribeLiveState } from '../services/liveStateSocket'
import { fetchCurrentLiveState } from '../services/liveStateService'
import { fetchTournamentDetails, fetchTournaments } from '../services/tournamentService'

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
      logoBase64: details?.sponsor_logo_url || null,
    },
  }
}

export default function Display() {
  const hydrated = useTournamentStore((s) => s._meta.hydrated)
  const tournament = useTournamentStore((s) => s.tournament)
  const activeScreen = useTournamentStore((s) => s.activeScreen)

  useEffect(() => {
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

    connectLiveStateSocket()
    return subscribeLiveState((message) => {
      if (message?.type === 'STATE_UPDATED' && message.payload) {
        useTournamentStore.getState().applyRemoteState(message.payload)
      }
    })
  }, [])

  return (
    <RamadanStage variant="display">
      <div className="mx-auto flex min-h-screen w-[95vw] max-w-[2400px] flex-col py-[2vh]">
        <header className="mb-[2vh] rounded-3xl border border-white/10 bg-black/25 px-[2.2vw] py-[1.2vh] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[clamp(1.3rem,2.2vw,2.8rem)] font-semibold">{tournament?.name || 'البطولة'}</h1>
            <span className="rounded-full border border-[var(--primary-color)]/45 bg-[var(--primary-color)]/12 px-4 py-2 text-[clamp(0.75rem,1.1vw,1.2rem)] text-[var(--secondary-color)]">
              {labels[activeScreen] || 'عرض مباشر'}
            </span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeScreen}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
            className="flex-1"
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
    <div className="grid h-full min-h-[60vh] place-items-center rounded-3xl border border-white/10 bg-black/20 p-8 text-[clamp(1rem,1.7vw,2rem)] text-[var(--text-primary)]">
      {children}
    </div>
  )
}
