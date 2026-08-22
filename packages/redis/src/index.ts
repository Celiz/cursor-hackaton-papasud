import Redis from 'ioredis'

let client: Redis | null = null

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
    client.connect().catch((err) => {
      console.error('[redis] Connection failed:', err.message)
    })
  }
  return client
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
  }
}

export { Redis }
export { cache, cached, invalidate } from './cache.js'
export { rateLimit } from './rate-limit.js'
export { sessionCache } from './session.js'
