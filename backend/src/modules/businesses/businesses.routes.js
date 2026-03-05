import { Router } from 'express'
import { z } from 'zod'
import { query, withTransaction } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { HttpError } from '../../utils/httpError.js'

export const businessesRouter = Router()

const optionalDateTimeSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return value

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z')
  }

  return value
}, z.string().datetime({ offset: true }).nullable())

const psDeviceCountSchema = z.coerce.number().int().min(0)

const createBusinessSchema = z.object({
  name: z.string().min(1),
  brand_name: z.string().optional().nullable(),
  primary_color: z.string().optional().nullable(),
  secondary_color: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  animated_logo_url: z.string().optional().nullable(),
  subscription_expires_at: optionalDateTimeSchema.optional(),
  ps_device_count: psDeviceCountSchema.optional(),
})

const updateBusinessSchema = createBusinessSchema.partial()

const updateDeviceStatusSchema = z.object({
  is_online: z.boolean(),
})

function toNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

async function fetchBusinessDeviceRuntime(businessId) {
  const businessResult = await query(
    `SELECT id, ps_device_count
     FROM businesses
     WHERE id = $1
     LIMIT 1`,
    [businessId],
  )

  const business = businessResult.rows[0]
  if (!business) throw new HttpError(404, 'Business not found')

  const deviceCount = Math.max(0, toNumber(business.ps_device_count))

  if (deviceCount === 0) {
    return {
      deviceCount,
      devices: [],
      dailySummary: [],
      totals: {
        totalOnSeconds: 0,
        currentlyOnlineCount: 0,
      },
    }
  }

  const devicesResult = await query(
    `SELECT
       gs.device_number,
       (open_session.id IS NOT NULL) AS is_online,
       open_session.started_at AS online_since,
       CASE
         WHEN open_session.id IS NULL THEN 0
         ELSE GREATEST(EXTRACT(EPOCH FROM (NOW() - open_session.started_at)), 0)::BIGINT
       END AS current_online_seconds,
       COALESCE(device_totals.total_on_seconds, 0)::BIGINT AS total_on_seconds
     FROM generate_series(1, $2::INT) AS gs(device_number)
     LEFT JOIN LATERAL (
       SELECT id, started_at
       FROM business_ps_device_sessions
       WHERE business_id = $1 AND device_number = gs.device_number AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1
     ) AS open_session ON TRUE
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         SUM(GREATEST(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)), 0)),
         0
       )::BIGINT AS total_on_seconds
       FROM business_ps_device_sessions
       WHERE business_id = $1 AND device_number = gs.device_number
     ) AS device_totals ON TRUE
     ORDER BY gs.device_number ASC`,
    [businessId, deviceCount],
  )

  const dailySummaryResult = await query(
    `WITH sessions AS (
       SELECT
         device_number,
         started_at,
         COALESCE(ended_at, NOW()) AS ended_at
       FROM business_ps_device_sessions
       WHERE business_id = $1
         AND device_number BETWEEN 1 AND $2
     ),
     day_slices AS (
       SELECT
         s.device_number,
         day_bucket::DATE AS day,
         GREATEST(s.started_at, day_bucket) AS segment_start,
         LEAST(s.ended_at, day_bucket + INTERVAL '1 day') AS segment_end
       FROM sessions s
       CROSS JOIN LATERAL generate_series(
         date_trunc('day', s.started_at),
         date_trunc('day', s.ended_at),
         INTERVAL '1 day'
       ) AS day_bucket
     ),
     durations AS (
       SELECT
         day,
         device_number,
         GREATEST(EXTRACT(EPOCH FROM (segment_end - segment_start)), 0)::BIGINT AS on_seconds
       FROM day_slices
       WHERE segment_end > segment_start
     )
     SELECT
       day::TEXT AS day,
       COUNT(DISTINCT device_number)::INT AS devices_on_count,
       COALESCE(SUM(on_seconds), 0)::BIGINT AS total_on_seconds
     FROM durations
     GROUP BY day
     ORDER BY day DESC
     LIMIT 60`,
    [businessId, deviceCount],
  )

  const totalsResult = await query(
    `SELECT
       COALESCE(
         SUM(GREATEST(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)), 0)),
         0
       )::BIGINT AS total_on_seconds,
       COALESCE(COUNT(DISTINCT CASE WHEN ended_at IS NULL THEN device_number END), 0)::INT AS currently_online_count
     FROM business_ps_device_sessions
     WHERE business_id = $1
       AND device_number BETWEEN 1 AND $2`,
    [businessId, deviceCount],
  )

  return {
    deviceCount,
    devices: devicesResult.rows.map((row) => ({
      deviceNumber: toNumber(row.device_number),
      isOnline: Boolean(row.is_online),
      onlineSince: row.online_since || null,
      currentOnlineSeconds: toNumber(row.current_online_seconds),
      totalOnSeconds: toNumber(row.total_on_seconds),
    })),
    dailySummary: dailySummaryResult.rows.map((row) => ({
      day: row.day,
      devicesOnCount: toNumber(row.devices_on_count),
      totalOnSeconds: toNumber(row.total_on_seconds),
    })),
    totals: {
      totalOnSeconds: toNumber(totalsResult.rows[0]?.total_on_seconds),
      currentlyOnlineCount: toNumber(totalsResult.rows[0]?.currently_online_count),
    },
  }
}

