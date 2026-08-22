import { query } from '@locus/db'

export interface ClienteZona {
  id: string
  nombre: string
  localidad: string | null
  provincia: string | null
  direccion: string | null
  telefono: any
  email: any
  equipos_count: number
  equipos_detalle: string | null
}

/**
 * Query active clients in a geographic zone with their equipment.
 * Accepts either a unified `zona` (searches both localidad and provincia)
 * or separate `localidad`/`provincia` filters.
 */
export async function queryClientesZona(
  orgId: string,
  opts: { zona?: string; localidad?: string; provincia?: string }
): Promise<ClienteZona[]> {
  const conditions: string[] = ['c.org_id = $1', "c.estado = 'Activo'"]
  const values: any[] = [orgId]
  let idx = 2

  if (opts.zona) {
    conditions.push(`(c.localidad ILIKE $${idx} OR c.provincia ILIKE $${idx})`)
    values.push(`%${opts.zona}%`)
    idx++
  } else {
    if (opts.localidad) {
      conditions.push(`c.localidad ILIKE $${idx}`)
      values.push(`%${opts.localidad}%`)
      idx++
    }
    if (opts.provincia) {
      conditions.push(`c.provincia ILIKE $${idx}`)
      values.push(`%${opts.provincia}%`)
      idx++
    }
  }

  if (conditions.length === 2) {
    return []
  }

  const result = await query<{
    id: string
    nombre: string
    localidad: string | null
    provincia: string | null
    direccion: string | null
    telefono: any
    email: any
    equipos_count: string
    equipos_detalle: string | null
  }>(`
    SELECT
      c.id,
      c.nombre,
      c.localidad,
      c.provincia,
      c.direccion,
      c.telefono,
      c.email,
      COUNT(eu.id)::text AS equipos_count,
      STRING_AGG(DISTINCT CONCAT_WS(' ', e.marca, e.modelo), ', ' ORDER BY CONCAT_WS(' ', e.marca, e.modelo)) AS equipos_detalle
    FROM clientes c
    LEFT JOIN equipos_unidades eu ON eu.cliente_id = c.id AND eu.activo = true
    LEFT JOIN equipos e ON e.id = eu.equipo_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY c.id, c.nombre, c.localidad, c.provincia, c.direccion, c.telefono, c.email
    ORDER BY c.nombre
    LIMIT 30
  `, values)

  return result.rows.map(r => ({
    ...r,
    equipos_count: Number(r.equipos_count),
  }))
}
