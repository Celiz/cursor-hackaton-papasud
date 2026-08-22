import { getRedis } from './index.js'

interface RateLimitResult {
  ok: boolean
  remaining: number
}

/**
 * Redis-backed sliding window rate limiter
 */
export async function rateLimit(
  key: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): Promise<RateLimitResult> {
  const redis = getRedis()
  const windowSeconds = Math.ceil(windowMs / 1000)

  // INCR + EXPIRE in a single pipeline
  const results = await redis
    .pipeline()
    .incr(key)
    .pttl(key)
    .exec()

  const count = results?.[0]?.[1] as number
  const ttl = results?.[1]?.[1] as number

  // First request in window — set expiry
  if (ttl === -1 || count === 1) {
    await redis.expire(key, windowSeconds)
  }

  if (count > maxRequests) {
    return { ok: false, remaining: 0 }
  }

  return { ok: true, remaining: maxRequests - count }
}
