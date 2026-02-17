import { Router } from 'express'
import { z } from 'zod'
import { query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { requireSubscription } from '../../middleware/requireSubscription.js'
import { HttpError } from '../../utils/httpError.js'

export const liveStateRouter = Router()

const snapshotSchema = z.object({
  snapshot: z.object({}).passthrough(),
})

liveStateRouter.use(authenticate, requireSubscription)

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
  authorize('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const parsed = snapshotSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.issues)

    const result = await query(
      `INSERT INTO live_state_snapshots (business_id, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (business_id)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
       RETURNING payload, updated_at`,
      [req.user.business_id, JSON.stringify(parsed.data.snapshot)],
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
