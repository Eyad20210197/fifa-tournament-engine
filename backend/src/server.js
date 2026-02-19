import { createServer } from 'node:http'
import process from 'node:process'

import { app } from './app.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { setupLiveStateWebSocket } from './ws/liveStateHub.js'

/* -----------------------------
   Basic Health & Root Routes
------------------------------ */

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'ok',
    environment: env.nodeEnv,
    baseUrl: env.baseUrl || null,
  })
})

app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  })
})

/* -----------------------------
   HTTP + WebSocket Server
------------------------------ */

const httpServer = createServer(app)

// Attach WebSocket to SAME HTTP server
setupLiveStateWebSocket(httpServer)

/* -----------------------------
   Start Server
------------------------------ */

const PORT = env.port || 4000
const HOST = '0.0.0.0' // required for VPS

httpServer.listen(PORT, HOST, () => {
  logger.info(
    `🚀 Backend running on ${HOST}:${PORT} [${env.nodeEnv}]`
  )
})

/* -----------------------------
   Graceful Shutdown
------------------------------ */

const shutdown = (signal) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`)

  httpServer.close(() => {
    logger.info('HTTP server closed.')
    process.exit(0)
  })

  // Force close after timeout
  setTimeout(() => {
    logger.error('Force shutdown due to timeout.')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

/* -----------------------------
   Global Error Handlers
------------------------------ */

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
})
