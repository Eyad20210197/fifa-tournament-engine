import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { rateLimit } from 'express-rate-limit'
import { env } from './config/env.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { businessesRouter } from './modules/businesses/businesses.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { tournamentsRouter } from './modules/tournaments/tournaments.routes.js'
import { financeRouter } from './modules/finance/finance.routes.js'
import { liveStateRouter } from './modules/live-state/live-state.routes.js'
import { ablyRouter } from './modules/ably/ably.routes.js'
import { mediaRouter } from './modules/media/media.routes.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

export const app = express()

app.use(helmet())
app.set('trust proxy', 1)
app.use(compression())

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})

app.use('/api', apiLimiter)

const allowAnyOrigin = env.corsAllowAllOrigins

const corsOptions = {
  origin: allowAnyOrigin ? true : false,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '500mb' }))
app.use(express.urlencoded({ extended: true, limit: '500mb' }))
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(
  '/media/videos',
  express.static(env.mediaVideosDir, {
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000')
    },
  }),
)

app.use('/api/auth', authRouter)
app.use('/api/businesses', businessesRouter)
app.use('/api/users', usersRouter)
app.use('/api/tournaments', tournamentsRouter)
app.use('/api/finance', financeRouter)
app.use('/api/live-state', liveStateRouter)
app.use('/api/ably', ablyRouter)
app.use('/ably', ablyRouter)
app.use('/api/media', mediaRouter)

app.use(notFound)
app.use(errorHandler)
