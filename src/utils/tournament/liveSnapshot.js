import { fetchCurrentLiveState, saveCurrentLiveState } from '../../services/liveStateService'

function toPositiveNumberOrNull(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function filterGoalEvents(goalEvents, validMatchIds) {
  if (!Array.isArray(goalEvents)) return []
  return goalEvents.filter((event) => validMatchIds.has(Number(event?.matchId)))
}

function filterMatchTimers(matchTimers, validMatchIds) {
  if (!matchTimers || typeof matchTimers !== 'object') return {}
  return Object.fromEntries(
    Object.entries(matchTimers).filter(([matchId]) => validMatchIds.has(Number(matchId))),
  )
}

export function isLikelyIncompleteLiveSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false
  const teamsEmpty = Array.isArray(snapshot.teams) && snapshot.teams.length === 0
  const matchesEmpty = Array.isArray(snapshot.matches) && snapshot.matches.length === 0
  if (!teamsEmpty && !matchesEmpty) return false
  return snapshot?.liveMatchState?.matchId != null || (snapshot.activeScreen && snapshot.activeScreen !== 'opening')
}

export function mapTournamentDetailsToLiveState(details) {
  const format = details?.format || 'دوري'
  const mode = format === 'خروج مغلوب' ? 'knockout' : 'league'

  return {
    tournament: {
      id: toPositiveNumberOrNull(details?.id),
      name: details?.name || 'Tournament',
      format,
    },
    teams: (details?.teams || []).map((team) => ({
      id: Number(team.id),
      teamName: team.team_name || '--',
      clubName: team.club_name || '',
    })),
    matches: (details?.matches || []).map((match, index) => {
      const startsAt = match.starts_at || null
      const roundNumber = Number(match.round_number || 1)
      const legNumber = Number(match.leg_number || 1)
      return {
        id: Number(match.id),
        order: index + 1,
        mode,
        startsAt,
        starts_at: startsAt,
        homeTeamId: toPositiveNumberOrNull(match.home_team_id),
        awayTeamId: toPositiveNumberOrNull(match.away_team_id),
        homeScore: Number(match.home_score || 0),
        awayScore: Number(match.away_score || 0),
        status: match.status || 'pending',
        round: roundNumber,
        round_number: roundNumber,
        stageName: match.stage_name || '',
        stage_name: match.stage_name || '',
        legNumber,
        leg_number: legNumber,
        resultConfirmed: Boolean(match.result_confirmed),
        winnerTeamId: toPositiveNumberOrNull(match.winner_team_id),
      }
    }),
    standings: Array.isArray(details?.standings) ? details.standings : [],
    sponsor: {
      urls: details?.sponsor_logo_url ? [details.sponsor_logo_url] : [],
    },
  }
}

export function mergeLiveSnapshotWithTournamentDetails(snapshot, details) {
  const mapped = mapTournamentDetailsToLiveState(details)
  const validMatchIds = new Set(mapped.matches.map((match) => Number(match.id)))
  const requestedLiveMatchId = Number(snapshot?.liveMatchState?.matchId)
  const liveMatchId = validMatchIds.has(requestedLiveMatchId) ? requestedLiveMatchId : null

  return {
    ...snapshot,
    ...mapped,
    standings: mapped.standings.length ? mapped.standings : Array.isArray(snapshot?.standings) ? snapshot.standings : [],
    activeScreen: snapshot?.activeScreen || 'opening',
    sponsor: mapped.sponsor,
    liveMatchState: {
      matchId: liveMatchId,
      goalEvents: filterGoalEvents(snapshot?.liveMatchState?.goalEvents, validMatchIds),
    },
    matchTimers: filterMatchTimers(snapshot?.matchTimers, validMatchIds),
  }
}

export async function publishTournamentDetailsToLiveState(details, { force = false } = {}) {
  const tournamentId = toPositiveNumberOrNull(details?.id)
  if (!tournamentId) return null

  const currentSnapshot = await fetchCurrentLiveState().catch(() => null)
  const snapshotTournamentId = toPositiveNumberOrNull(currentSnapshot?.tournament?.id)
  const tournamentStatus = String(details?.status || '').toLowerCase()
  const shouldPublish = force || snapshotTournamentId === tournamentId || tournamentStatus === 'live'

  if (!shouldPublish) return currentSnapshot

  const nextSnapshot = mergeLiveSnapshotWithTournamentDetails(currentSnapshot, details)
  return saveCurrentLiveState(nextSnapshot).catch(() => null)
}
