import Ably from 'ably/promises'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

let restClient = null

function getAblyRestClient() {
  if (!restClient) {
    restClient = new Ably.Rest({ key: env.ablyApiKey })
  }
  return restClient
}

export async function publishEvent(channelName, eventName, payload) {
  if (!channelName || !eventName) return false
  const channel = getAblyRestClient().channels.get(channelName)
  await channel.publish(eventName, payload)
  return true
}

export async function generateTokenRequest(clientId) {
  const safeClientId = String(clientId || '').trim()
  if (!safeClientId) {
    throw new Error('clientId is required')
  }
  const tokenRequest = await getAblyRestClient().auth.createTokenRequest({
    clientId: safeClientId,
    ttl: env.ablyTokenTtlMs,
    capability: JSON.stringify({
      '*': ['subscribe', 'history', 'presence'],
    }),
  })
  return tokenRequest
}

export function publishEventNonBlocking(channelName, eventName, payload) {
  void publishEvent(channelName, eventName, payload).catch((error) => {
    logger.error('Ably publish failed:', {
      channelName,
      eventName,
      message: error?.message || 'unknown-error',
    })
  })
}
