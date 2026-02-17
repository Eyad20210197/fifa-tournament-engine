import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { HttpError } from '../utils/httpError.js'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) return next(new HttpError(401, 'Authentication required'))

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    req.user = {
      id: payload.sub,
      role: payload.role,
      business_id: payload.business_id,
      username: payload.username,
    }
    return next()
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'))
  }
}

