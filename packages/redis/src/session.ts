import { getRedis } from './index.js'

const SESSION_PREFIX = 'session:'
const DEFAULT_TTL = 3600 // 1 hour

/**
 * Session cache: avoids hitting PostgreSQL on every request
 *
 * Usage:
 *   const session = await sessionCache.get(token)
 *   if (!session) {
 *     const fresh = await verifyTokenFromDB(token)
 *     await sessionCache.set(token, fresh)
 *   }
 */
export const sessionCache = {
  async get<T = unknown>(token: string): Promise<T | null> {
    const redis = getRedis()
    const data = await redis.get(SESSION_PREFIX + token)
    if (!data) return null
    return JSON.parse(data) as T
  },

  async set(token: string, data: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
    const redis = getRedis()
    await redis.set(SESSION_PREFIX + token, JSON.stringify(data), 'EX', ttlSeconds)
  },

  async del(token: string): Promise<void> {
    const redis = getRedis()
    await redis.del(SESSION_PREFIX + token)
  },

  async invalidateAll(): Promise<void> {
    const redis = getRedis()
    const keys = await redis.keys(SESSION_PREFIX + '*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  },
}
