import { apiClient } from './apiClient'

export async function upsertFinancialSetup(payload) {
  const response = await apiClient.post('/finance/financials', payload)
  return response.data.data
}

export async function createExpense(payload) {
  const response = await apiClient.post('/finance/expenses', payload)
  return response.data.data
}

export async function fetchFinanceSummary(tournamentId) {
  try {
    const response = await apiClient.get(`/finance/${tournamentId}`)
    return response.data.data
  } catch (error) {
    if (error?.response?.status !== 404) throw error
    const fallback = await apiClient.get(`/finance/summary/${tournamentId}`)
    return fallback.data.data
  }
}