businessesRouter.use(authenticate)

businessesRouter.get(
  '/branding',
  authorize('SUPER_ADMIN', 'ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const businessId = Number(req.user?.business_id)
    if (!businessId) {
      return res.json({ success: true, data: null })
    }

    const result = await query(
      `SELECT id, name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url, ps_device_count
       FROM businesses
       WHERE id = $1
       LIMIT 1`,
      [businessId],
    )

    return res.json({ success: true, data: result.rows[0] || null })
  }),
)

businessesRouter.get(
  '/',
  authorize('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url,
              subscription_expires_at, ps_device_count, created_at, updated_at
       FROM businesses
       ORDER BY id DESC`,
    )
    return res.json({ success: true, data: result.rows })
  }),
)

businessesRouter.get(
  '/device-runtime',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const businessId = Number(req.user?.business_id)
    if (!businessId) throw new HttpError(400, 'Business not found for current user')

    const runtimeSnapshot = await fetchBusinessDeviceRuntime(businessId)
    return res.json({ success: true, data: runtimeSnapshot })
  }),
)

businessesRouter.patch(
  '/device-runtime/devices/:deviceNumber(\\d+)/status',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const businessId = Number(req.user?.business_id)
    if (!businessId) throw new HttpError(400, 'Business not found for current user')

    const deviceNumber = Number(req.params.deviceNumber)
    const parsed = updateDeviceStatusSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const businessResult = await query(
      `SELECT id, ps_device_count
       FROM businesses
       WHERE id = $1
       LIMIT 1`,
      [businessId],
    )

    const business = businessResult.rows[0]
    if (!business) throw new HttpError(404, 'Business not found')

    const deviceCount = toNumber(business.ps_device_count)
    if (deviceNumber < 1 || deviceNumber > deviceCount) {
      throw new HttpError(400, `Device number out of range. Allowed range is 1..${deviceCount}`)
    }

    const nextStatusOnline = parsed.data.is_online

    await withTransaction(async (client) => {
      const openSessionResult = await client.query(
        `SELECT id, started_at
         FROM business_ps_device_sessions
         WHERE business_id = $1 AND device_number = $2 AND ended_at IS NULL
         ORDER BY started_at DESC
         LIMIT 1
         FOR UPDATE`,
        [businessId, deviceNumber],
      )

      const openSession = openSessionResult.rows[0]

      if (nextStatusOnline) {
        if (openSession) return

        await client.query(
          `INSERT INTO business_ps_device_sessions (business_id, device_number, started_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [businessId, deviceNumber],
        )

        return
      }

      if (!openSession) return

      await client.query(
        `UPDATE business_ps_device_sessions
         SET ended_at = NOW(),
             duration_seconds = GREATEST(EXTRACT(EPOCH FROM (NOW() - started_at)), 0)::BIGINT,
             updated_at = NOW()
         WHERE id = $1`,
        [openSession.id],
      )
    })

    const runtimeSnapshot = await fetchBusinessDeviceRuntime(businessId)
    return res.json({ success: true, data: runtimeSnapshot })
  }),
)

businessesRouter.post(
  '/',
  authorize('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = createBusinessSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const payload = parsed.data
    const result = await query(
      `INSERT INTO businesses (
         name,
         brand_name,
         primary_color,
         secondary_color,
         logo_url,
         animated_logo_url,
         subscription_expires_at,
         ps_device_count
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url,
                 subscription_expires_at, ps_device_count, created_at, updated_at`,
      [
        payload.name,
        payload.brand_name || null,
        payload.primary_color || null,
        payload.secondary_color || null,
        payload.logo_url || null,
        payload.animated_logo_url || null,
        payload.subscription_expires_at || null,
        payload.ps_device_count ?? 0,
      ],
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  }),
)

