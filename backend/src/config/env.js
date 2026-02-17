import dotenv from 'dotenv'

dotenv.config()

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: process.env.CORS_ORIGIN,
}

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required')
}

