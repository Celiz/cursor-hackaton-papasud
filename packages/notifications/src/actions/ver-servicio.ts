import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'ver_servicio',
  type: 'action',
  description:
    'Ver detalle de un servicio técnico / orden de servicio. Param opcional: servicio_id (si no se pasa, muestra el último).',
  params: z.object({
    servicio_id: z.string().optional(),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    let servicioId = params.servicio_id

    // If no ID provided, get the most recent one
    if (!servicioId) {
      const latest = await query<{ id: string }>(
        `SELECT id FROM servicios WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [orgId]
      )
      if (latest.rows.length === 0) {
        return { type: 'text', message: 'No hay servicios registrados.' }
      }
      servicioId = latest.rows[0].id
    }

    // Support short IDs (first 8 chars) — resolve to full UUID
    if (servicioId.length < 36) {
      const match = await query<{ id: string }>(
        `SELECT id FROM servicios WHERE org_id = $1 AND id::text ILIKE $2 LIMIT 1`,
        [orgId, servicioId.toLowerCase() + '%']
      )
      if (match.rows.length === 0) {
        return { type: 'text', message: `No encontré servicio con ID ${servicioId}.` }
      }
      servicioId = match.rows[0].id
    }

    // Use s.* to avoid column-not-found errors if schema differs
    const result = await query<Record<string, any>>(`
      SELECT
        s.*,
        c.nombre AS cliente_nombre,
        c.telefono::text AS cliente_telefono,
        e.marca AS equipo_marca,
        e.modelo AS equipo_modelo,
        eu.numero_serie
      FROM servicios s
      LEFT JOIN clientes c ON c.id = s.cliente_id
      LEFT JOIN equipos_unidades eu ON eu.id = s.equipo_id
      LEFT JOIN equipos e ON e.id = eu.equipo_id
      WHERE s.id = $1 AND s.org_id = $2
    `, [servicioId, orgId])

    if (result.rows.length === 0) {
      return { type: 'text', message: 'Servicio no encontrado.' }
    }

    const s = result.rows[0]
    const shortId = s.id.slice(0, 8).toUpperCase()
    const fecha = s.fecha
      ? new Date(s.fecha).toLocaleDateString('es-AR')
      : new Date(s.created_at).toLocaleDateString('es-AR')
    const equipo = [s.equipo_marca, s.equipo_modelo].filter(Boolean).join(' ') || '-'
    const costoTotal = Number(s.costo_total || 0)

    const lines = [
      `Orden de Servicio #${shortId}`,
      `Fecha: ${fecha} | Estado: ${s.estado}`,
      '',
      `Cliente: ${s.cliente_nombre || '-'}`,
      s.cliente_telefono ? `Tel: ${s.cliente_telefono}` : null,
      `Equipo: ${equipo}`,
      s.numero_serie ? `N/S: ${s.numero_serie}` : null,
      s.tecnico ? `Tecnico: ${s.tecnico}` : null,
      s.tipo_servicio ? `Tipo: ${s.tipo_servicio}` : null,
      '',
      s.falla_declarada ? `Falla: ${s.falla_declarada}` : null,
      s.diagnostico ? `Diagnostico: ${s.diagnostico}` : null,
      '',
      costoTotal > 0 ? `Total: $${costoTotal.toLocaleString('es-AR')}` : null,
      s.estado_contable ? `Estado contable: ${s.estado_contable}` : null,
    ]
      .filter((l) => l !== null)
      .join('\n')

    return { type: 'text', message: lines }
  },
}

register(entry)
export default entry
