import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

const databaseUrl = new URL(env.databaseUrl)
const sslMode = databaseUrl.searchParams.get('sslmode')?.toLowerCase()
const isNeonHost =
  databaseUrl.hostname.includes('neon.tech') || databaseUrl.hostname.endsWith('.neon.tech')
const isSupabaseHost = databaseUrl.hostname.includes('supabase.co')
const needsSsl =
  sslMode != null
    ? sslMode !== 'disable'
    : env.nodeEnv === 'production' || isNeonHost || isSupabaseHost

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
})

export async function query(text, params = []) {
  return pool.query(text, params)
}

export async function withTransaction(workFn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await workFn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
