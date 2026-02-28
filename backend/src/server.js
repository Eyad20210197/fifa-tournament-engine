import { createServer } from 'node:http'
import process from 'node:process'

import { app } from './app.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { getLiveTimerStats, stopAllTimers } from './services/live-timer.service.js'

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'ok',
    environment: env.nodeEnv,
    baseUrl: env.baseUrl || null,
  })
})

const httpServer = createServer(app)

app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    ...getLiveTimerStats(),
  })
})

const PORT = env.port || 4000
const HOST = '0.0.0.0'
const MAX_LISTEN_RETRIES = 10
const MAX_BACKOFF_MS = 30000
const RECOVERABLE_SERVER_ERRORS = new Set(['EADDRINUSE', 'EADDRNOTAVAIL', 'ECONNRESET', 'EPIPE'])

let isShuttingDown = false
let listenRetryAttempt = 0
let listenRetryTimer = null

function clearListenRetryTimer() {
  if (!listenRetryTimer) return
  clearTimeout(listenRetryTimer)
  listenRetryTimer = null
}

function getRetryDelayMs(attempt) {
  const backoff = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.max(0, attempt - 1))
  const jitter = Math.floor(Math.random() * 500)
  return backoff + jitter
}

function startHttpServer() {
  if (isShuttingDown || httpServer.listening) return

  httpServer.listen(PORT, HOST, () => {
    listenRetryAttempt = 0
    clearListenRetryTimer()
    logger.info(`Backend running on ${HOST}:${PORT} [${env.nodeEnv}]`)
  })
}

httpServer.on('error', (error) => {
  logger.error(`HTTP server error: ${error?.code || 'UNKNOWN'} ${error?.message || ''}`)

  if (isShuttingDown) return
  if (!RECOVERABLE_SERVER_ERRORS.has(error?.code)) {
    process.exit(1)
  }

  if (listenRetryAttempt >= MAX_LISTEN_RETRIES) {
    logger.error('HTTP server retry limit reached. Exiting.')
    process.exit(1)
  }

  listenRetryAttempt += 1
  clearListenRetryTimer()
  const delay = getRetryDelayMs(listenRetryAttempt)
  logger.warn(`Retrying HTTP listen in ${delay}ms (attempt ${listenRetryAttempt}/${MAX_LISTEN_RETRIES})`)

  listenRetryTimer = setTimeout(() => {
    listenRetryTimer = null
    startHttpServer()
  }, delay)
  if (typeof listenRetryTimer.unref === 'function') {
    listenRetryTimer.unref()
  }
})

startHttpServer()

const shutdown = (signal) => {
  isShuttingDown = true
  clearListenRetryTimer()
  logger.warn(`Received ${signal}. Shutting down gracefully...`)

  stopAllTimers()
  httpServer.close(() => {
    logger.info('HTTP server closed.')
    process.exit(0)
  })

  const forceCloseTimeout = setTimeout(() => {
    logger.error('Force shutdown due to timeout.')
    process.exit(1)
  }, 10000)
  if (typeof forceCloseTimeout.unref === 'function') {
    forceCloseTimeout.unref()
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
})
