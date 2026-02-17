const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || API_BASE_URL.replace(/^http/i, 'ws').replace(/\/api\/?$/, '')

let socket = null
let reconnectTimer = null
let reconnectAttempts = 0
const listeners = new Set()

function buildSocketUrl() {
  const token = localStorage.getItem('saasToken')
  if (!token) return null
  return `${WS_BASE_URL}/ws/live-state?token=${encodeURIComponent(token)}`
}

function notify(message) {
  for (const listener of listeners) {
    listener(message)
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  const delay = Math.min(30000, 1000 * 2 ** reconnectAttempts)
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
