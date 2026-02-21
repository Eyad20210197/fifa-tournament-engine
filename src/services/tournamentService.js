import { apiClient } from './apiClient'

export async function fetchTournaments() {
  const response = await apiClient.get('/tournaments')
  return response.data.data
}

export async function createTournament(payload) {
  const response = await apiClient.post('/tournaments', payload)
  return response.data.data
}

export async function deleteTournament(tournamentId) {
  const response = await apiClient.delete(`/tournaments/${tournamentId}`)
  return response.data.data
}

export async function updateTournament(tournamentId, payload) {
  const response = await apiClient.patch(`/tournaments/${tournamentId}`, payload)
  return response.data.data
}

export async function fetchTournamentDetails(tournamentId) {
  const response = await apiClient.get(`/tournaments/${tournamentId}/details`)
  return response.data.data
}

export async function replaceTournamentTeams(tournamentId, teams) {
  const response = await apiClient.put(`/tournaments/${tournamentId}/teams`, { teams })
  return response.data.data
}

export async function launchTournament(tournamentId) {
  const response = await apiClient.post(`/tournaments/${tournamentId}/launch`)
  return response.data.data
}

export async function updateMatch(tournamentId, matchId, payload) {
  const response = await apiClient.patch(`/tournaments/${tournamentId}/matches/${matchId}`, payload)
  return response.data.data
}

export async function bulkScheduleMatches(tournamentId, payload) {
  const response = await apiClient.patch(`/tournaments/${tournamentId}/matches/schedule-day`, payload)
  return response.data.data
}