businessesRouter.patch(
  '/:id(\\d+)',
  authorize('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const businessId = Number(req.params.id)
    const parsed = updateBusinessSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const payload = parsed.data
    if (Object.keys(payload).length === 0) throw new HttpError(400, 'No fields to update')

    if (Object.prototype.hasOwnProperty.call(payload, 'ps_device_count')) {
      const requestedCount = toNumber(payload.ps_device_count)
      const openSessionsResult = await query(
        `SELECT 1
         FROM business_ps_device_sessions
         WHERE business_id = $1
           AND device_number > $2
           AND ended_at IS NULL
         LIMIT 1`,
        [businessId, requestedCount],
      )

      if (openSessionsResult.rows.length) {
        throw new HttpError(400, 'Cannot reduce device count while devices above this count are online')
      }
    }

    const updates = []
    const params = []

    const pushUpdate = (column, key) => {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        params.push(payload[key] ?? null)
        updates.push(`${column} = $${params.length}`)
      }
    }

    pushUpdate('name', 'name')
    pushUpdate('brand_name', 'brand_name')
    pushUpdate('primary_color', 'primary_color')
    pushUpdate('secondary_color', 'secondary_color')
    pushUpdate('logo_url', 'logo_url')
    pushUpdate('animated_logo_url', 'animated_logo_url')
    pushUpdate('subscription_expires_at', 'subscription_expires_at')
    pushUpdate('ps_device_count', 'ps_device_count')
    updates.push('updated_at = NOW()')

    params.push(businessId)
    const result = await query(
      `UPDATE businesses
       SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url,
                 subscription_expires_at, ps_device_count, created_at, updated_at`,
      params,
    )
    if (!result.rows[0]) throw new HttpError(404, 'Business not found')
    return res.json({ success: true, data: result.rows[0] })
  }),
)

businessesRouter.patch(
  '/branding',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const businessId = Number(req.user?.business_id)
    if (!businessId) throw new HttpError(400, 'Business not found for current user')

    const parsed = z
      .object({
        brand_name: z.string().optional().nullable(),
        primary_color: z.string().optional().nullable(),
        secondary_color: z.string().optional().nullable(),
        logo_url: z.string().optional().nullable(),
        animated_logo_url: z.string().optional().nullable(),
      })
      .safeParse(req.body || {})

    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const payload = parsed.data
    if (Object.keys(payload).length === 0) throw new HttpError(400, 'No fields to update')

    const result = await query(
      `UPDATE businesses
       SET brand_name = COALESCE($1, brand_name),
           primary_color = COALESCE($2, primary_color),
           secondary_color = COALESCE($3, secondary_color),
           logo_url = COALESCE($4, logo_url),
           animated_logo_url = COALESCE($5, animated_logo_url),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url, updated_at`,
      [
        payload.brand_name ?? null,
        payload.primary_color ?? null,
        payload.secondary_color ?? null,
        payload.logo_url ?? null,
        payload.animated_logo_url ?? null,
        businessId,
      ],
    )

    if (!result.rows[0]) throw new HttpError(404, 'Business not found')
    return res.json({ success: true, data: result.rows[0] })
  }),
)

businessesRouter.patch(
  '/:id(\\d+)/subscription',
  authorize('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const businessId = Number(req.params.id)
    const parsed = z.object({ subscription_expires_at: optionalDateTimeSchema }).safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    const expiresAt = parsed.data.subscription_expires_at
    const result = await query(
      'UPDATE businesses SET subscription_expires_at = $1, updated_at = NOW() WHERE id = $2 RETURNING id, subscription_expires_at',
      [expiresAt, businessId],
    )
    if (!result.rows[0]) throw new HttpError(404, 'Business not found')
    return res.json({ success: true, data: result.rows[0] })
  }),
)

businessesRouter.delete(
  '/:id(\\d+)',
  authorize('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const businessId = Number(req.params.id)
    if (businessId === Number(req.user.business_id)) {
      throw new HttpError(400, 'You cannot delete your own business')
    }

    const result = await query('DELETE FROM businesses WHERE id = $1 RETURNING id', [businessId])
    if (!result.rows[0]) throw new HttpError(404, 'Business not found')
    return res.json({ success: true, data: result.rows[0] })
  }),
)
