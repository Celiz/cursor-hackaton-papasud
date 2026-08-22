import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg'

// Type for the query function used in transactions
export type TransactionQuery = <R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => Promise<QueryResult<R>>

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/locus',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
    pool = new Pool(config)
  }
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = getPool()
  const start = Date.now()
  const result = await client.query<T>(text, params)
  const duration = Date.now() - start

  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.slice(0, 50), duration, rows: result.rowCount })
  }

  return result
}

export async function getClient() {
  const pool = getPool()
  return pool.connect()
}

export async function transaction<T>(
  callback: (query: TransactionQuery) => Promise<T>
): Promise<T> {
  const client = await getClient()

  const transactionQuery = async <R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<R>> => {
    return client.query<R>(text, params)
  }

  try {
    await client.query('BEGIN')
    const result = await callback(transactionQuery)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
