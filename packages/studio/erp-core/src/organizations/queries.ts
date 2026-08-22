import { query } from '@locus/db'
import type { Organization, OrgMember, OrgContact, OrgMemberWithPersona, OrgContactWithPersona } from '@locus/db'
import type { CreateOrganization, UpdateOrganization, AddOrgMember, AddOrgContact } from './types'

// ==================== ORGANIZATIONS ====================

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const result = await query<Organization>(
    'SELECT * FROM organizations WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const result = await query<Organization>(
    'SELECT * FROM organizations WHERE slug = $1',
    [slug]
  )
  return result.rows[0] || null
}

export async function getAllOrganizations(): Promise<Organization[]> {
  const result = await query<Organization>('SELECT * FROM organizations ORDER BY nombre')
  return result.rows
}

export async function createOrganization(data: CreateOrganization): Promise<Organization> {
  const result = await query<Organization>(
    `INSERT INTO organizations (slug, nombre, cuit, tipo, config)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.slug, data.nombre, data.cuit || null, data.tipo || null, JSON.stringify(data.config || {})]
  )
  return result.rows[0]
}

export async function updateOrganization(id: string, data: UpdateOrganization): Promise<Organization | null> {
  const fields: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (data.slug !== undefined) {
    fields.push(`slug = $${paramIndex++}`)
    params.push(data.slug)
  }
  if (data.nombre !== undefined) {
    fields.push(`nombre = $${paramIndex++}`)
    params.push(data.nombre)
  }
  if (data.cuit !== undefined) {
    fields.push(`cuit = $${paramIndex++}`)
    params.push(data.cuit)
  }
  if (data.tipo !== undefined) {
    fields.push(`tipo = $${paramIndex++}`)
    params.push(data.tipo)
  }
  if (data.config !== undefined) {
    fields.push(`config = $${paramIndex++}`)
    params.push(JSON.stringify(data.config))
  }

  if (fields.length === 0) return getOrganizationById(id)

  params.push(id)

  const result = await query<Organization>(
    `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  )

  return result.rows[0] || null
}

// ==================== ORG MEMBERS ====================

export async function getOrgMembers(org_id: string): Promise<OrgMemberWithPersona[]> {
  const result = await query<OrgMemberWithPersona>(
    `SELECT om.*, p.nombre as persona_nombre, p.email as persona_email
     FROM org_members om
     JOIN personas p ON p.id = om.persona_id
     WHERE om.org_id = $1
     ORDER BY p.nombre`,
    [org_id]
  )
  return result.rows
}

export async function getOrgsByPersona(persona_id: string): Promise<Array<Organization & { rol: string }>> {
  const result = await query<Organization & { rol: string }>(
    `SELECT o.*, om.rol
     FROM organizations o
     JOIN org_members om ON om.org_id = o.id
     WHERE om.persona_id = $1
     ORDER BY o.nombre`,
    [persona_id]
  )
  return result.rows
}

export async function getOrgMember(org_id: string, persona_id: string): Promise<OrgMember | null> {
  const result = await query<OrgMember>(
    'SELECT * FROM org_members WHERE org_id = $1 AND persona_id = $2',
    [org_id, persona_id]
  )
  return result.rows[0] || null
}

export async function addOrgMember(data: AddOrgMember): Promise<OrgMember> {
  const result = await query<OrgMember>(
    `INSERT INTO org_members (org_id, persona_id, rol, permisos)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (org_id, persona_id) DO UPDATE SET rol = $3, permisos = $4
     RETURNING *`,
    [data.org_id, data.persona_id, data.rol, JSON.stringify(data.permisos || {})]
  )
  return result.rows[0]
}

export async function removeOrgMember(org_id: string, persona_id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM org_members WHERE org_id = $1 AND persona_id = $2',
    [org_id, persona_id]
  )
  return (result.rowCount ?? 0) > 0
}

// ==================== ORG CONTACTS ====================

export async function getOrgContacts(
  org_id: string,
  tipo?: string,
  search?: string,
  limit = 50,
  offset = 0
): Promise<OrgContactWithPersona[]> {
  const conditions = ['oc.org_id = $1']
  const params: unknown[] = [org_id]
  let paramIndex = 2

  if (tipo) {
    conditions.push(`oc.tipo = $${paramIndex++}`)
    params.push(tipo)
  }

  if (search) {
    conditions.push(`(p.nombre ILIKE $${paramIndex} OR p.email ILIKE $${paramIndex} OR p.documento_nro ILIKE $${paramIndex})`)
    params.push(`%${search}%`)
    paramIndex++
  }

  params.push(limit, offset)

  const result = await query<OrgContactWithPersona>(
    `SELECT oc.*, p.nombre as persona_nombre, p.email as persona_email, p.telefono as persona_telefono, p.documento_tipo, p.documento_nro
     FROM org_contacts oc
     JOIN personas p ON p.id = oc.persona_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.nombre
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  )

  return result.rows
}

export async function getOrgContact(org_id: string, persona_id: string): Promise<OrgContact | null> {
  const result = await query<OrgContact>(
    'SELECT * FROM org_contacts WHERE org_id = $1 AND persona_id = $2',
    [org_id, persona_id]
  )
  return result.rows[0] || null
}

export async function addOrgContact(data: AddOrgContact): Promise<OrgContact> {
  const result = await query<OrgContact>(
    `INSERT INTO org_contacts (org_id, persona_id, tipo, datos_extra, credito_limite)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (org_id, persona_id) DO UPDATE SET tipo = $3, datos_extra = $4, credito_limite = $5
     RETURNING *`,
    [data.org_id, data.persona_id, data.tipo, JSON.stringify(data.datos_extra || {}), data.credito_limite || null]
  )
  return result.rows[0]
}

export async function updateOrgContact(
  org_id: string,
  persona_id: string,
  data: Partial<AddOrgContact>
): Promise<OrgContact | null> {
  const fields: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (data.tipo !== undefined) {
    fields.push(`tipo = $${paramIndex++}`)
    params.push(data.tipo)
  }
  if (data.datos_extra !== undefined) {
    fields.push(`datos_extra = $${paramIndex++}`)
    params.push(JSON.stringify(data.datos_extra))
  }
  if (data.credito_limite !== undefined) {
    fields.push(`credito_limite = $${paramIndex++}`)
    params.push(data.credito_limite)
  }

  if (fields.length === 0) return getOrgContact(org_id, persona_id)

  params.push(org_id, persona_id)

  const result = await query<OrgContact>(
    `UPDATE org_contacts SET ${fields.join(', ')} WHERE org_id = $${paramIndex} AND persona_id = $${paramIndex + 1} RETURNING *`,
    params
  )

  return result.rows[0] || null
}

export async function removeOrgContact(org_id: string, persona_id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM org_contacts WHERE org_id = $1 AND persona_id = $2',
    [org_id, persona_id]
  )
  return (result.rowCount ?? 0) > 0
}
