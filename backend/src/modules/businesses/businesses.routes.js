import { Router } from 'express'
import { query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'

export const businessesRouter = Router()

businessesRouter.use(authenticate, authorize('SUPER_ADMIN'))

businessesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await query(
      'SELECT id, name, brand_name, subscription_expires_at, created_at FROM businesses ORDER BY id DESC',
    )
    return res.json({ success: true, data: result.rows })
  }),
)

businessesRouter.patch(
  '/:id/subscription',
  asyncHandler(async (req, res) => {
    const businessId = Number(req.params.id)
    const expiresAt = req.body?.subscription_expires_at || null
    const result = await query(
      'UPDATE businesses SET subscription_expires_at = $1, updated_at = NOW() WHERE id = $2 RETURNING id, subscription_expires_at',
      [expiresAt, businessId],
    )
    return res.json({ success: true, data: result.rows[0] || null })
  }),
)

