import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { query } from '../../config/db.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { HttpError } from '../../utils/httpError.js'

export const usersRouter = Router()

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'STAFF']),
})

usersRouter.use(authenticate)

usersRouter.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const sql =
      req.user.role === 'SUPER_ADMIN'
        ? 'SELECT id, username, role, business_id, created_at FROM users ORDER BY id DESC'
        : 'SELECT id, username, role, business_id, created_at FROM users WHERE business_id = $1 ORDER BY id DESC'
    const params = req.user.role === 'SUPER_ADMIN' ? [] : [req.user.business_id]
    const result = await query(sql, params)
    return res.json({ success: true, data: result.rows })
  }),
)

usersRouter.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid payload', parsed.error.issues)
    }

    const businessId = req.user.role === 'SUPER_ADMIN' ? Number(req.body.business_id) : req.user.business_id
    if (!businessId) throw new HttpError(400, 'business_id is required')

    const hash = await bcrypt.hash(parsed.data.password, 10)
    const result = await query(
      `INSERT INTO users (username, password_hash, role, business_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, role, business_id, created_at`,
      [parsed.data.username, hash, parsed.data.role, businessId],
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  }),
)

