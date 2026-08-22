import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { query, getClient, closePool } from './client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations')

interface Migration {
  id: number
  name: string
  applied_at: Date
}

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

async function getAppliedMigrations(): Promise<string[]> {
  const result = await query<Migration>('SELECT name FROM _migrations ORDER BY id')
  return result.rows.map(row => row.name)
}

async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR)
  return files
    .filter(f => f.endsWith('.sql'))
    .sort()
}

export async function migrate(): Promise<void> {
  console.log('Running migrations...')

  await ensureMigrationsTable()

  const applied = await getAppliedMigrations()
  const files = await getMigrationFiles()

  const pending = files.filter(f => !applied.includes(f))

  if (pending.length === 0) {
    console.log('No pending migrations')
    return
  }

  const client = await getClient()

  try {
    for (const file of pending) {
      console.log(`Applying: ${file}`)

      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')

      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')

      console.log(`Applied: ${file}`)
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  console.log(`Applied ${pending.length} migration(s)`)
}

export async function rollback(steps = 1): Promise<void> {
  console.log(`Rolling back ${steps} migration(s)...`)

  const applied = await getAppliedMigrations()
  const toRollback = applied.slice(-steps)

  if (toRollback.length === 0) {
    console.log('No migrations to rollback')
    return
  }

  // Note: This is a simple rollback that just removes from _migrations
  // For proper rollback, you'd need down migrations
  for (const name of toRollback.reverse()) {
    await query('DELETE FROM _migrations WHERE name = $1', [name])
    console.log(`Rolled back: ${name}`)
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => closePool())
    .catch(err => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}
