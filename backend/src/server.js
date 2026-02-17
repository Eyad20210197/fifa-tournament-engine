import { app } from './app.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { createServer } from 'node:http'
import { setupLiveStateWebSocket } from './ws/liveStateHub.js'

const httpServer = createServer(app)
setupLiveStateWebSocket(httpServer)

httpServer.listen(env.port, () => {
  logger.info(`Backend running on Live Server Render Port: ${env.port}`)
})
