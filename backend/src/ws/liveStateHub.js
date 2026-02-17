import jwt from 'jsonwebtoken'
import { WebSocketServer } from 'ws'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

function safeParseMessage(raw) {
  try {
    const parsed = JSON.parse(String(raw || ''))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function setupLiveStateWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true })
  const clientsByBusiness = new Map()

  function addClient(businessId, ws) {
    if (!clientsByBusiness.has(businessId)) {
      clientsByBusiness.set(businessId, new Set())
    }
    clientsByBusiness.get(businessId).add(ws)
  }

  function removeClient(businessId, ws) {
    const set = clientsByBusiness.get(businessId)
    if (!set) return
    set.delete(ws)
    if (set.size === 0) {
      clientsByBusiness.delete(businessId)
    }
  }

  function broadcastToBusiness(businessId, payload, sender) {
    const set = clientsByBusiness.get(businessId)
    if (!set) return

    const serialized = JSON.stringify(payload)
    for (const client of set) {
      if (client === sender) continue
      if (client.readyState === 1) {
        client.send(serialized)
      }
    }
  }

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`)
    if (url.pathname !== '/ws/live-state') {
      socket.destroy()
      return
    }

    const token = url.searchParams.get('token')
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    let payload
    try {
      payload = jwt.verify(token, env.jwtSecret)
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    const businessId = Number(payload?.business_id)
    if (!businessId) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.businessId = businessId
      ws.userId = payload?.sub ? Number(payload.sub) : null

      addClient(businessId, ws)

      ws.send(
        JSON.stringify({
          type: 'WS_CONNECTED',
          businessId,
          timestamp: Date.now(),
        }),
      )

      ws.on('message', (data) => {
        const msg = safeParseMessage(data)
        if (!msg) return
        if (msg.type !== 'STATE_UPDATED') return

        broadcastToBusiness(
          businessId,
          {
            type: 'STATE_UPDATED',
            payload: msg.payload || null,
            businessId,
            timestamp: Date.now(),
          },
          ws,
        )
      })

      ws.on('close', () => {
        removeClient(businessId, ws)
      })
    })
  })

  logger.info('Live-state WebSocket enabled at /ws/live-state')
  return wss
}
