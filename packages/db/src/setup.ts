import { getPool, closePool } from './client'

async function setup() {
  console.log('Setting up database...')

  const pool = getPool()

  // Test connection
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('Connected to database at:', result.rows[0].now)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
      console.error('Could not connect to database. Make sure PostgreSQL is running.')
      console.error('Expected: postgresql://postgres:postgres@localhost:5432/locus')
      process.exit(1)
    }
    throw error
  }

  // Check if database exists, create if not
  try {
    await pool.query('SELECT 1')
    console.log('Database connection OK')
  } catch (error) {
    console.error('Database error:', error)
    process.exit(1)
  }

  await closePool()
  console.log('Setup complete. Run `pnpm db:migrate` to apply migrations.')
}

setup().catch(err => {
  console.error('Setup failed:', err)
  process.exit(1)
})
