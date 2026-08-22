import { cookies } from 'next/headers'
import { verifyToken, getSessionUser, type SessionUser, type JWTPayload } from '@locus/core'

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  // Get full session user with org details (persona_id is the actual persona, sub is auth_credentials id)
  const user = await getSessionUser(payload.persona_id || payload.sub, payload.org_id)
  return user
}

export async function getSessionPayload(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) return null

  return verifyToken(token)
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('No session found')
  }
  return session
}

export async function requireOrg(): Promise<SessionUser & { org_id: string }> {
  const session = await requireSession()
  if (!session.org_id) {
    throw new Error('No organization selected')
  }
  return session as SessionUser & { org_id: string }
}
