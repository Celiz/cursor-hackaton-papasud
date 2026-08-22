import { query, getClient } from '@locus/db'
import type { Animal, AnimalConDueno, CreateAnimal, UpdateAnimal, AnimalFilters } from './types'

export async function getAnimales(
  orgId: string,
  filters: AnimalFilters = {}
): Promise<{ animales: AnimalConDueno[]; total: number }> {
  const conditions: string[] = ['oe.org_id = $1', "e.tipo = 'animal'"]
  const params: unknown[] = [orgId]
  let idx = 2

  if (filters.especie) {
    conditions.push(`a.especie = $${idx++}`)
    params.push(filters.especie)
  }
  if (filters.activo !== undefined) {
    conditions.push(`a.activo = $${idx++}`)
    params.push(filters.activo)
  }
  if (filters.contacto_id) {
    conditions.push(`oc.id = $${idx++}`)
    params.push(filters.contacto_id)
  }
  if (filters.search) {
    conditions.push(`(e.nombre_display ILIKE $${idx} OR a.raza ILIKE $${idx})`)
    params.push(`%${filters.search}%`)
    idx++
  }

  const where = conditions.join(' AND ')
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const [dataResult, countResult] = await Promise.all([
    query<AnimalConDueno>(
      `SELECT a.*, e.nombre_display as nombre,
              p.nombre as contacto_nombre, p.telefono as contacto_telefono, oc.id as contacto_id
       FROM animales a
       JOIN entidades e ON e.id = a.entidad_id
       JOIN org_entidades oe ON oe.entidad_id = e.id
       LEFT JOIN entidad_relaciones er ON er.entidad_b_id = e.id AND er.tipo = 'tutor' AND er.activo = true
       LEFT JOIN entidades e_tutor ON e_tutor.id = er.entidad_a_id
       LEFT JOIN personas p ON p.entidad_id = e_tutor.id
       LEFT JOIN org_contacts oc ON oc.persona_id = p.id AND oc.org_id = $1
       WHERE ${where}
       ORDER BY e.nombre_display ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM animales a
       JOIN entidades e ON e.id = a.entidad_id
       JOIN org_entidades oe ON oe.entidad_id = e.id
       LEFT JOIN entidad_relaciones er ON er.entidad_b_id = e.id AND er.tipo = 'tutor' AND er.activo = true
       LEFT JOIN entidades e_tutor ON e_tutor.id = er.entidad_a_id
       LEFT JOIN personas p ON p.entidad_id = e_tutor.id
       LEFT JOIN org_contacts oc ON oc.persona_id = p.id AND oc.org_id = $1
       WHERE ${where}`,
      params
    ),
  ])

  return {
    animales: dataResult.rows,
    total: parseInt(countResult.rows[0]?.count || '0'),
  }
}

export async function getAnimal(orgId: string, entidadId: string): Promise<AnimalConDueno | null> {
  const result = await query<AnimalConDueno>(
    `SELECT a.*, e.nombre_display as nombre,
            p.nombre as contacto_nombre, p.telefono as contacto_telefono, oc.id as contacto_id
     FROM animales a
     JOIN entidades e ON e.id = a.entidad_id
     JOIN org_entidades oe ON oe.entidad_id = e.id AND oe.org_id = $1
     LEFT JOIN entidad_relaciones er ON er.entidad_b_id = e.id AND er.tipo = 'tutor' AND er.activo = true
     LEFT JOIN entidades e_tutor ON e_tutor.id = er.entidad_a_id
     LEFT JOIN personas p ON p.entidad_id = e_tutor.id
     LEFT JOIN org_contacts oc ON oc.persona_id = p.id AND oc.org_id = $1
     WHERE a.entidad_id = $2`,
    [orgId, entidadId]
  )
  return result.rows[0] || null
}

export async function getAnimalesByContacto(orgId: string, contactoId: string): Promise<AnimalConDueno[]> {
  const result = await query<AnimalConDueno>(
    `SELECT a.*, e.nombre_display as nombre,
            p.nombre as contacto_nombre, p.telefono as contacto_telefono, oc.id as contacto_id
     FROM animales a
     JOIN entidades e ON e.id = a.entidad_id
     JOIN org_entidades oe ON oe.entidad_id = e.id AND oe.org_id = $1
     JOIN entidad_relaciones er ON er.entidad_b_id = e.id AND er.tipo = 'tutor' AND er.activo = true
     JOIN entidades e_tutor ON e_tutor.id = er.entidad_a_id
     JOIN personas p ON p.entidad_id = e_tutor.id
     JOIN org_contacts oc ON oc.persona_id = p.id AND oc.id = $2
     WHERE a.activo = true
     ORDER BY e.nombre_display`,
    [orgId, contactoId]
  )
  return result.rows
}

