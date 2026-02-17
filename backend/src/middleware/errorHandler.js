import { logger } from '../utils/logger.js'

export function errorHandler(error, req, res, next) {
  const status = Number(error.status || 500)
  const message = error.message || 'Internal Server Error'

  logger.error(req.method, req.originalUrl, status, message)

  if (res.headersSent) {
    return next(error)
  }

  return res.status(status).json({
    success: false,
    message,
    details: error.details || null,
  })
}

