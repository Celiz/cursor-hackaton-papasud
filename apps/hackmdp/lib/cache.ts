import Redis from "ioredis";

// Cliente redis único, lazy y tolerante: si redis no está, no rompe nada.
let client: Redis | null = null;
function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || "redis://redis:6379", {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on("error", () => {});
    client.connect().catch(() => {});
  }
  return client;
}

/**
 * Get-or-compute con redis, TOLERANTE A FALLOS: si redis no responde
 * corre fn() directo — el request nunca depende de que redis esté vivo.
 */
export async function cacheOr<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  try {
    const r = getRedis();
    const hit = await r.get(key);
    if (hit) return JSON.parse(hit) as T;
    const value = await fn();
    await r.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return value;
  } catch {
    return await fn();
  }
}

/** Invalida claves (soporta glob). Silenciosa si redis falla. */
export async function inval(pattern: string): Promise<void> {
  try {
    const r = getRedis();
    if (pattern.includes("*")) {
      const keys = await r.keys(pattern);
      if (keys.length) await r.del(...keys);
    } else {
      await r.del(pattern);
    }
  } catch {
    /* redis caído: el TTL limpia igual */
  }
}
