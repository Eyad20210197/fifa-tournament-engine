function stripTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function normalizeApiBaseUrl(raw) {
  const trimmed = stripTrailingSlash(raw)
  if (!trimmed) return '/api'
  if (trimmed === '/api' || trimmed.endsWith('/api')) return trimmed
  return `${trimmed}/api`
}

function normalizeWsUrl(raw) {
  const trimmed = stripTrailingSlash(raw)
  if (!trimmed) return ''

  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    return trimmed
  }

  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}`
  }

  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}`
  }

  return trimmed
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
export const WS_URL = normalizeWsUrl(import.meta.env.VITE_WS_URL)
