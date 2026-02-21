import { apiClient } from './apiClient'

export async function upsertFinancialSetup(payload) {
  const response = await apiClient.post('/finance/financials', payload)
  return response.data.data
}

export async function fetchFinancialSetup(tournamentId) {
  const response = await apiClient.get(`/finance/financials/${tournamentId}`)
  return response.data.data
}

export async function deleteFinancialSetup(tournamentId) {
  const response = await apiClient.delete(`/finance/financials/${tournamentId}`)
  return response.data.data
}

export async function createExpense(payload) {
  const response = await apiClient.post('/finance/expenses', payload)
  return response.data.data
}

export async function fetchExpenses(tournamentId) {
  const response = await apiClient.get(`/finance/expenses/${tournamentId}`)
  return response.data.data
}

export async function deleteExpense(expenseId) {
  const response = await apiClient.delete(`/finance/expenses/${expenseId}`)
  return response.data.data
}

export async function fetchFinanceSummary(tournamentId) {
  const response = await apiClient.get(`/finance/summary/${tournamentId}`)
  return response.data.data
}
