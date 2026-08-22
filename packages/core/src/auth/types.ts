import type { AuthCredential, AuthSession, OrgMemberRol } from '@locus/db'

export type { AuthCredential, AuthSession, OrgMemberRol }

export interface JWTPayload {
  sub: string // auth_credentials id
  persona_id: string
  email: string
  nombre: string
  user_id?: string
  org_id?: string | null
  org_slug?: string | null
  org_nombre?: string | null
  org_logo?: string | null
  org_theme?: string | null
  org_tipo?: string | null
  rol?: OrgMemberRol | null
  is_admin?: boolean
  iat: number
  exp: number
}

export interface SessionUser {
  id?: string
  user_id?: string
  persona_id: string
  email: string
  nombre: string
  org_id?: string | null
  org_slug?: string | null
  org_nombre?: string | null
  org_logo?: string | null
  org_theme?: string | null
  org_tipo?: string | null
  rol?: OrgMemberRol | null
  is_admin?: boolean
  permisos?: Record<string, boolean> | null
}

// Base login result — credential verification only, no org resolution
export interface LoginBaseResult {
  success: boolean
  persona_id?: string
  email?: string
  nombre?: string
  credential_id?: string
  error?: string
}

export interface CreateCredentials {
  persona_id: string
  email: string
  password: string
}
