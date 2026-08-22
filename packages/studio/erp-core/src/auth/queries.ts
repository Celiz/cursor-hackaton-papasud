import { query } from '@locus/db'
import type { Organization, OrgMember, OrgMemberRol, Persona } from '@locus/db'
import { loginBase, signToken, getSessionUser } from '@locus/core/auth'
import type { SessionUser } from '@locus/core/auth'
import type { StudioLoginResult } from './types'

/**
 * ERP login — verifies credentials via loginBase, then resolves org membership.
 * Preserves the exact same behavior as the original @locus/core login():
 * - No orgs → token without org
 * - Single org → auto-select
 * - Multiple orgs → requiresOrgSelection
 */
export async function login(email: string, password: string): Promise<StudioLoginResult> {
  // 1. Verify credentials (base)
  const base = await loginBase(email, password)
  if (!base.success || !base.persona_id) {
    return { success: false, error: base.error }
  }

  const { persona_id, email: personaEmail, nombre } = base

  // 2. Get organizations for this persona
  const orgsResult = await query<Organization & { rol: OrgMemberRol }>(
    `SELECT o.*, om.rol
     FROM organizations o
     JOIN org_members om ON om.org_id = o.id
     WHERE om.persona_id = $1
     ORDER BY o.nombre`,
    [persona_id]
  )
  const organizations = orgsResult.rows

  // 3. No orgs — return user without org
  if (organizations.length === 0) {
    const token = await signToken({
      sub: persona_id,
      persona_id,
      email: personaEmail!,
      nombre: nombre!,
      org_id: null,
      rol: null,
    })

    return {
      success: true,
      user: {
        persona_id,
        email: personaEmail!,
        nombre: nombre!,
        org_id: null,
        org_slug: null,
        org_nombre: null,
        rol: null,
        permisos: null,
      },
      token,
    }
  }

  // 4. Single org — auto-select
  if (organizations.length === 1) {
    const org = organizations[0]
    const memberResult = await query<OrgMember>(
      'SELECT * FROM org_members WHERE org_id = $1 AND persona_id = $2',
      [org.id, persona_id]
    )
    const member = memberResult.rows[0]

    const token = await signToken({
      sub: persona_id,
      persona_id,
      email: personaEmail!,
      nombre: nombre!,
      org_id: org.id,
      rol: org.rol,
    })

    return {
      success: true,
      user: {
        persona_id,
        email: personaEmail!,
        nombre: nombre!,
        org_id: org.id,
        org_slug: org.slug,
        org_nombre: org.nombre,
        org_tipo: org.tipo,
        rol: org.rol,
        is_admin: org.rol === 'owner' || org.rol === 'admin',
        permisos: member?.permisos || null,
      },
      token,
    }
  }

  // 5. Multiple orgs — require selection
  return {
    success: true,
    requiresOrgSelection: true,
    organizations,
    user: {
      persona_id,
      email: personaEmail!,
      nombre: nombre!,
      org_id: null,
      org_slug: null,
      org_nombre: null,
      rol: null,
      permisos: null,
    },
  }
}

/**
 * Select org after login — verifies membership and creates JWT with org context.
 * Preserves the exact same behavior as the original @locus/core selectOrg().
 */
export async function selectOrg(persona_id: string, org_id: string): Promise<StudioLoginResult> {
  // 1. Verify membership
  const memberResult = await query<OrgMember & { org_slug: string; org_nombre: string; org_tipo: string }>(
    `SELECT om.*, o.slug as org_slug, o.nombre as org_nombre, o.tipo as org_tipo
     FROM org_members om
     JOIN organizations o ON o.id = om.org_id
     WHERE om.org_id = $1 AND om.persona_id = $2`,
    [org_id, persona_id]
  )
  const member = memberResult.rows[0]

  if (!member) {
    return { success: false, error: 'No tenés acceso a esta organización' }
  }

  // 2. Get persona
  const personaResult = await query<Persona>(
    'SELECT * FROM personas WHERE id = $1',
    [persona_id]
  )
  const persona = personaResult.rows[0]

  // 3. Generate token with org
  const token = await signToken({
    sub: persona_id,
    persona_id,
    email: persona.email!,
    nombre: persona.nombre,
    org_id,
    rol: member.rol,
  })

  return {
    success: true,
    user: {
      persona_id,
      email: persona.email!,
      nombre: persona.nombre,
      org_id,
      org_slug: member.org_slug,
      org_nombre: member.org_nombre,
      org_tipo: member.org_tipo,
      rol: member.rol,
      is_admin: member.rol === 'owner' || member.rol === 'admin',
      permisos: member.permisos,
    },
    token,
  }
}
