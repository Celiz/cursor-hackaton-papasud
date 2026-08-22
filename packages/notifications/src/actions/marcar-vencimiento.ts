import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, ActionResult } from '../types'

const ESTADOS_VALIDOS = [
  'detectado',
  'notificado',
  'ofrecido',
  'vendido',
  'retirado',
  'renovado',
] as const

const entry: CatalogEntry = {
  id: 'marcar_vencimiento',
  type: 'action',
  description:
    'Actualizar el estado de un seguimiento de vencimiento. Params: seguimiento_id (8 chars minimo), nuevo_estado (detectado|notificado|ofrecido|vendido|retirado|renovado), notas (opcional).',
  params: z.object({
    seguimiento_id: z.string().min(8),
    nuevo_estado: z.enum(ESTADOS_VALIDOS),
    notas: z.string().optional(),
  }),
  async execute(orgId, params): Promise<ActionResult> {
    const { seguimiento_id, nuevo_estado, notas } = params

    // Find seguimiento by ID prefix (short ID match)
    const prefix = seguimiento_id.toLowerCase()
    const findSql = `
      SELECT id, estado
      FROM reg_vencimiento_seguimientos
      WHERE org_id = $1
        AND id::text LIKE $2 || '%'
      LIMIT 1
    `
    const found = await query<{ id: string; estado: string }>(findSql, [
      orgId,
      prefix,
    ])

    if (found.rows.length === 0) {
      return {
        type: 'text',
        message: `No se encontro un seguimiento con ID "${seguimiento_id.substring(0, 8).toUpperCase()}".`,
      }
    }

    const seg = found.rows[0]

    // Update estado
    const updateSql = `
      UPDATE reg_vencimiento_seguimientos
      SET estado = $2,
          notas = COALESCE($3, notas),
          updated_at = now()
      WHERE id = $1 AND org_id = $4
      RETURNING id, estado
    `
    const updated = await query<{ id: string; estado: string }>(updateSql, [
      seg.id,
      nuevo_estado,
      notas ?? null,
      orgId,
    ])

    if (updated.rows.length === 0) {
      return {
        type: 'text',
        message: 'Error al actualizar el seguimiento.',
      }
    }

    const shortId = seg.id.substring(0, 8).toUpperCase()
    const notasMsg = notas ? `\nNotas: ${notas}` : ''

    return {
      type: 'text',
      message: `\u2705 Vencimiento ${shortId} actualizado: ${seg.estado} \u2192 "${nuevo_estado}"${notasMsg}`,
    }
  },
}

register(entry)
export default entry
