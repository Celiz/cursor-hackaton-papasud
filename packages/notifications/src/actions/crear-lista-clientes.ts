import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'
import { extractContact, extractEmail } from '../helpers'

const entry: CatalogEntry = {
  id: 'crear_lista_clientes',
  type: 'action',
  description:
    'Crea una lista de email marketing a partir de clientes filtrados por zona y/o equipo. Agrega automáticamente los contactos con email.',
  params: z.object({
    nombre_lista: z.string().describe('Nombre para la nueva lista'),
    localidad: z.string().optional().describe('Filtrar por localidad'),
    provincia: z.string().optional().describe('Filtrar por provincia'),
    equipo: z.string().optional().describe('Filtrar por tipo/marca/modelo de equipo'),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { nombre_lista, localidad, provincia, equipo } = params

    if (!localidad && !provincia && !equipo) {
      return { type: 'text', message: 'Necesito al menos un filtro: localidad, provincia o equipo.' }
    }

    // Build client query with filters
    const conditions: string[] = ['c.org_id = $1', "c.estado = 'Activo'"]
    const values: any[] = [orgId]
    let idx = 2

    if (localidad) {
      conditions.push(`c.localidad ILIKE $${idx}`)
      values.push(`%${localidad}%`)
      idx++
    }
    if (provincia) {
      conditions.push(`c.provincia ILIKE $${idx}`)
      values.push(`%${provincia}%`)
      idx++
    }

    let equipoJoin = ''
    if (equipo) {
      equipoJoin = `
        JOIN equipos_unidades eu ON eu.cliente_id = c.id AND eu.activo = true
        JOIN equipos e ON e.id = eu.equipo_id AND (
          e.marca ILIKE $${idx} OR e.modelo ILIKE $${idx} OR e.tipo ILIKE $${idx}
          OR CONCAT_WS(' ', e.marca, e.modelo) ILIKE $${idx}
        )`
      values.push(`%${equipo}%`)
      idx++
    }

    // Find clients with email
    const clientesRes = await query<{
      id: string
      nombre: string
      email: any
      telefono: any
      localidad: string | null
    }>(`
      SELECT DISTINCT c.id, c.nombre, c.email, c.telefono, c.localidad
      FROM clientes c
      ${equipoJoin}
      WHERE ${conditions.join(' AND ')}
        AND c.email IS NOT NULL
        AND c.email::text != '[]'
        AND c.email::text != 'null'
      ORDER BY c.nombre
    `, values)

    // Extract valid emails from JSONB
    const contactos: Array<{ nombre: string; email: string; telefono: string; clienteId: string }> = []
    for (const c of clientesRes.rows) {
      const email = extractEmail(c.email)
      if (email) {
        contactos.push({
          nombre: c.nombre,
          email,
          telefono: extractContact(c.telefono),
          clienteId: c.id,
        })
      }
    }

    if (contactos.length === 0) {
      const filtros = [localidad, provincia, equipo].filter(Boolean).join(', ')
      return { type: 'text', message: `No encontré clientes con email para los filtros: ${filtros}` }
    }

    // Create the list
    const listaRes = await query<{ id: string }>(`
      INSERT INTO email_listas (org_id, nombre, descripcion, tipo, activa, total_contactos)
      VALUES ($1, $2, $3, 'manual', true, $4)
      RETURNING id
    `, [orgId, nombre_lista, `Creada desde Telegram: ${[localidad, provincia, equipo].filter(Boolean).join(', ')}`, contactos.length])

    const listaId = listaRes.rows[0].id

    // Add contacts to the list
    for (const c of contactos) {
      await query(`
        INSERT INTO email_contactos (lista_id, email, nombre, empresa, telefono, estado)
        VALUES ($1, $2, $3, $4, $5, 'activo')
        ON CONFLICT DO NOTHING
      `, [listaId, c.email, c.nombre, c.nombre, c.telefono])
    }

    return {
      type: 'text',
      message: `Lista "${nombre_lista}" creada con ${contactos.length} contacto(s).\nID: ${listaId.slice(0, 8)}\n\nPodés mandar una campaña con: "mandá un email a la lista ${nombre_lista}"`,
    }
  },
}

register(entry)
export default entry
