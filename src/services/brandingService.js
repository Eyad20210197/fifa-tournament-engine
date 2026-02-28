import { apiClient } from './apiClient'

export async function fetchBusinesses() {
  const response = await apiClient.get('/businesses')
  return response.data.data
}

export async function createBusiness(payload) {
  const response = await apiClient.post('/businesses', payload)
  return response.data.data
}

export async function updateBusiness(businessId, payload) {
  const response = await apiClient.patch(`/businesses/${businessId}`, payload)
  return response.data.data
}

export async function deleteBusiness(businessId) {
  const response = await apiClient.delete(`/businesses/${businessId}`)
  return response.data.data
}

export async function updateBusinessSubscription(businessId, subscription_expires_at) {
  const response = await apiClient.patch(`/businesses/${businessId}/subscription`, { subscription_expires_at })
  return response.data.data
}

export async function fetchBusinessBranding() {
  const response = await apiClient.get('/businesses/branding')
  return response.data.data || response.data || null
}

export async function updateMyBusinessBranding(payload) {
  const response = await apiClient.patch('/businesses/branding', payload)
  return response.data.data || response.data || null
}
