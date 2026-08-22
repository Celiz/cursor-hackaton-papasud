import type { SessionUser, OrgMemberRol } from '@locus/core/auth'
import type { Organization } from '@locus/db'

export type { OrgMemberRol }

// Extended session with required org fields for ERP context
export interface StudioSessionUser extends SessionUser {
  org_id: string
  org_slug: string
  org_nombre: string
  org_tipo: string
  rol: OrgMemberRol
  is_admin: boolean
  permisos: Record<string, boolean> | null
}

export interface StudioLoginResult {
  success: boolean
  user?: StudioSessionUser | SessionUser
  token?: string
  organizations?: Array<Organization & { rol: OrgMemberRol }>
  requiresOrgSelection?: boolean
  error?: string
}
