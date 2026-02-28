import dotenv from 'dotenv'

dotenv.config()

function parseBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  baseUrl: process.env.BASE_URL || '',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsAllowAllOrigins: parseBoolean(process.env.CORS_ALLOW_ALL_ORIGINS, true),
  ablyApiKey: String(process.env.ABLY_API_KEY || '').trim(),
  ablyTokenTtlMs: Number(process.env.ABLY_TOKEN_TTL_MS || 60 * 60 * 1000),
  mediaVideosDir: String(process.env.MEDIA_VIDEOS_DIR || '/var/www/tournament/media/videos').trim(),
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

if (!env.ablyApiKey) {
  throw new Error('ABLY_API_KEY is required')
}
