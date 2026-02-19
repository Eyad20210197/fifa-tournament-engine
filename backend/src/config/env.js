import dotenv from 'dotenv'

dotenv.config()

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || ''
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  frontendUrl: process.env.FRONTEND_URL || '',
  allowedOrigins: parseAllowedOrigins(),
}

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

try {
  // Validate URL early so runtime queries do not fail with opaque 500s.
  new URL(env.databaseUrl)
} catch {
  throw new Error('DATABASE_URL is invalid. URL-encode special characters in username/password.')
}

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required')
}

if (env.nodeEnv === 'production' && env.allowedOrigins.length === 0 && !env.frontendUrl) {
  throw new Error('Set ALLOWED_ORIGINS or FRONTEND_URL in production')
}
