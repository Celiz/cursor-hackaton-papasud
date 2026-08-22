/**
 * PostgreSQL database connection utility
 * Local PostgreSQL for main app data
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';

// Local PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Execute a SQL query
 * @param text SQL query string
 * @param params Query parameters
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('[DB Query]', { text: text.substring(0, 100), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('[DB Query Error]', { text, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
  return await pool.connect();
}

/**
 * Close the pool (usually not needed in development)
 */
export async function closePool() {
  await pool.end();
}

// Export the query function as default export for convenience
export default { query, getClient, closePool };
