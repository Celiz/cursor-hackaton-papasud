import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'estado_campana',
  type: 'action',
  description:
    'Muestra el estado y progreso de campañas de email recientes o de una campaña específica.',
  params: z.object({
    campana: z.string().optional().describe('Nombre o ID (primeros 8 chars) de la campaña. Si no se pasa, muestra las recientes.'),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { campana } = params

    if (campana) {
      // Specific campaign
      const res = await query<{
        id: string
        nombre: string
        asunto: string
        estado: string
        total_destinatarios: string
        total_enviados: string
        total_fallidos: string
        total_pendientes: string
        total_abiertos: string
        total_bounces: string
        total_unsubs: string
        enviada_at: string | null
        completada_at: string | null
      }>(`
        SELECT
          id, nombre, asunto, estado,
          COALESCE(total_destinatarios, 0)::text AS total_destinatarios,
          COALESCE(total_enviados, 0)::text AS total_enviados,
          COALESCE(total_fallidos, 0)::text AS total_fallidos,
          COALESCE(total_pendientes, 0)::text AS total_pendientes,
          COALESCE(total_abiertos, 0)::text AS total_abiertos,
          COALESCE(total_bounces, 0)::text AS total_bounces,
          COALESCE(total_unsubs, 0)::text AS total_unsubs,
          enviada_at::text,
          completada_at::text
        FROM email_campanas
        WHERE org_id = $1
          AND (nombre ILIKE $2 OR id::text ILIKE $3)
        ORDER BY created_at DESC
        LIMIT 1
      `, [orgId, `%${campana}%`, `${campana.toLowerCase()}%`])

      if (res.rows.length === 0) {
        return { type: 'text', message: `No encontré campaña que matchee "${campana}".` }
      }

      const c = res.rows[0]
      const total = Number(c.total_destinatarios)
      const enviados = Number(c.total_enviados)
      const pct = total > 0 ? Math.round((enviados / total) * 100) : 0
      const aperturas = Number(c.total_abiertos)
      const pctApertura = enviados > 0 ? Math.round((aperturas / enviados) * 100) : 0

      const lines = [
        `**${c.nombre}**`,
        `Estado: ${c.estado}`,
        `Enviados: ${enviados}/${total} (${pct}%)`,
      ]
      if (Number(c.total_pendientes) > 0) lines.push(`Pendientes: ${c.total_pendientes}`)
      if (Number(c.total_fallidos) > 0) lines.push(`Fallidos: ${c.total_fallidos}`)
      if (aperturas > 0) lines.push(`Aperturas: ${aperturas} (${pctApertura}%)`)
      if (Number(c.total_bounces) > 0) lines.push(`Rebotes: ${c.total_bounces}`)
      if (Number(c.total_unsubs) > 0) lines.push(`Desuscripciones: ${c.total_unsubs}`)

      return { type: 'text', message: lines.join('\n') }
    }

    // List recent campaigns
    const res = await query<{
      nombre: string
      estado: string
      total_enviados: string
      total_destinatarios: string
      total_abiertos: string
      created_at: string
    }>(`
      SELECT
        nombre, estado,
        COALESCE(total_enviados, 0)::text AS total_enviados,
        COALESCE(total_destinatarios, 0)::text AS total_destinatarios,
        COALESCE(total_abiertos, 0)::text AS total_abiertos,
        created_at::date::text AS created_at
      FROM email_campanas
      WHERE org_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [orgId])

    if (res.rows.length === 0) {
      return { type: 'text', message: 'No hay campañas de email todavía.' }
    }

    const lines = res.rows.map(c => {
      const enviados = Number(c.total_enviados)
      const total = Number(c.total_destinatarios)
      const abiertos = Number(c.total_abiertos)
      const pctEnvio = total > 0 ? Math.round((enviados / total) * 100) : 0
      return `• **${c.nombre}** (${c.estado}) — ${enviados}/${total} env. (${pctEnvio}%), ${abiertos} aperturas — ${c.created_at}`
    })

    return {
      type: 'text',
      message: `Últimas campañas:\n\n${lines.join('\n')}`,
    }
  },
}

register(entry)
export default entry
