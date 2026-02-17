import { apiClient } from './apiClient'

export async function fetchTournaments() {
  const response = await apiClient.get('/tournaments')
  return response.data.data
}

export async function createTournament(payload) {
  const response = await apiClient.post('/tournaments', payload)
  return response.data.data
}

export async function fetchTournamentDetails(tournamentId) {
  const response = await apiClient.get(`/tournaments/${tournamentId}/details`)
  return response.data.data
}

export async function updateMatch(tournamentId, matchId, payload) {
  const response = await apiClient.patch(`/tournaments/${tournamentId}/matches/${matchId}`, payload)
  return response.data.data
}

