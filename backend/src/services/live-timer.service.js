import { publishEventNonBlocking } from './ably.service.js'
import { matchChannel, tournamentChannel } from './channel-names.service.js'

const TIMER_TICK_MS = 250
const DEFAULT_TIMER_DURATION_MS = 10 * 60 * 1000

const timers = new Map()

function timerKey(businessId, tournamentId, matchId) {
  return `${businessId}:${tournamentId}:${matchId}`
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function getRemainingMs(timer) {
  const now = timer.pausedAt ?? Date.now()
  const activeElapsed = Math.max(0, now - timer.startTime - timer.accumulatedPauseTime)
  return Math.max(0, timer.durationMs - activeElapsed)
}

function currentStatus(timer) {
  const remainingMs = getRemainingMs(timer)
  if (remainingMs <= 0) return 'finished'
  return timer.pausedAt ? 'paused' : 'running'
}

function toPayload(timer) {
  return {
    matchId: timer.matchId,
    tournamentId: timer.tournamentId,
    remainingMs: getRemainingMs(timer),
    durationMs: timer.durationMs,
    status: currentStatus(timer),
    updatedAt: new Date().toISOString(),
  }
}

function publishTimerUpdate(timer) {
  const payload = toPayload(timer)
  const matchCh = matchChannel(payload.matchId)
  const tournamentCh = tournamentChannel(payload.tournamentId)
  if (matchCh) publishEventNonBlocking(matchCh, 'timer:update', payload)
  if (tournamentCh) publishEventNonBlocking(tournamentCh, 'timer:update', payload)
}

function publishTimerClear({ tournamentId, matchId }) {
  const payload = {
    tournamentId,
    matchId,
    status: 'cleared',
    updatedAt: new Date().toISOString(),
  }
  const matchCh = matchChannel(matchId)
  const tournamentCh = tournamentChannel(tournamentId)
  if (matchCh) publishEventNonBlocking(matchCh, 'timer:clear', payload)
  if (tournamentCh) publishEventNonBlocking(tournamentCh, 'timer:clear', payload)
}

function clearTimerInterval(timer) {
  if (!timer?.intervalId) return
  clearInterval(timer.intervalId)
  timer.intervalId = null
}

function startTimerInterval(timer) {
  clearTimerInterval(timer)
  timer.intervalId = setInterval(() => {
    const remainingMs = getRemainingMs(timer)
    if (remainingMs <= 0) {
      clearTimer(timer.businessId, timer.tournamentId, timer.matchId)
      return
    }
    publishTimerUpdate(timer)
  }, TIMER_TICK_MS)
  if (typeof timer.intervalId.unref === 'function') timer.intervalId.unref()
}

function getOrCreateTimer(businessId, tournamentId, matchId, durationMs) {
  const key = timerKey(businessId, tournamentId, matchId)
  const existing = timers.get(key)
  if (existing) return existing

  const timer = {
    key,
    businessId,
    tournamentId,
    matchId,
    startTime: Date.now(),
    durationMs: toPositiveNumber(durationMs, DEFAULT_TIMER_DURATION_MS),
    pausedAt: Date.now(),
    accumulatedPauseTime: 0,
    intervalId: null,
  }
  timers.set(key, timer)
  return timer
}

export function startTimer({ businessId, tournamentId, matchId, durationMs }) {
  const timer = getOrCreateTimer(businessId, tournamentId, matchId, durationMs)
  const now = Date.now()
  timer.durationMs = toPositiveNumber(durationMs ?? timer.durationMs, timer.durationMs)
  if (timer.pausedAt) {
    timer.accumulatedPauseTime += now - timer.pausedAt
    timer.pausedAt = null
  }
  startTimerInterval(timer)
  publishTimerUpdate(timer)
  return toPayload(timer)
}

export function pauseTimer({ businessId, tournamentId, matchId }) {
  const key = timerKey(businessId, tournamentId, matchId)
  const timer = timers.get(key)
  if (!timer || timer.pausedAt) return timer ? toPayload(timer) : null
  timer.pausedAt = Date.now()
  clearTimerInterval(timer)
  publishTimerUpdate(timer)
  return toPayload(timer)
}

export function resumeTimer({ businessId, tournamentId, matchId }) {
  const key = timerKey(businessId, tournamentId, matchId)
  const timer = timers.get(key)
  if (!timer || !timer.pausedAt) return timer ? toPayload(timer) : null
  const now = Date.now()
  timer.accumulatedPauseTime += now - timer.pausedAt
  timer.pausedAt = null
  startTimerInterval(timer)
  publishTimerUpdate(timer)
  return toPayload(timer)
}

export function setTimerDuration({ businessId, tournamentId, matchId, durationMs }) {
  const timer = getOrCreateTimer(businessId, tournamentId, matchId, durationMs)
  timer.durationMs = toPositiveNumber(durationMs, timer.durationMs)
  publishTimerUpdate(timer)
  return toPayload(timer)
}

export function adjustTimer({ businessId, tournamentId, matchId, deltaMs }) {
  const key = timerKey(businessId, tournamentId, matchId)
  const timer = timers.get(key)
  if (!timer) return null
  timer.durationMs = Math.max(0, timer.durationMs + Number(deltaMs || 0))
  publishTimerUpdate(timer)
  return toPayload(timer)
}

export function clearTimer(businessId, tournamentId, matchId) {
  const key = timerKey(businessId, tournamentId, matchId)
  const timer = timers.get(key)
  if (!timer) return false
  clearTimerInterval(timer)
  timers.delete(key)
  publishTimerClear({ tournamentId, matchId })
  return true
}

export function getLiveTimerStats() {
  return {
    activeTimers: timers.size,
  }
}

export function stopAllTimers() {
  for (const timer of timers.values()) {
    clearTimerInterval(timer)
  }
  timers.clear()
}
