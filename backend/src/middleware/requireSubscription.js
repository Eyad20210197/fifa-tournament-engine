import { query } from '../config/db.js'
import { HttpError } from '../utils/httpError.js'

export async function requireSubscription(req, res, next) {
  if (!req.user?.business_id) return next(new HttpError(403, 'Business context missing'))

  const sql = `
    SELECT id, subscription_expires_at
    FROM businesses
    WHERE id = $1
    LIMIT 1
  `
  const result = await query(sql, [req.user.business_id])
  const business = result.rows[0]
  if (!business) return next(new HttpError(403, 'Business not found'))

  if (!business.subscription_expires_at || new Date(business.subscription_expires_at).getTime() < Date.now()) {
    return next(new HttpError(403, 'Subscription expired'))
  }

  return next()
}

