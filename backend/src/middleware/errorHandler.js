import { logger } from '../utils/logger.js'

export function errorHandler(error, req, res, next) {
  const dbNetworkErrorCodes = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'])
  const dbAuthErrorCodes = new Set(['28P01', '28000'])
  const isDbConnectivityFailure =
    dbNetworkErrorCodes.has(error.code) ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('getaddrinfo'))
  const isDbAuthFailure = dbAuthErrorCodes.has(error.code)

  const status = Number(error.status || (isDbConnectivityFailure || isDbAuthFailure ? 503 : 500))
  const message =
    isDbConnectivityFailure || isDbAuthFailure
      ? 'Database service is unavailable'
      : error.message || 'Internal Server Error'

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
