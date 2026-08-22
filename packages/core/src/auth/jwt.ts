import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from './types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'locus-dev-secret-change-in-production'
)

const JWT_EXPIRATION = '7d'

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET)

  return token
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function decodeToken(token: string): Promise<JWTPayload | null> {
  try {
    // Decode without verification (for debugging)
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    )

    return payload as JWTPayload
  } catch {
    return null
  }
}
