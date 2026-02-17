import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { businessesRouter } from './modules/businesses/businesses.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { tournamentsRouter } from './modules/tournaments/tournaments.routes.js'
import { financeRouter } from './modules/finance/finance.routes.js'
import { liveStateRouter } from './modules/live-state/live-state.routes.js'
import { asyncHandler } from './utils/asyncHandler.js'
import { query } from './config/db.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

export const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get(
  '/health',
  asyncHandler(async (req, res) => {
    await query('SELECT 1')
    return res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  }),
)

app.use('/api/auth', authRouter)
app.use('/api/businesses', businessesRouter)
app.use('/api/users', usersRouter)
app.use('/api/tournaments', tournamentsRouter)
app.use('/api/finance', financeRouter)
app.use('/api/live-state', liveStateRouter)

app.use(notFound)
app.use(errorHandler)
