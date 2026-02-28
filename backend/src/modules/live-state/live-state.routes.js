import { Router } from 'express'
import { z } from 'zod'
import { query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireSubscription } from '../../middleware/requireSubscription.js'
import { HttpError } from '../../utils/httpError.js'
import { publishEvent } from '../../services/ably.service.js'
import { adminChannel, displayChannel, matchChannel, tournamentChannel } from '../../services/channel-names.service.js'
import { adjustTimer, clearTimer, pauseTimer, resumeTimer, setTimerDuration, startTimer } from '../../services/live-timer.service.js'

export const liveStateRouter = Router()

const snapshotSchema = z.object({
  snapshot: z.object({}).passthrough(),
})

const timerBaseSchema = z.object({
  tournamentId: z.coerce.number().int().positive(),
})

const startTimerSchema = timerBaseSchema.extend({
  durationMs: z.coerce.number().int().positive().optional(),
})

const setDurationSchema = timerBaseSchema.extend({
  durationMs: z.coerce.number().int().positive(),
})

const adjustTimerSchema = timerBaseSchema.extend({
  deltaMs: z.coerce.number().int(),
})

liveStateRouter.use(authenticate, requireSubscription)

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function toMapById(items) {
  const map = new Map()
  for (const item of Array.isArray(items) ? items : []) {
    const id = toNumber(item?.id)
    if (id) map.set(id, item)
  }
  return map
}

function normalizeTimers(snapshot) {
  const source = snapshot?.matchTimers
  if (!source || typeof source !== 'object') return {}
  return source
}

async function publishScoreAndStatusDiff(previousSnapshot, nextSnapshot, tournamentId) {
  const previousMatches = toMapById(previousSnapshot?.matches)
  const nextMatches = toMapById(nextSnapshot?.matches)

  for (const [matchId, nextMatch] of nextMatches.entries()) {
    const prevMatch = previousMatches.get(matchId)
    if (!prevMatch) continue

    const prevHome = Number(prevMatch.homeScore ?? 0)
    const prevAway = Number(prevMatch.awayScore ?? 0)
    const nextHome = Number(nextMatch.homeScore ?? 0)
    const nextAway = Number(nextMatch.awayScore ?? 0)
    const nextStatus = String(nextMatch.status || '')
    const prevStatus = String(prevMatch.status || '')

    const basePayload = {
      matchId,
      tournamentId,
      homeScore: nextHome,
      awayScore: nextAway,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    }
    const matchCh = matchChannel(matchId)
    const tournamentCh = tournamentChannel(tournamentId)

    if (prevHome !== nextHome || prevAway !== nextAway) {
      await Promise.all([
        matchCh ? publishEvent(matchCh, 'score:update', basePayload) : Promise.resolve(),
        tournamentCh ? publishEvent(tournamentCh, 'score:update', basePayload) : Promise.resolve(),
      ])
    }

    if (prevStatus !== nextStatus) {
      if (prevStatus !== 'live' && nextStatus === 'live') {
        await Promise.all([
          matchCh ? publishEvent(matchCh, 'match:start', basePayload) : Promise.resolve(),
          tournamentCh ? publishEvent(tournamentCh, 'match:start', basePayload) : Promise.resolve(),
        ])
      }
      if (prevStatus !== 'finished' && nextStatus === 'finished') {
        await Promise.all([
          matchCh ? publishEvent(matchCh, 'match:end', basePayload) : Promise.resolve(),
          tournamentCh ? publishEvent(tournamentCh, 'match:end', basePayload) : Promise.resolve(),
        ])
      }
    }
  }
}

async function publishTimerDiff(previousSnapshot, nextSnapshot, tournamentId) {
  const prevTimers = normalizeTimers(previousSnapshot)
  const nextTimers = normalizeTimers(nextSnapshot)
  const matchIds = new Set([...Object.keys(prevTimers), ...Object.keys(nextTimers)])

  for (const rawMatchId of matchIds) {
    const matchId = toNumber(rawMatchId)
    if (!matchId) continue
    const prev = prevTimers[rawMatchId]
    const next = nextTimers[rawMatchId]
    const matchCh = matchChannel(matchId)
    const tournamentCh = tournamentChannel(tournamentId)

    if (!next && prev) {
      const payload = { matchId, tournamentId, status: 'cleared', updatedAt: new Date().toISOString() }
      await Promise.all([
        matchCh ? publishEvent(matchCh, 'timer:clear', payload) : Promise.resolve(),
        tournamentCh ? publishEvent(tournamentCh, 'timer:clear', payload) : Promise.resolve(),
      ])
      continue
    }

    if (!next) continue
    const changed =
      !prev ||
      Number(prev.remainingMs ?? -1) !== Number(next.remainingMs ?? -1) ||
      Number(prev.durationMs ?? -1) !== Number(next.durationMs ?? -1) ||
      String(prev.status || '') !== String(next.status || '')

    if (!changed) continue
    const payload = {
      matchId,
      tournamentId,
      remainingMs: Number(next.remainingMs ?? 0),
      durationMs: Number(next.durationMs ?? 0),
      status: String(next.status || 'paused'),
      updatedAt: new Date().toISOString(),
    }
    await Promise.all([
      matchCh ? publishEvent(matchCh, 'timer:update', payload) : Promise.resolve(),
      tournamentCh ? publishEvent(tournamentCh, 'timer:update', payload) : Promise.resolve(),
    ])
  }
}

