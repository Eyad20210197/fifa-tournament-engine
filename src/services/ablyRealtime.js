import * as Ably from 'ably'
import { ABLY_AUTH_URL } from '../config/env'

const TOKEN_KEY = 'saasToken'

let realtimeClient = null

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || token === 'null' || token === 'undefined') return {}
  return {
    Authorization: `Bearer ${token}`,
  }
}

export function getAblyRealtimeClient() {
  if (realtimeClient) return realtimeClient

  realtimeClient = new Ably.Realtime({
    authUrl: ABLY_AUTH_URL,
    authMethod: 'GET',
    authHeaders: authHeaders(),
    autoConnect: true,
  })
  realtimeClient.connection.on((change) => {
    console.debug('[ABLY] Connection state change:', {
      current: change?.current,
      previous: change?.previous,
      reason: change?.reason?.message || null,
    })
  })

  return realtimeClient
}

export function subscribeAblyConnectionStatus(handler) {
  const client = getAblyRealtimeClient()
  const onStateChange = (change) => {
    handler(change?.current || 'initialized')
  }
  client.connection.on(onStateChange)
  handler(client.connection.state || 'initialized')
  return () => {
    client.connection.off(onStateChange)
  }
}
