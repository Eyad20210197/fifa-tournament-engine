import dotenv from 'dotenv'

dotenv.config()

const DEFAULT_PROD_ORIGIN = 'https://fifa-ramadan-tournament-2026.vercel.app'

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || ''
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const frontendUrl = String(process.env.FRONTEND_URL || '').trim()
  if (frontendUrl) {
    origins.push(frontendUrl)
  }

  if (origins.length > 0) {
    return [...new Set(origins)]
  }

  if (process.env.NODE_ENV === 'production') {
    return [DEFAULT_PROD_ORIGIN]
  }

  return []
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  baseUrl: process.env.BASE_URL || '',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  frontendUrl: String(process.env.FRONTEND_URL || '').trim(),
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

if (!env.baseUrl && env.nodeEnv === 'production') {
  throw new Error('BASE_URL is required in production')
}

if (env.nodeEnv === 'production' && env.allowedOrigins.length === 0) {
  throw new Error('Set ALLOWED_ORIGINS in production')
}