async function publishSnapshotEvents(previousSnapshot, nextSnapshot) {
  const tournamentId = toNumber(nextSnapshot?.tournament?.id || nextSnapshot?.tournamentId)
  if (!tournamentId) return

  const tournamentCh = tournamentChannel(tournamentId)
  const adminCh = adminChannel(tournamentId)
  const displayCh = displayChannel(tournamentId)
  const statePayload = {
    tournamentId,
    snapshot: nextSnapshot,
    updatedAt: new Date().toISOString(),
  }

  await Promise.all([
    tournamentCh ? publishEvent(tournamentCh, 'state:update', statePayload) : Promise.resolve(),
    adminCh ? publishEvent(adminCh, 'state:update', statePayload) : Promise.resolve(),
  ])

  const prevScreen = String(previousSnapshot?.activeScreen || '')
  const nextScreen = String(nextSnapshot?.activeScreen || '')
  if (nextScreen && prevScreen !== nextScreen) {
    const displayPayload = {
      tournamentId,
      activeScreen: nextScreen,
      updatedAt: new Date().toISOString(),
    }
    await Promise.all([
      displayCh ? publishEvent(displayCh, 'display:state', displayPayload) : Promise.resolve(),
      adminCh ? publishEvent(adminCh, 'display:state', displayPayload) : Promise.resolve(),
    ])
  }

  await publishScoreAndStatusDiff(previousSnapshot, nextSnapshot, tournamentId)
  await publishTimerDiff(previousSnapshot, nextSnapshot, tournamentId)
}

liveStateRouter.get(
  '/current',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT payload, updated_at
       FROM live_state_snapshots
       WHERE business_id = $1
       LIMIT 1`,
      [req.user.business_id],
    )

    return res.json({
      success: true,
      data: {
        snapshot: result.rows[0]?.payload || null,
        updated_at: result.rows[0]?.updated_at || null,
      },
    })
  }),
)

liveStateRouter.put(
  '/current',
  asyncHandler(async (req, res) => {
    const parsed = snapshotSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const previous = await query(
      `SELECT payload
       FROM live_state_snapshots
       WHERE business_id = $1
       LIMIT 1`,
      [req.user.business_id],
    )
    const previousSnapshot = previous.rows[0]?.payload || null

    const result = await query(
      `INSERT INTO live_state_snapshots (business_id, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (business_id)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
       RETURNING payload, updated_at`,
      [req.user.business_id, JSON.stringify(parsed.data.snapshot)],
    )
    const nextSnapshot = result.rows[0]?.payload || null
    if (nextSnapshot) {
      await publishSnapshotEvents(previousSnapshot, nextSnapshot)
    }

    return res.json({
      success: true,
      data: {
        snapshot: nextSnapshot,
        updated_at: result.rows[0]?.updated_at || null,
      },
    })
  }),
)

liveStateRouter.post(
  '/timers/:matchId/start',
  asyncHandler(async (req, res) => {
    const parsed = startTimerSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const matchId = toNumber(req.params.matchId)
    if (!matchId) throw new HttpError(400, 'Invalid matchId')

    const data = await startTimer({
      businessId: req.user.business_id,
      tournamentId: parsed.data.tournamentId,
      matchId,
      durationMs: parsed.data.durationMs,
    })
    return res.json({ success: true, data })
  }),
)

liveStateRouter.post(
  '/timers/:matchId/pause',
  asyncHandler(async (req, res) => {
    const parsed = timerBaseSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const matchId = toNumber(req.params.matchId)
    if (!matchId) throw new HttpError(400, 'Invalid matchId')

    const data = await pauseTimer({
      businessId: req.user.business_id,
      tournamentId: parsed.data.tournamentId,
      matchId,
    })
    return res.json({ success: true, data })
  }),
)

liveStateRouter.post(
  '/timers/:matchId/resume',
  asyncHandler(async (req, res) => {
    const parsed = timerBaseSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const matchId = toNumber(req.params.matchId)
    if (!matchId) throw new HttpError(400, 'Invalid matchId')

    const data = await resumeTimer({
      businessId: req.user.business_id,
      tournamentId: parsed.data.tournamentId,
      matchId,
    })
    return res.json({ success: true, data })
  }),
)

liveStateRouter.post(
  '/timers/:matchId/set-duration',
  asyncHandler(async (req, res) => {
    const parsed = setDurationSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const matchId = toNumber(req.params.matchId)
    if (!matchId) throw new HttpError(400, 'Invalid matchId')

    const data = await setTimerDuration({
      businessId: req.user.business_id,
      tournamentId: parsed.data.tournamentId,
      matchId,
      durationMs: parsed.data.durationMs,
    })
    return res.json({ success: true, data })
  }),
)

liveStateRouter.post(
  '/timers/:matchId/adjust',
  asyncHandler(async (req, res) => {
    const parsed = adjustTimerSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const matchId = toNumber(req.params.matchId)
    if (!matchId) throw new HttpError(400, 'Invalid matchId')

    const data = await adjustTimer({
      businessId: req.user.business_id,
      tournamentId: parsed.data.tournamentId,
      matchId,
      deltaMs: parsed.data.deltaMs,
    })
    return res.json({ success: true, data })
  }),
)

liveStateRouter.delete(
  '/timers/:matchId',
  asyncHandler(async (req, res) => {
    const parsed = timerBaseSchema.safeParse(req.body || {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const matchId = toNumber(req.params.matchId)
    if (!matchId) throw new HttpError(400, 'Invalid matchId')

    const removed = await clearTimer(req.user.business_id, parsed.data.tournamentId, matchId)
    return res.json({ success: true, data: { removed } })
  }),
)
