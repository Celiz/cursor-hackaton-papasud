import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'vencimientos_criticos',
  type: 'query',
  description:
    'Vencimientos criticos: items vencidos o que vencen en los proximos 30 dias. Incluye lotes, registros ANMAT, documentos y calibraciones.',
  params: z.object({}),
  async execute(orgId): Promise<QueryResult> {
    const sql = `
      SELECT id, tipo, titulo, fecha_vencimiento, dias FROM (
        SELECT pl.id, 'Lote' as tipo,
          COALESCE(p.nombre, '') || ' - ' || pl.numero_lote as titulo,
          pl.fecha_vencimiento,
          (pl.fecha_vencimiento - CURRENT_DATE)::int as dias
        FROM productos_lotes pl
        JOIN productos p ON pl.producto_id = p.id
        WHERE p.org_id = $1
          AND pl.fecha_vencimiento IS NOT NULL
          AND pl.estado NOT IN ('agotado')

        UNION ALL

        SELECT rr.id, 'Registro' as tipo,
          COALESCE(rr.descripcion, rr.numero_registro) as titulo,
          rr.fecha_vencimiento,
          (rr.fecha_vencimiento - CURRENT_DATE)::int as dias
        FROM reg_registros rr
        WHERE rr.org_id = $1
          AND rr.fecha_vencimiento IS NOT NULL
          AND rr.estado IN ('vigente', 'en_tramite')

        UNION ALL

        SELECT rd.id, 'Documento' as tipo,
          rd.nombre as titulo,
          rd.fecha_vencimiento,
          (rd.fecha_vencimiento - CURRENT_DATE)::int as dias
        FROM reg_documentos rd
        WHERE rd.org_id = $1
          AND rd.fecha_vencimiento IS NOT NULL

        UNION ALL

        SELECT rte.id, 'Calibracion' as tipo,
          COALESCE(rte.observaciones, 'Equipo') as titulo,
          rte.proxima_fecha as fecha_vencimiento,
          (rte.proxima_fecha - CURRENT_DATE)::int as dias
        FROM reg_trazabilidad_equipos rte
        WHERE rte.org_id = $1
          AND rte.proxima_fecha IS NOT NULL
          AND rte.tipo_evento IN ('calibracion', 'mantenimiento_preventivo')
      ) sub
      WHERE dias <= 30
      ORDER BY dias ASC
    `

    const result = await query<{
      id: string
      tipo: string
      titulo: string
      fecha_vencimiento: string
      dias: number
    }>(sql, [orgId])

    if (result.rows.length === 0) {
      return {
        type: 'text',
        message: '\u2705 Sin vencimientos criticos en los proximos 30 dias.',
      }
    }

    const vencidos = result.rows.filter((r) => r.dias < 0)
    const porVencer = result.rows.filter((r) => r.dias >= 0)

    const formatItem = (r: (typeof result.rows)[0]) => {
      if (r.dias < 0) {
        return `  \u2022 ${r.tipo}: ${r.titulo} \u2014 vencido hace ${Math.abs(r.dias)} dia(s)`
      }
      if (r.dias === 0) {
        return `  \u2022 ${r.tipo}: ${r.titulo} \u2014 vence HOY`
      }
      return `  \u2022 ${r.tipo}: ${r.titulo} \u2014 vence en ${r.dias} dia(s)`
    }

    const sections: string[] = []

    if (vencidos.length > 0) {
      sections.push(
        `\uD83D\uDD34 VENCIDOS (${vencidos.length}):\n${vencidos.map(formatItem).join('\n')}`
      )
    }

    if (porVencer.length > 0) {
      sections.push(
        `\uD83D\uDFE0 Proximos a vencer (${porVencer.length}):\n${porVencer.map(formatItem).join('\n')}`
      )
    }

    return {
      type: 'text',
      message: `\u26A0\uFE0F ALERTA: ${result.rows.length} vencimiento(s) critico(s):\n\n${sections.join('\n\n')}`,
    }
  },
}

register(entry)
export default entry
