import { getRedis } from './index.js'

/**
 * Set a value in cache with optional TTL (seconds)
 */
export async function cache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const redis = getRedis()
  const serialized = JSON.stringify(value)
  if (ttlSeconds) {
    await redis.set(key, serialized, 'EX', ttlSeconds)
  } else {
    await redis.set(key, serialized)
  }
}

/**
 * Get-or-compute pattern: returns cached value or runs fn() and caches result
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const redis = getRedis()
  const existing = await redis.get(key)
  if (existing) {
    return JSON.parse(existing) as T
  }
  const value = await fn()
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  return value
}

/**
 * Invalidate one or more cache keys (supports glob patterns)
 */
export async function invalidate(pattern: string): Promise<number> {
  const redis = getRedis()
  if (pattern.includes('*')) {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) return 0
    return redis.del(...keys)
  }
  return redis.del(pattern)
}
