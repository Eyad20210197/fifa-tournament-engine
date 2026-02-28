import { Router } from 'express'
import { z } from 'zod'
import { query } from '../../config/db.js'
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

const createBusinessSchema = z.object({
  name: z.string().min(1),
  brand_name: z.string().optional().nullable(),
  primary_color: z.string().optional().nullable(),
  secondary_color: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  animated_logo_url: z.string().optional().nullable(),
  subscription_expires_at: optionalDateTimeSchema.optional(),
})

const updateBusinessSchema = createBusinessSchema.partial()

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
      `SELECT id, name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url
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
              subscription_expires_at, created_at, updated_at
       FROM businesses
       ORDER BY id DESC`,
    )
    return res.json({ success: true, data: result.rows })
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
      `INSERT INTO businesses (name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url, subscription_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url, subscription_expires_at, created_at, updated_at`,
      [
        payload.name,
        payload.brand_name || null,
        payload.primary_color || null,
        payload.secondary_color || null,
        payload.logo_url || null,
        payload.animated_logo_url || null,
        payload.subscription_expires_at || null,
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
    updates.push('updated_at = NOW()')

    params.push(businessId)
    const result = await query(
      `UPDATE businesses
       SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, name, brand_name, primary_color, secondary_color, logo_url, animated_logo_url, subscription_expires_at, created_at, updated_at`,
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
