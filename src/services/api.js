import axios from 'axios'

function normalizeApiBaseUrl(raw) {
  if (!raw) return '/api'
  const trimmed = String(raw).trim().replace(/\/+$/, '')
  if (trimmed === '/api' || trimmed.endsWith('/api')) return trimmed
  return `${trimmed}/api`
}

const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.NEXT_PUBLIC_API_URL || import.meta.env.VITE_API_BASE_URL,
)
const TOKEN_KEY = 'saasToken'

let onUnauthorized = null
let onSubscriptionExpired = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export function setSubscriptionExpiredHandler(handler) {
  onSubscriptionExpired = handler
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message = String(error?.response?.data?.message || '')

    if (status === 401) {
      onUnauthorized?.(error)
    }

    if (status === 403 && message.toLowerCase().includes('subscription expired')) {
      onSubscriptionExpired?.(error)
    }

    return Promise.reject(error)
  },
)
