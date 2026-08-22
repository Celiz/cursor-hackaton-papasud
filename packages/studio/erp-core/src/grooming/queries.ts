import { query } from '@locus/db'
import type {
  ServicioGrooming,
  ServicioGroomingConDetalles,
  CreateServicioGrooming,
  UpdateServicioGrooming,
  ServicioGroomingFilters,
} from './types'

export async function getServiciosGrooming(
  orgId: string,
  filters: ServicioGroomingFilters = {}
): Promise<{ servicios: ServicioGroomingConDetalles[]; total: number }> {
  const conditions: string[] = ['sg.org_id = $1']
  const params: unknown[] = [orgId]
  let idx = 2

  if (filters.estado) {
    conditions.push(`sg.estado = $${idx++}`)
    params.push(filters.estado)
  }
  if (filters.tipo_servicio) {
    conditions.push(`sg.tipo_servicio = $${idx++}`)
    params.push(filters.tipo_servicio)
  }
  if (filters.animal_id) {
    conditions.push(`sg.animal_id = $${idx++}`)
    params.push(filters.animal_id)
  }
  if (filters.contacto_id) {
    conditions.push(`sg.contacto_id = $${idx++}`)
    params.push(filters.contacto_id)
  }
  if (filters.fecha_desde) {
    conditions.push(`sg.created_at >= $${idx++}`)
    params.push(filters.fecha_desde)
  }
  if (filters.fecha_hasta) {
    conditions.push(`sg.created_at <= $${idx++}`)
    params.push(filters.fecha_hasta + ' 23:59:59')
  }

  const where = conditions.join(' AND ')
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const [dataResult, countResult] = await Promise.all([
    query<ServicioGroomingConDetalles>(
      `SELECT sg.*,
              e_animal.nombre_display as mascota_nombre, a.especie as mascota_especie, a.raza as mascota_raza,
              p.nombre as contacto_nombre, p.telefono as contacto_telefono
       FROM servicios_grooming sg
       JOIN entidades e_animal ON e_animal.id = sg.animal_id
       JOIN animales a ON a.entidad_id = e_animal.id
       JOIN org_contacts oc ON oc.id = sg.contacto_id
       JOIN personas p ON p.id = oc.persona_id
       WHERE ${where}
       ORDER BY sg.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM servicios_grooming sg WHERE ${where}`,
      params
    ),
  ])

  return {
    servicios: dataResult.rows,
    total: parseInt(countResult.rows[0]?.count || '0'),
  }
}

export async function getServicioGrooming(orgId: string, id: string): Promise<ServicioGroomingConDetalles | null> {
  const result = await query<ServicioGroomingConDetalles>(
    `SELECT sg.*,
            e_animal.nombre_display as mascota_nombre, a.especie as mascota_especie, a.raza as mascota_raza,
            p.nombre as contacto_nombre, p.telefono as contacto_telefono
     FROM servicios_grooming sg
     JOIN entidades e_animal ON e_animal.id = sg.animal_id
     JOIN animales a ON a.entidad_id = e_animal.id
     JOIN org_contacts oc ON oc.id = sg.contacto_id
     JOIN personas p ON p.id = oc.persona_id
     WHERE sg.org_id = $1 AND sg.id = $2`,
    [orgId, id]
  )
  return result.rows[0] || null
}

export async function createServicioGrooming(data: CreateServicioGrooming): Promise<ServicioGrooming> {
  const result = await query<ServicioGrooming>(
    `INSERT INTO servicios_grooming (org_id, turno_id, animal_id, contacto_id, tipo_servicio, precio, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.org_id,
      data.turno_id || null,
      data.animal_id,
      data.contacto_id,
      data.tipo_servicio,
      data.precio || null,
      data.notas || null,
    ]
  )
  return result.rows[0]
}

export async function updateServicioGrooming(
  orgId: string,
  id: string,
  data: UpdateServicioGrooming
): Promise<ServicioGrooming | null> {
  const sets: string[] = []
  const params: unknown[] = [orgId, id]
  let idx = 3

  if (data.tipo_servicio !== undefined) { sets.push(`tipo_servicio = $${idx++}`); params.push(data.tipo_servicio) }
  if (data.precio !== undefined) { sets.push(`precio = $${idx++}`); params.push(data.precio) }
  if (data.notas !== undefined) { sets.push(`notas = $${idx++}`); params.push(data.notas) }
  if (data.estado !== undefined) { sets.push(`estado = $${idx++}`); params.push(data.estado) }

  if (sets.length === 0) return null

  sets.push('updated_at = NOW()')

  const result = await query<ServicioGrooming>(
    `UPDATE servicios_grooming SET ${sets.join(', ')} WHERE org_id = $1 AND id = $2 RETURNING *`,
    params
  )
  return result.rows[0] || null
}

export async function getHistorialAnimal(orgId: string, animalId: string): Promise<ServicioGroomingConDetalles[]> {
  const result = await query<ServicioGroomingConDetalles>(
    `SELECT sg.*,
            e_animal.nombre_display as mascota_nombre, a.especie as mascota_especie, a.raza as mascota_raza,
            p.nombre as contacto_nombre, p.telefono as contacto_telefono
     FROM servicios_grooming sg
     JOIN entidades e_animal ON e_animal.id = sg.animal_id
     JOIN animales a ON a.entidad_id = e_animal.id
     JOIN org_contacts oc ON oc.id = sg.contacto_id
     JOIN personas p ON p.id = oc.persona_id
     WHERE sg.org_id = $1 AND sg.animal_id = $2
     ORDER BY sg.created_at DESC`,
    [orgId, animalId]
  )
  return result.rows
}
