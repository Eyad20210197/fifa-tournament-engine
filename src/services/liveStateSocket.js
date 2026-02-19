const DEFAULT_SECURE_WS_ENDPOINT = 'wss://fifaleague.duckdns.org/ws/live-state'

function resolveWsEndpoint() {
  const explicitEndpoint = import.meta.env.NEXT_PUBLIC_WS_URL || import.meta.env.VITE_WS_URL
  if (explicitEndpoint) {
    return String(explicitEndpoint).trim()
  }

  const explicitBase = import.meta.env.VITE_WS_BASE_URL
  if (explicitBase) {
    return `${String(explicitBase).trim().replace(/\/+$/, '')}/ws/live-state`
  }

  const apiBase = import.meta.env.NEXT_PUBLIC_API_URL || import.meta.env.VITE_API_BASE_URL
  if (apiBase && String(apiBase).startsWith('http')) {
    return `${String(apiBase)
      .trim()
      .replace(/^http/i, 'ws')
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '')}/ws/live-state`
  }

  if (window.location.protocol === 'https:') {
    return DEFAULT_SECURE_WS_ENDPOINT
  }

  return `ws://${window.location.host}/ws/live-state`
}

const WS_ENDPOINT = resolveWsEndpoint()

let socket = null
let reconnectTimer = null
let reconnectAttempts = 0
const listeners = new Set()
const MAX_RECONNECT_DELAY_MS = 30000

function buildSocketUrl() {
  const token = localStorage.getItem('saasToken')
  if (!token) return null
  return `${WS_ENDPOINT}?token=${encodeURIComponent(token)}`
}

function notify(message) {
  for (const listener of listeners) {
    listener(message)
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  const expDelay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** reconnectAttempts)
  const jitter = Math.floor(Math.random() * 500)
  const delay = expDelay + jitter
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectLiveStateSocket()
  }, delay)
  reconnectAttempts += 1
}

export function connectLiveStateSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }

  const wsUrl = buildSocketUrl()
  if (!wsUrl) return null

  socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    reconnectAttempts = 0
  }

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(String(event.data || ''))
      notify(parsed)
    } catch {
      // ignore malformed messages
    }
  }

  socket.onclose = () => {
    socket = null
    scheduleReconnect()
  }

  socket.onerror = () => {
    if (socket && socket.readyState === WebSocket.OPEN) return
    socket?.close()
  }

  return socket
}

export function subscribeLiveState(handler) {
  listeners.add(handler)
  return () => listeners.delete(handler)
}

export function publishLiveState(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false
  socket.send(
    JSON.stringify({
      type: 'STATE_UPDATED',
      payload,
    }),
  )
  return true
}
