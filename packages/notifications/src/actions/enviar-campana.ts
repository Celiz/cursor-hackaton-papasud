import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'enviar_campana',
  type: 'action',
  description:
    'Crea y envía una campaña de email a una lista existente. Necesita el nombre de la lista, el asunto y el texto del email.',
  params: z.object({
    lista: z.string().describe('Nombre o ID (primeros 8 chars) de la lista'),
    asunto: z.string().describe('Asunto del email'),
    cuerpo: z.string().describe('Texto del email (se envía como HTML simple)'),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { lista, asunto, cuerpo } = params

    // Find the list by name or short ID
    const listaRes = await query<{ id: string; nombre: string; total_contactos: string }>(`
      SELECT id, nombre, COALESCE(total_contactos, 0)::text AS total_contactos
      FROM email_listas
      WHERE org_id = $1
        AND activa = true
        AND (nombre ILIKE $2 OR id::text ILIKE $3)
      LIMIT 1
    `, [orgId, `%${lista}%`, `${lista.toLowerCase()}%`])

    if (listaRes.rows.length === 0) {
      return { type: 'text', message: `No encontré una lista activa que matchee "${lista}".` }
    }

    const listaRow = listaRes.rows[0]
    const totalContactos = Number(listaRow.total_contactos)

    if (totalContactos === 0) {
      return { type: 'text', message: `La lista "${listaRow.nombre}" no tiene contactos.` }
    }

    // Check SMTP config exists
    const smtpRes = await query<{ email: any }>(`
      SELECT config->'email' AS email FROM organizations WHERE id = $1
    `, [orgId])

    const smtpConfig = smtpRes.rows[0]?.email
    if (!smtpConfig || !smtpConfig.smtp_host) {
      return { type: 'text', message: 'No hay SMTP configurado para la organización. Pedile al admin que lo configure.' }
    }

    // Build HTML from plain text
    const htmlBody = buildSimpleHtml(cuerpo, asunto)

    // Create the campaign
    const campRes = await query<{ id: string }>(`
      INSERT INTO email_campanas (org_id, nombre, asunto, cuerpo_html, cuerpo_texto, lista_id, estado, total_destinatarios)
      VALUES ($1, $2, $3, $4, $5, $6, 'enviando', $7)
      RETURNING id
    `, [orgId, `Campaña: ${asunto}`, asunto, htmlBody, cuerpo, listaRow.id, totalContactos])

    const campanaId = campRes.rows[0].id

    // Queue sends for all active contacts in the list
    const queueRes = await query<{ queued: string }>(`
      WITH inserted AS (
        INSERT INTO email_campana_envios (campana_id, contacto_id, email, estado, unsub_token)
        SELECT $1, c.id, c.email, 'pendiente', gen_random_uuid()
        FROM email_contactos c
        WHERE c.lista_id = $2 AND c.estado = 'activo'
        ON CONFLICT DO NOTHING
        RETURNING id
      )
      SELECT COUNT(*)::text AS queued FROM inserted
    `, [campanaId, listaRow.id])

    const queued = Number(queueRes.rows[0]?.queued || 0)

    // Update campaign totals
    await query(`
      UPDATE email_campanas
      SET total_pendientes = $2, total_destinatarios = $2, enviada_at = NOW()
      WHERE id = $1
    `, [campanaId, queued])

    return {
      type: 'text',
      message: `Campaña enviándose a "${listaRow.nombre}" (${queued} emails en cola).\nAsunto: ${asunto}\nID: ${campanaId.slice(0, 8)}\n\nEl email-runner los va mandando de a tandas. Preguntame "cómo va la campaña" para ver el progreso.`,
    }
  },
}

function buildSimpleHtml(text: string, title: string): string {
  const paragraphs = text.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('\n')
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
${paragraphs}
<hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
<p style="font-size: 12px; color: #999;">
  <a href="{{unsub_link}}" style="color: #999;">Desuscribirse</a>
</p>
</body>
</html>`
}

register(entry)
export default entry
