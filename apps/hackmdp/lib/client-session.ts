import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'locus-dev-secret-change-in-production'
)
const COOKIE_NAME = 'cliente_session'

export interface ClienteSession {
  persona_id: string
  org_id: string
  contact_id: string
  scope: 'full' | 'limited'
  recurso_tipo?: string
  recurso_id?: string
  origen: 'token' | 'login'
  nombre: string
  email: string | null
  org_nombre: string
  org_theme: string
  org_logo: string | null
}

export async function createClienteSession(data: ClienteSession): Promise<string> {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/cliente',
    maxAge: 30 * 24 * 60 * 60,
  })

  return token
}

export async function getClienteSession(): Promise<ClienteSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as ClienteSession
  } catch {
    return null
  }
}

export async function requireClienteSession(): Promise<ClienteSession> {
  const session = await getClienteSession()
  if (!session) throw new Error('No autorizado')
  return session
}

export async function clearClienteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
