function stripTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function normalizeApiBaseUrl(raw) {
  const trimmed = stripTrailingSlash(raw)
  if (!trimmed) return '/api'
  if (trimmed === '/api' || trimmed.endsWith('/api')) return trimmed
  return `${trimmed}/api`
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

function toApiOrigin(apiBaseUrl) {
  const trimmed = stripTrailingSlash(apiBaseUrl)
  if (!trimmed || trimmed.startsWith('/')) return ''
  if (trimmed.endsWith('/api')) return trimmed.slice(0, -4)
  return trimmed
}

const API_ORIGIN = toApiOrigin(API_BASE_URL)

export const ABLY_AUTH_URL = API_ORIGIN ? `${API_ORIGIN}/api/ably/token` : '/api/ably/token'
export const ABLY_CLIENT_ID = String(import.meta.env.VITE_ABLY_CLIENT_ID || import.meta.env.NEXT_PUBLIC_ABLY_CLIENT_ID || '').trim()
