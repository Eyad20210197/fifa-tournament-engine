import { HttpError } from '../utils/httpError.js'

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required'))
    if (!allowedRoles.includes(req.user.role)) return next(new HttpError(403, 'Insufficient permissions'))
    return next()
  }
}

