// Schema types generated from database
// This file is the source of truth for TypeScript types

export interface Persona {
  id: string
  documento_tipo: string | null
  documento_nro: string | null
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
  fecha_nacimiento: Date | null
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  codigo_postal: string | null
  entidad_id: string | null
  bio: string | null
  que_construyo: string | null
  etapa: 'idea' | 'construyendo' | 'creciendo' | 'consolidado' | null
  busco: string | null
  tags: string[]
  linkedin_url: string | null
  instagram: string | null
  website: string | null
  created_at: Date
  updated_at: Date
}

export interface Organization {
  id: string
  slug: string
  nombre: string
  cuit: string | null
  tipo: string | null
  config: Record<string, unknown> | null
  created_at: Date
}

export type OrgMemberRol = 'owner' | 'admin' | 'employee'

export interface OrgMember {
  id: string
  org_id: string
  persona_id: string
  rol: OrgMemberRol
  permisos: Record<string, boolean> | null
  created_at: Date
}

export type OrgContactTipo = 'cliente' | 'proveedor' | 'ambos'

export interface OrgContact {
  id: string
  org_id: string
  persona_id: string
  tipo: OrgContactTipo
  datos_extra: Record<string, unknown> | null
  credito_limite: number | null
  created_at: Date
}

export interface AuthCredential {
  id: string
  persona_id: string
  email: string
  password_hash: string | null
  provider: 'email' | 'google' | 'both'
  last_login: Date | null
  created_at: Date
}

export interface AuthSession {
  id: string
  credential_id: string
  token: string
  expires_at: Date
  org_id: string | null
  created_at: Date
}

// Join types for common queries
export interface PersonaWithOrgs extends Persona {
  organizations: Array<{
    org: Organization
    rol: OrgMemberRol
    permisos: Record<string, boolean> | null
  }>
}

export interface OrgContactWithPersona extends OrgContact {
  persona: Persona
}

export interface OrgMemberWithPersona extends OrgMember {
  persona: Persona
}
