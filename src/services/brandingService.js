import { apiClient } from './apiClient'

export async function fetchBusinesses() {
  const response = await apiClient.get('/businesses')
  return response.data.data
}

export async function fetchBusinessBranding() {
  const endpoints = ['/business/branding', '/businesses/branding', '/branding']
  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.get(endpoint)
      return response.data.data || response.data
    } catch (error) {
      if (error?.response?.status !== 404) throw error
    }
  }
  return null
}
