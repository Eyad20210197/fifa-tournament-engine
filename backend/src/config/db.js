import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
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
