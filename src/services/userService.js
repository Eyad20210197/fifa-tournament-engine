import { apiClient } from './apiClient'

export async function fetchUsers() {
  const response = await apiClient.get('/users')
  return response.data.data
}

export async function createUser(payload) {
  const response = await apiClient.post('/users', payload)
  return response.data.data
}

