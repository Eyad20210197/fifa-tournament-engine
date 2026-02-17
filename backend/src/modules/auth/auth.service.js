import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../../config/db.js'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/httpError.js'

export async function login({ username, password }) {
  const sql = `
    SELECT
      u.id,
      u.username,
      u.password_hash,
      u.role,
      u.business_id,
      b.subscription_expires_at
    FROM users u
    INNER JOIN businesses b ON b.id = u.business_id
    WHERE u.username = $1
    LIMIT 1
  `
  const result = await query(sql, [username])
  const user = result.rows[0]

  if (!user) {
    throw new HttpError(401, 'Invalid credentials')
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash)
  if (!passwordOk) {
    throw new HttpError(401, 'Invalid credentials')
  }

  if (!user.subscription_expires_at || new Date(user.subscription_expires_at).getTime() < Date.now()) {
    throw new HttpError(403, 'Subscription expired')
  }

  const token = jwt.sign(
    {
      username: user.username,
      role: user.role,
      business_id: user.business_id,
    },
    env.jwtSecret,
    {
      subject: String(user.id),
      expiresIn: env.jwtExpiresIn,
    },
  )

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      business_id: user.business_id,
    },
  }
}

