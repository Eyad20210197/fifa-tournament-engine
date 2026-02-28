import Ably from 'ably'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

const ably = new Ably.Rest({ key: env.ablyApiKey })

export async function publishEvent(channelName, eventName, payload) {
  if (!channelName || !eventName) return false
  logger.info('[ABLY] Publishing ->', channelName, eventName, payload)
  const channel = ably.channels.get(channelName)
  await channel.publish(eventName, payload)
  logger.info('[ABLY] Published successfully ->', channelName, eventName)
  return true
}

export async function generateTokenRequest(clientId) {
  const safeClientId = String(clientId || '').trim()
  if (!safeClientId) {
    throw new Error('clientId is required')
  }
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: safeClientId,
    ttl: env.ablyTokenTtlMs,
    capability: JSON.stringify({
      '*': ['subscribe', 'history', 'presence'],
    }),
  })
  return tokenRequest
}
