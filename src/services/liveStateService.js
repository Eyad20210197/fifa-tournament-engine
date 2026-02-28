import { apiClient } from './apiClient'

export async function fetchCurrentLiveState() {
  const response = await apiClient.get('/live-state/current')
  return response.data?.data?.snapshot || null
}

export async function saveCurrentLiveState(snapshot) {
  const response = await apiClient.put('/live-state/current', { snapshot })
  return response.data?.data?.snapshot || null
}

export async function startMatchTimer({ tournamentId, matchId, durationMs }) {
  const response = await apiClient.post(`/live-state/timers/${matchId}/start`, { tournamentId, durationMs })
  return response.data?.data || null
}

export async function pauseMatchTimer({ tournamentId, matchId }) {
  const response = await apiClient.post(`/live-state/timers/${matchId}/pause`, { tournamentId })
  return response.data?.data || null
}

export async function resumeMatchTimer({ tournamentId, matchId }) {
  const response = await apiClient.post(`/live-state/timers/${matchId}/resume`, { tournamentId })
  return response.data?.data || null
}

export async function setMatchTimerDuration({ tournamentId, matchId, durationMs }) {
  const response = await apiClient.post(`/live-state/timers/${matchId}/set-duration`, { tournamentId, durationMs })
  return response.data?.data || null
}

export async function adjustMatchTimer({ tournamentId, matchId, deltaMs }) {
  const response = await apiClient.post(`/live-state/timers/${matchId}/adjust`, { tournamentId, deltaMs })
  return response.data?.data || null
}

export async function clearMatchTimer({ tournamentId, matchId }) {
  const response = await apiClient.delete(`/live-state/timers/${matchId}`, { data: { tournamentId } })
  return response.data?.data || null
}

export async function publishMockMatchUpdate(payload) {
  const response = await apiClient.post('/ably/test/match-update', payload)
  return response.data?.data || null
}
