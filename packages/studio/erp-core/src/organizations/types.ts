import type { Organization, OrgMember, OrgMemberRol, OrgContact, OrgContactTipo, OrgMemberWithPersona, OrgContactWithPersona } from '@locus/db'

export type { Organization, OrgMember, OrgMemberRol, OrgContact, OrgContactTipo, OrgMemberWithPersona, OrgContactWithPersona }

export interface CreateOrganization {
  slug: string
  nombre: string
  cuit?: string
  tipo?: string
  config?: Record<string, unknown>
}

export interface UpdateOrganization {
  slug?: string
  nombre?: string
  cuit?: string
  tipo?: string
  config?: Record<string, unknown>
}

export interface AddOrgMember {
  org_id: string
  persona_id: string
  rol: OrgMemberRol
  permisos?: Record<string, boolean>
}

export interface AddOrgContact {
  org_id: string
  persona_id: string
  tipo: OrgContactTipo
  datos_extra?: Record<string, unknown>
  credito_limite?: number
}
