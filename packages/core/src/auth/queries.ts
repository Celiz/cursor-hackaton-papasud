import { query } from '@locus/db'
import type { AuthCredential, Persona, OrgMember } from '@locus/db'
import type { CreateCredentials, SessionUser, LoginBaseResult } from './types'
import { hashPassword, verifyPassword } from './password'

// ==================== CREDENTIALS ====================

export async function getCredentialByEmail(email: string): Promise<AuthCredential | null> {
  const result = await query<AuthCredential>(
    'SELECT * FROM auth_credentials WHERE email = $1',
    [email]
  )
  return result.rows[0] || null
}

export async function createCredentials(data: CreateCredentials): Promise<AuthCredential> {
  const password_hash = await hashPassword(data.password)

  const result = await query<AuthCredential>(
    `INSERT INTO auth_credentials (persona_id, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.persona_id, data.email, password_hash]
  )

  return result.rows[0]
}

export async function createGoogleCredentials(data: {
  persona_id: string
  email: string
}): Promise<AuthCredential> {
  const result = await query<AuthCredential>(
    `INSERT INTO auth_credentials (persona_id, email, password_hash, provider)
     VALUES ($1, $2, NULL, 'google')
     RETURNING *`,
    [data.persona_id, data.email]
  )
  return result.rows[0]
}

export async function updateLastLogin(credential_id: string): Promise<void> {
  await query(
    'UPDATE auth_credentials SET last_login = NOW() WHERE id = $1',
    [credential_id]
  )
}

// ==================== LOGIN BASE (credential verification only) ====================

export async function loginBase(email: string, password: string): Promise<LoginBaseResult> {
  // 1. Get credentials
  const credential = await getCredentialByEmail(email)
  if (!credential) {
    return { success: false, error: 'Credenciales inválidas' }
  }

  // 2. Verify password
  if (!credential.password_hash) {
    return { success: false, error: 'Esta cuenta usa Google para ingresar' }
  }
  const valid = await verifyPassword(password, credential.password_hash)
  if (!valid) {
    return { success: false, error: 'Credenciales inválidas' }
  }

  // 3. Get persona
  const personaResult = await query<Persona>(
    'SELECT * FROM personas WHERE id = $1',
    [credential.persona_id]
  )
  const persona = personaResult.rows[0]
  if (!persona) {
    return { success: false, error: 'Persona no encontrada' }
  }

  // 4. Update last login
  await updateLastLogin(credential.id)

  return {
    success: true,
    persona_id: persona.id,
    email: persona.email!,
    nombre: persona.nombre,
    credential_id: credential.id,
  }
}

// ==================== SESSION HELPERS ====================

export async function getSessionUser(persona_id: string, org_id: string | null): Promise<SessionUser | null> {
  const personaResult = await query<Persona>(
    'SELECT * FROM personas WHERE id = $1',
    [persona_id]
  )
  const persona = personaResult.rows[0]
  if (!persona) return null

  if (!org_id) {
    return {
      persona_id: persona.id,
      email: persona.email!,
      nombre: persona.nombre,
      org_id: null,
      org_slug: null,
      org_nombre: null,
      rol: null,
      permisos: null,
    }
  }

  const memberResult = await query<OrgMember & { org_slug: string; org_nombre: string }>(
    `SELECT om.*, o.slug as org_slug, o.nombre as org_nombre
     FROM org_members om
     JOIN organizations o ON o.id = om.org_id
     WHERE om.org_id = $1 AND om.persona_id = $2`,
    [org_id, persona_id]
  )
  const member = memberResult.rows[0]

  return {
    persona_id: persona.id,
    email: persona.email!,
    nombre: persona.nombre,
    org_id: org_id,
    org_slug: member?.org_slug || null,
    org_nombre: member?.org_nombre || null,
    rol: member?.rol || null,
    permisos: member?.permisos || null,
  }
}
