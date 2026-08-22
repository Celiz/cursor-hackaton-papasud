import { query } from '@locus/db'
import type { Persona, PersonaWithOrgs } from '@locus/db'
import type { CreatePersona, UpdatePersona, PersonaFilters } from './types'

export async function getPersonaById(id: string): Promise<Persona | null> {
  const result = await query<Persona>(
    'SELECT * FROM personas WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function getPersonaByEmail(email: string): Promise<Persona | null> {
  const result = await query<Persona>(
    'SELECT * FROM personas WHERE email = $1',
    [email]
  )
  return result.rows[0] || null
}

export async function getPersonaByDocumento(documento_nro: string): Promise<Persona | null> {
  const result = await query<Persona>(
    'SELECT * FROM personas WHERE documento_nro = $1',
    [documento_nro]
  )
  return result.rows[0] || null
}

export async function getPersonaWithOrgs(id: string): Promise<PersonaWithOrgs | null> {
  const result = await query<PersonaWithOrgs>(
    'SELECT * FROM personas_with_orgs WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function searchPersonas(
  filters: PersonaFilters,
  limit = 50,
  offset = 0
): Promise<Persona[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (filters.search) {
    conditions.push(`(nombre ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR documento_nro ILIKE $${paramIndex})`)
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.documento_nro) {
    conditions.push(`documento_nro = $${paramIndex}`)
    params.push(filters.documento_nro)
    paramIndex++
  }

  if (filters.email) {
    conditions.push(`email = $${paramIndex}`)
    params.push(filters.email)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  params.push(limit, offset)

  const result = await query<Persona>(
    `SELECT * FROM personas ${whereClause} ORDER BY nombre LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  )

  return result.rows
}

export async function createPersona(data: CreatePersona): Promise<Persona> {
  const result = await query<Persona>(
    `INSERT INTO personas (documento_tipo, documento_nro, nombre, email, telefono, fecha_nacimiento)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.documento_tipo || null,
      data.documento_nro || null,
      data.nombre,
      data.email || null,
      data.telefono || null,
      data.fecha_nacimiento || null,
    ]
  )
  return result.rows[0]
}

export async function updatePersona(id: string, data: UpdatePersona): Promise<Persona | null> {
  const fields: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (data.documento_tipo !== undefined) {
    fields.push(`documento_tipo = $${paramIndex++}`)
    params.push(data.documento_tipo)
  }
  if (data.documento_nro !== undefined) {
    fields.push(`documento_nro = $${paramIndex++}`)
    params.push(data.documento_nro)
  }
  if (data.nombre !== undefined) {
    fields.push(`nombre = $${paramIndex++}`)
    params.push(data.nombre)
  }
  if (data.email !== undefined) {
    fields.push(`email = $${paramIndex++}`)
    params.push(data.email)
  }
  if (data.telefono !== undefined) {
    fields.push(`telefono = $${paramIndex++}`)
    params.push(data.telefono)
  }
  if (data.fecha_nacimiento !== undefined) {
    fields.push(`fecha_nacimiento = $${paramIndex++}`)
    params.push(data.fecha_nacimiento)
  }
  if (data.bio !== undefined) {
    fields.push(`bio = $${paramIndex++}`)
    params.push(data.bio)
  }
  if (data.que_construyo !== undefined) {
    fields.push(`que_construyo = $${paramIndex++}`)
    params.push(data.que_construyo)
  }
  if (data.etapa !== undefined) {
    fields.push(`etapa = $${paramIndex++}`)
    params.push(data.etapa)
  }
  if (data.busco !== undefined) {
    fields.push(`busco = $${paramIndex++}`)
    params.push(data.busco)
  }
  if (data.tags !== undefined) {
    fields.push(`tags = $${paramIndex++}`)
    params.push(data.tags)
  }
  if (data.linkedin_url !== undefined) {
    fields.push(`linkedin_url = $${paramIndex++}`)
    params.push(data.linkedin_url)
  }
  if (data.instagram !== undefined) {
    fields.push(`instagram = $${paramIndex++}`)
    params.push(data.instagram)
  }
  if (data.website !== undefined) {
    fields.push(`website = $${paramIndex++}`)
    params.push(data.website)
  }

  if (fields.length === 0) return getPersonaById(id)

  params.push(id)

  const result = await query<Persona>(
    `UPDATE personas SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  )

  return result.rows[0] || null
}

export async function deletePersona(id: string): Promise<boolean> {
  const result = await query('DELETE FROM personas WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}

// Find or create persona by documento or email
export async function findOrCreatePersona(data: CreatePersona): Promise<Persona> {
  // Try to find by documento first
  if (data.documento_nro) {
    const existing = await getPersonaByDocumento(data.documento_nro)
    if (existing) return existing
  }

  // Then by email
  if (data.email) {
    const existing = await getPersonaByEmail(data.email)
    if (existing) return existing
  }

  // Create new
  return createPersona(data)
}
