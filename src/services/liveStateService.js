import { apiClient } from './apiClient'

export async function fetchCurrentLiveState() {
  const response = await apiClient.get('/live-state/current')
  return response.data?.data?.snapshot || null
}

export async function saveCurrentLiveState(snapshot) {
  const response = await apiClient.put('/live-state/current', { snapshot })
  return response.data?.data?.snapshot || null
}
