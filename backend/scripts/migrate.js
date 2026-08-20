import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL is not set in backend/.env')
  process.exit(1)
}

const parsedUrl = new URL(databaseUrl)
const sslMode = parsedUrl.searchParams.get('sslmode')?.toLowerCase()
const isNeonHost = parsedUrl.hostname.includes('neon.tech') || parsedUrl.hostname.endsWith('.neon.tech')
const isSupabaseHost = parsedUrl.hostname.includes('supabase.co')
const needsSsl =
  sslMode != null
    ? sslMode !== 'disable'
    : isNeonHost || isSupabaseHost

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
})

async function runMigrations() {
  const client = await pool.connect()
  try {
    console.log('🔄 Connecting to database and checking migration history...')

    // Create migrations tracker table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    const { rows: appliedRows } = await client.query('SELECT name FROM _migrations')
    const appliedNames = new Set(appliedRows.map((r) => r.name))

    const migrationsDir = path.resolve(__dirname, '../migrations')
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

    console.log(`📁 Found ${files.length} migration files in backend/migrations`)

    let appliedCount = 0
    for (const file of files) {
      if (appliedNames.has(file)) {
        console.log(`  ⏩ Skipping already applied: ${file}`)
        continue
      }

      console.log(`  🚀 Applying migration: ${file}...`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`  ✅ Successfully applied: ${file}`)
        appliedCount++
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`  ❌ Failed applying ${file}:`, err.message)
        throw err
      }
    }

    console.log(`\n🎉 Migration complete! ${appliedCount} new migrations applied.`)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations().catch((err) => {
  console.error('\n❌ Migration runner failed:', err)
  process.exit(1)
})
