import jwt from 'jsonwebtoken'
import { WebSocket, WebSocketServer } from 'ws'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

const WS_PATH = '/ws'
const HEARTBEAT_INTERVAL_MS = 30000
const HEARTBEAT_TIMEOUT_MS = 10000
const TIMER_TICK_MS = 250
const DEFAULT_TIMER_DURATION_MS = 10 * 60 * 1000

function safeParseMessage(raw) {
  try {
    const parsed = JSON.parse(String(raw || ''))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeUpgradeError(socket, statusLine) {
  if (socket.destroyed) return
  socket.write(`HTTP/1.1 ${statusLine}\r\nConnection: close\r\n\r\n`)
  socket.destroy()
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export function setupLiveStateWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true })
  const clientsByBusiness = new Map()
  const pongTimeouts = new WeakMap()
  const activeMatchTimersByBusiness = new Map()
  let heartbeatInterval = null

  function getBusinessTimers(businessId) {
    if (!activeMatchTimersByBusiness.has(businessId)) {
      activeMatchTimersByBusiness.set(businessId, {})
    }
    return activeMatchTimersByBusiness.get(businessId)
  }

  function addClient(businessId, ws) {
    if (!clientsByBusiness.has(businessId)) {
      clientsByBusiness.set(businessId, new Set())
    }
    clientsByBusiness.get(businessId).add(ws)
  }

  function removeClient(businessId, ws) {
    const set = clientsByBusiness.get(businessId)
    if (!set) return
    set.delete(ws)
    if (set.size === 0) {
      clientsByBusiness.delete(businessId)
    }
  }

  function clearPongTimeout(ws) {
    const timeout = pongTimeouts.get(ws)
    if (timeout) {
      clearTimeout(timeout)
      pongTimeouts.delete(ws)
    }
  }

  function schedulePongTimeout(ws) {
    clearPongTimeout(ws)
    const timeout = setTimeout(() => {
      clearPongTimeout(ws)
      if (ws.readyState === WebSocket.OPEN) {
        ws.terminate()
      }
    }, HEARTBEAT_TIMEOUT_MS)
    if (typeof timeout.unref === 'function') timeout.unref()
    pongTimeouts.set(ws, timeout)
  }

  function broadcastToBusiness(businessId, payload, sender, excludeSender = true) {
    const set = clientsByBusiness.get(businessId)
    if (!set) return

    const serialized = JSON.stringify(payload)
    for (const client of set) {
      if (excludeSender && client === sender) continue
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized)
      }
    }
  }

  function emitTimerUpdate(businessId, timer, sender) {
    if (!timer) return
    const remainingMs = getRemainingMs(timer)
    const status = remainingMs <= 0 ? 'finished' : timer.pausedAt ? 'paused' : 'running'
    broadcastToBusiness(
      businessId,
      {
        type: 'MATCH_TIMER_UPDATED',
        payload: {
          matchId: timer.matchId,
          remainingMs,
          status,
          durationMs: timer.duration,
        },
        timestamp: Date.now(),
      },
      sender,
      false,
    )
  }

  function emitTimerCleared(businessId, matchId, sender) {
    broadcastToBusiness(
      businessId,
      {
        type: 'MATCH_TIMER_CLEARED',
        payload: { matchId },
        timestamp: Date.now(),
      },
      sender,
      false,
    )
  }

  function getRemainingMs(timer) {
    const now = timer.pausedAt ?? Date.now()
    const activeElapsed = Math.max(0, now - timer.startTime - timer.accumulatedPauseTime)
    return Math.max(0, timer.duration - activeElapsed)
  }

  function clearTimerInterval(timer) {
    if (!timer?.intervalId) return
    clearInterval(timer.intervalId)
    timer.intervalId = null
  }

  function removeTimer(businessId, matchId, sender) {
    const timers = getBusinessTimers(businessId)
    const key = String(matchId)
    const timer = timers[key]
    if (!timer) return
    clearTimerInterval(timer)
    delete timers[key]
    emitTimerCleared(businessId, Number(key), sender)
  }

  function startTimerInterval(businessId, timer, sender) {
    clearTimerInterval(timer)
    timer.intervalId = setInterval(() => {
      const remainingMs = getRemainingMs(timer)
      if (remainingMs <= 0) {
        removeTimer(businessId, timer.matchId, null)
        return
      }
      emitTimerUpdate(businessId, timer, sender)
    }, TIMER_TICK_MS)
    if (typeof timer.intervalId.unref === 'function') timer.intervalId.unref()
  }

  function startMatchTimer(businessId, payload, sender) {
    const matchId = Number(payload?.matchId)
    if (!Number.isFinite(matchId) || matchId <= 0) return
    const timers = getBusinessTimers(businessId)
    const key = String(matchId)
    const now = Date.now()

    const nextDuration = toPositiveNumber(payload?.durationMs, DEFAULT_TIMER_DURATION_MS)
    const existing = timers[key]
    const timer = existing || {
      matchId,
      startTime: now,
      duration: nextDuration,
      pausedAt: null,
      accumulatedPauseTime: 0,
      intervalId: null,
    }

    timer.duration = nextDuration
    if (!existing) {
      timer.startTime = now
      timer.pausedAt = null
      timer.accumulatedPauseTime = 0
    } else if (timer.pausedAt) {
      timer.accumulatedPauseTime += now - timer.pausedAt
      timer.pausedAt = null
    }

    timers[key] = timer
    startTimerInterval(businessId, timer, sender)
    emitTimerUpdate(businessId, timer, sender)
  }

  function pauseMatchTimer(businessId, payload, sender) {
    const matchId = Number(payload?.matchId)
    if (!Number.isFinite(matchId) || matchId <= 0) return
    const timers = getBusinessTimers(businessId)
    const timer = timers[String(matchId)]
    if (!timer || timer.pausedAt) return

    timer.pausedAt = Date.now()
    clearTimerInterval(timer)
    emitTimerUpdate(businessId, timer, sender)
  }

  function resumeMatchTimer(businessId, payload, sender) {
    const matchId = Number(payload?.matchId)
    if (!Number.isFinite(matchId) || matchId <= 0) return
    const timers = getBusinessTimers(businessId)
    const timer = timers[String(matchId)]
    if (!timer || !timer.pausedAt) return

    const now = Date.now()
    timer.accumulatedPauseTime += now - timer.pausedAt
    timer.pausedAt = null
    startTimerInterval(businessId, timer, sender)
    emitTimerUpdate(businessId, timer, sender)
  }

  function adjustMatchTimer(businessId, payload, sender) {
    const matchId = Number(payload?.matchId)
    const deltaMs = Number(payload?.deltaMs || 0)
    if (!Number.isFinite(matchId) || matchId <= 0 || !Number.isFinite(deltaMs)) return
    const timers = getBusinessTimers(businessId)
    const timer = timers[String(matchId)]
    if (!timer) return

    timer.duration = Math.max(0, timer.duration + deltaMs)
    emitTimerUpdate(businessId, timer, sender)
  }

  function setMatchDuration(businessId, payload, sender) {
    const matchId = Number(payload?.matchId)
    const durationMs = toPositiveNumber(payload?.durationMs, NaN)
    if (!Number.isFinite(matchId) || matchId <= 0 || !Number.isFinite(durationMs)) return
    const timers = getBusinessTimers(businessId)
    const timer = timers[String(matchId)]
    if (!timer) {
      timers[String(matchId)] = {
        matchId,
        startTime: Date.now(),
        duration: durationMs,
        pausedAt: Date.now(),
        accumulatedPauseTime: 0,
        intervalId: null,
      }
      emitTimerUpdate(businessId, timers[String(matchId)], sender)
      return
    }
    timer.duration = durationMs
    emitTimerUpdate(businessId, timer, sender)
  }

  function clearMatchTimer(businessId, payload, sender) {
    const matchId = Number(payload?.matchId)
    if (!Number.isFinite(matchId) || matchId <= 0) return
    removeTimer(businessId, matchId, sender)
  }

  function sendTimerSnapshotToClient(businessId, ws) {
    const timers = Object.values(getBusinessTimers(businessId))
    if (!timers.length) return
    for (const timer of timers) {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(
        JSON.stringify({
          type: 'MATCH_TIMER_UPDATED',
          payload: {
            matchId: timer.matchId,
            remainingMs: getRemainingMs(timer),
            status: timer.pausedAt ? 'paused' : 'running',
            durationMs: timer.duration,
          },
          timestamp: Date.now(),
        }),
      )
    }
  }

  function closeAllSockets() {
    for (const ws of wss.clients) {
      clearPongTimeout(ws)
      ws.terminate()
    }
  }

  function clearAllTimers() {
    for (const timers of activeMatchTimersByBusiness.values()) {
      for (const timer of Object.values(timers)) {
        clearTimerInterval(timer)
      }
    }
    activeMatchTimersByBusiness.clear()
  }

  function startHeartbeat() {
    if (heartbeatInterval) return
    heartbeatInterval = setInterval(() => {
      for (const ws of wss.clients) {
        if (ws.readyState !== WebSocket.OPEN) continue
        schedulePongTimeout(ws)
        try {
          ws.ping()
        } catch {
          ws.terminate()
        }
      }
    }, HEARTBEAT_INTERVAL_MS)
    if (typeof heartbeatInterval.unref === 'function') heartbeatInterval.unref()
  }

  function stopHeartbeat() {
    if (!heartbeatInterval) return
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }

  function handleUpgrade(request, socket, head) {
    const host = String(request.headers.host || 'localhost')
    const url = new URL(request.url || '/', `http://${host}`)

    if (url.pathname !== WS_PATH && url.pathname !== `${WS_PATH}/`) {
      socket.destroy()
      return
    }

    const upgrade = String(request.headers.upgrade || '').toLowerCase()
    if (upgrade !== 'websocket') {
      writeUpgradeError(socket, '400 Bad Request')
      return
    }

    const token = url.searchParams.get('token')
    if (!token) {
      writeUpgradeError(socket, '401 Unauthorized')
      return
    }

    let payload
    try {
      payload = jwt.verify(token, env.jwtSecret)
    } catch {
      writeUpgradeError(socket, '401 Unauthorized')
      return
    }

    const businessId = Number(payload?.business_id)
    if (!businessId) {
      writeUpgradeError(socket, '403 Forbidden')
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.businessId = businessId
      ws.userId = payload?.sub ? Number(payload.sub) : null
      wss.emit('connection', ws, request)
    })
  }

  function handleConnection(ws) {
    const businessId = Number(ws.businessId)
    addClient(businessId, ws)

    ws.send(
      JSON.stringify({
        type: 'WS_CONNECTED',
        businessId,
        timestamp: Date.now(),
      }),
    )
    sendTimerSnapshotToClient(businessId, ws)

    const onPong = () => {
      clearPongTimeout(ws)
    }

    const onMessage = (data) => {
      const msg = safeParseMessage(data)
      if (!msg) return

      if (msg.type === 'STATE_UPDATED') {
        broadcastToBusiness(
          businessId,
          {
            type: 'STATE_UPDATED',
            payload: msg.payload || null,
            businessId,
            timestamp: Date.now(),
          },
          ws,
        )
        return
      }

      if (msg.type === 'MATCH_TIMER_START') {
        startMatchTimer(businessId, msg.payload || {}, ws)
        return
      }
      if (msg.type === 'MATCH_TIMER_PAUSE') {
        pauseMatchTimer(businessId, msg.payload || {}, ws)
        return
      }
      if (msg.type === 'MATCH_TIMER_RESUME') {
        resumeMatchTimer(businessId, msg.payload || {}, ws)
        return
      }
      if (msg.type === 'MATCH_TIMER_ADJUST') {
        adjustMatchTimer(businessId, msg.payload || {}, ws)
        return
      }
      if (msg.type === 'MATCH_TIMER_SET_DURATION') {
        setMatchDuration(businessId, msg.payload || {}, ws)
        return
      }
      if (msg.type === 'MATCH_TIMER_CLEAR') {
        clearMatchTimer(businessId, msg.payload || {}, ws)
      }
    }

    const onClose = () => {
      clearPongTimeout(ws)
      removeClient(businessId, ws)
      ws.off('pong', onPong)
      ws.off('message', onMessage)
      ws.off('error', onError)
      ws.off('close', onClose)
    }

    const onError = (error) => {
      logger.warn(`WebSocket client error: ${error?.message || 'unknown error'}`)
    }

    ws.on('pong', onPong)
    ws.on('message', onMessage)
    ws.on('close', onClose)
    ws.on('error', onError)
  }

  startHeartbeat()
  wss.on('connection', handleConnection)
  httpServer.on('upgrade', handleUpgrade)
  httpServer.on('close', () => {
    stopHeartbeat()
    httpServer.off('upgrade', handleUpgrade)
    wss.off('connection', handleConnection)
    closeAllSockets()
    clearAllTimers()
    wss.close()
  })

  logger.info(`Live-state WebSocket enabled at ${WS_PATH}`)

  return {
    wss,
    getClientCount() {
      return wss.clients.size
    },
    close() {
      stopHeartbeat()
      closeAllSockets()
      clearAllTimers()
      wss.close()
      httpServer.off('upgrade', handleUpgrade)
      wss.off('connection', handleConnection)
    },
  }
}
