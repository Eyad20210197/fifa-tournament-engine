import { WS_URL } from '../config/env'
const MAX_RECONNECT_DELAY_MS = 30000
const MAX_RECONNECT_ATTEMPTS = 12

let socket = null
let reconnectTimer = null
let reconnectAttempts = 0
let shouldReconnect = false
let activeConsumers = 0
let connectionStatus = 'disconnected'

const messageListeners = new Set()
const statusListeners = new Set()

function notifyMessage(message) {
  for (const listener of messageListeners) {
    listener(message)
  }
}

function setConnectionStatus(nextStatus) {
  if (connectionStatus === nextStatus) return
  connectionStatus = nextStatus
  for (const listener of statusListeners) {
    listener(nextStatus)
  }
}

function clearReconnectTimer() {
  if (!reconnectTimer) return
  clearTimeout(reconnectTimer)
  reconnectTimer = null
}

function buildSocketUrl() {
  const token = localStorage.getItem('saasToken')
  if (!token || token === 'null' || token === 'undefined') {
    return null
  }

  if (!WS_URL) {
    return null
  }

  return `${WS_URL}?token=${encodeURIComponent(token)}`
}

function nextReconnectDelayMs() {
  const expDelay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** reconnectAttempts)
  const jitter = Math.floor(Math.random() * 500)
  return expDelay + jitter
}

function scheduleReconnect() {
  if (!shouldReconnect || reconnectTimer || activeConsumers === 0) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    setConnectionStatus('disconnected')
    return
  }

  setConnectionStatus('reconnecting')
  const delay = nextReconnectDelayMs()
  reconnectAttempts += 1

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectLiveStateSocket()
  }, delay)
}

export function connectLiveStateSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }

  const wsUrl = buildSocketUrl()
  if (!wsUrl) {
    setConnectionStatus('disconnected')
    return null
  }

  setConnectionStatus(reconnectAttempts > 0 ? 'reconnecting' : 'connecting')
  socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    reconnectAttempts = 0
    clearReconnectTimer()
    setConnectionStatus('connected')
  }

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(String(event.data || ''))
      notifyMessage(parsed)
    } catch {
      // Ignore malformed payloads from remote clients.
    }
  }

  socket.onerror = () => {
    if (socket && socket.readyState === WebSocket.OPEN) return
    socket?.close()
  }

  socket.onclose = () => {
    socket = null
    setConnectionStatus('disconnected')
    scheduleReconnect()
  }

  return socket
}

export function disconnectLiveStateSocket() {
  shouldReconnect = false
  reconnectAttempts = 0
  clearReconnectTimer()
  setConnectionStatus('disconnected')

  if (!socket) return
  const current = socket
  socket = null
  if (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING) {
    current.close(1000, 'client-disconnect')
  }
}

export function acquireLiveStateSocket() {
  activeConsumers += 1
  shouldReconnect = true
  connectLiveStateSocket()
}

export function releaseLiveStateSocket() {
  activeConsumers = Math.max(0, activeConsumers - 1)
  if (activeConsumers === 0) {
    disconnectLiveStateSocket()
  }
}

export function subscribeLiveState(handler) {
  messageListeners.add(handler)
  return () => {
    messageListeners.delete(handler)
  }
}

export function subscribeLiveStateConnectionStatus(handler) {
  statusListeners.add(handler)
  handler(connectionStatus)
  return () => {
    statusListeners.delete(handler)
  }
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

function sendTimerMessage(type, payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false
  socket.send(JSON.stringify({ type, payload }))
  return true
}

export function wsStartMatchTimer(matchId, durationMs) {
  return sendTimerMessage('MATCH_TIMER_START', { matchId, durationMs })
}

export function wsPauseMatchTimer(matchId) {
  return sendTimerMessage('MATCH_TIMER_PAUSE', { matchId })
}

export function wsResumeMatchTimer(matchId) {
  return sendTimerMessage('MATCH_TIMER_RESUME', { matchId })
}

export function wsSetMatchTimerDuration(matchId, durationMs) {
  return sendTimerMessage('MATCH_TIMER_SET_DURATION', { matchId, durationMs })
}

export function wsAdjustMatchTimer(matchId, deltaMs) {
  return sendTimerMessage('MATCH_TIMER_ADJUST', { matchId, deltaMs })
}

export function wsClearMatchTimer(matchId) {
  return sendTimerMessage('MATCH_TIMER_CLEAR', { matchId })
}
