import { app } from './app.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { createServer } from 'node:http'
import { setupLiveStateWebSocket } from './ws/liveStateHub.js'

app.get('/', (req, res) => {
  return res.json({
    success: true,
    status: 'ok',
    baseUrl: env.baseUrl || null,
  })
})

const httpServer = createServer(app)
setupLiveStateWebSocket(httpServer)

httpServer.listen(env.port, () => {
  logger.info(`Backend listening on port ${env.port} (${env.nodeEnv})`)
})

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', error)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error)
})
