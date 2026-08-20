import Ably from 'ably'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

const ably = env.ablyApiKey ? new Ably.Rest({ key: env.ablyApiKey }) : null

export async function publishEvent(channelName, eventName, payload) {
  if (!channelName || !eventName) return false
  if (!ably) {
    logger.info('[ABLY DEV MOCK] Publishing ->', channelName, eventName, payload)
    return true
  }
  console.log('[ABLY PUBLISH]', channelName, eventName)
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
  if (!ably) {
    return {
      clientId: safeClientId,
      token: 'mock-dev-token',
      keyName: 'mock-key',
      nonce: 'mock-nonce',
      timestamp: Date.now(),
    }
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