export async function createAnimal(
  data: CreateAnimal,
  orgId: string,
  tutorPersonaId?: string
): Promise<Animal & { entidad_id: string }> {
  const client = await getClient()
  try {
    await client.query('BEGIN')

    // 1. Create entidad
    const entidadResult = await client.query(
      `INSERT INTO entidades (tipo, nombre_display) VALUES ('animal', $1) RETURNING id`,
      [data.nombre]
    )
    const entidadId = entidadResult.rows[0].id

    // 2. Create animal
    const animalResult = await client.query(
      `INSERT INTO animales (entidad_id, especie, raza, sexo, fecha_nacimiento, peso, color, numero_chip, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        entidadId,
        data.especie || 'canino',
        data.raza || null,
        data.sexo || 'desconocido',
        data.fecha_nacimiento || null,
        data.peso || null,
        data.color || null,
        data.numero_chip || null,
        data.observaciones || null,
      ]
    )

    // 3. Link to org
    await client.query(
      `INSERT INTO org_entidades (org_id, entidad_id, tipo) VALUES ($1, $2, 'paciente')
       ON CONFLICT (org_id, entidad_id) DO NOTHING`,
      [orgId, entidadId]
    )

    // 4. Link tutor if provided
    if (tutorPersonaId) {
      const personaEntidad = await client.query(
        `SELECT entidad_id FROM personas WHERE id = $1`,
        [tutorPersonaId]
      )
      if (personaEntidad.rows[0]?.entidad_id) {
        await client.query(
          `INSERT INTO entidad_relaciones (entidad_a_id, entidad_b_id, tipo)
           VALUES ($1, $2, 'tutor')
           ON CONFLICT (entidad_a_id, entidad_b_id, tipo) DO NOTHING`,
          [personaEntidad.rows[0].entidad_id, entidadId]
        )
      }
    }

    await client.query('COMMIT')
    return { ...animalResult.rows[0], nombre: data.nombre }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateAnimal(orgId: string, entidadId: string, data: UpdateAnimal): Promise<Animal | null> {
  const sets: string[] = []
  const params: unknown[] = [entidadId]
  let idx = 2

  if (data.especie !== undefined) { sets.push(`especie = $${idx++}`); params.push(data.especie) }
  if (data.raza !== undefined) { sets.push(`raza = $${idx++}`); params.push(data.raza) }
  if (data.sexo !== undefined) { sets.push(`sexo = $${idx++}`); params.push(data.sexo) }
  if (data.fecha_nacimiento !== undefined) { sets.push(`fecha_nacimiento = $${idx++}`); params.push(data.fecha_nacimiento) }
  if (data.peso !== undefined) { sets.push(`peso = $${idx++}`); params.push(data.peso) }
  if (data.color !== undefined) { sets.push(`color = $${idx++}`); params.push(data.color) }
  if (data.numero_chip !== undefined) { sets.push(`numero_chip = $${idx++}`); params.push(data.numero_chip) }
  if (data.observaciones !== undefined) { sets.push(`observaciones = $${idx++}`); params.push(data.observaciones) }
  if (data.activo !== undefined) { sets.push(`activo = $${idx++}`); params.push(data.activo) }

  const needsNameUpdate = !!data.nombre
  const needsAnimalUpdate = sets.length > 0

  // Use a transaction when both updates are needed
  if (needsNameUpdate && needsAnimalUpdate) {
    const client = await getClient()
    try {
      await client.query('BEGIN')

      await client.query(
        `UPDATE entidades SET nombre_display = $1, updated_at = NOW()
         WHERE id = $2
           AND EXISTS (SELECT 1 FROM org_entidades WHERE entidad_id = $2 AND org_id = $3)`,
        [data.nombre, entidadId, orgId]
      )

      sets.push('updated_at = NOW()')
      const orgParamIdx = idx++
      params.push(orgId)

      const result = await client.query(
        `UPDATE animales SET ${sets.join(', ')}
         WHERE entidad_id = $1
           AND EXISTS (SELECT 1 FROM org_entidades WHERE entidad_id = $1 AND org_id = $${orgParamIdx})
         RETURNING *`,
        params
      )

      await client.query('COMMIT')
      return result.rows[0] || null
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  if (needsNameUpdate) {
    await query(
      `UPDATE entidades SET nombre_display = $1, updated_at = NOW()
       WHERE id = $2
         AND EXISTS (SELECT 1 FROM org_entidades WHERE entidad_id = $2 AND org_id = $3)`,
      [data.nombre, entidadId, orgId]
    )
  }

  if (!needsAnimalUpdate) return getAnimal(orgId, entidadId) as Promise<Animal | null>

  sets.push('updated_at = NOW()')
  const orgParamIdx = idx++
  params.push(orgId)

  const result = await query<Animal>(
    `UPDATE animales SET ${sets.join(', ')}
     WHERE entidad_id = $1
       AND EXISTS (SELECT 1 FROM org_entidades WHERE entidad_id = $1 AND org_id = $${orgParamIdx})
     RETURNING *`,
    params
  )
  return result.rows[0] || null
}
