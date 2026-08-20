import Ably from 'ably'
import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { authorize } from '../../middleware/authorize.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireSubscription } from '../../middleware/requireSubscription.js'
import { publishEvent, generateTokenRequest } from '../../services/ably.service.js'
import { matchChannel, tournamentChannel } from '../../services/channel-names.service.js'

export const ablyRouter = Router()

ablyRouter.get(
  '/token',
  asyncHandler(async (req, res) => {
    const rawClientId = req.query.clientId
    const clientId = rawClientId == null ? 'anonymous-client' : String(rawClientId).trim()
    const tokenRequest = await generateTokenRequest(clientId)
    return res.json(tokenRequest)
  }),
)

ablyRouter.use(authenticate, requireSubscription)

const mockMatchUpdateSchema = z.object({
  tournamentId: z.coerce.number().int().positive(),
  matchId: z.coerce.number().int().positive(),
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
})

ablyRouter.post(
  '/test/match-update',
  authorize('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const parsed = mockMatchUpdateSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.issues })
    }

    const payload = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
      source: 'mock-endpoint',
    }
    const channels = [matchChannel(payload.matchId), tournamentChannel(payload.tournamentId)].filter(Boolean)

    await Promise.all(channels.map((channelName) => publishEvent(channelName, 'score:update', payload)))

    return res.json({
      success: true,
      data: {
        published: channels.length,
        channels,
        payload,
      },
    })
  }),
)
