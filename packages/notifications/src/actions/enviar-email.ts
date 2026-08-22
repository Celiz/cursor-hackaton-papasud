import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, ActionResult } from '../types'
import { extractEmail } from '../helpers'
import { sendEmail, getOrgEmailConfig } from '../email/smtp'

const entry: CatalogEntry = {
  id: 'enviar_email',
  type: 'action',
  description:
    'Enviar un email directo a un contacto. Busca el contacto por nombre, obtiene su email, y envía el mensaje. Params: contacto (nombre a buscar), asunto (asunto del email), mensaje (texto del email).',
  params: z.object({
    contacto: z.string().min(2).describe('Nombre del contacto a buscar'),
    asunto: z.string().min(1).describe('Asunto del email'),
    mensaje: z.string().min(1).describe('Texto del email'),
  }),
  async execute(orgId, params): Promise<ActionResult> {
    const { contacto, asunto, mensaje } = params

    // 1. Check SMTP config
    const smtpConfig = await getOrgEmailConfig(orgId)
    if (!smtpConfig) {
      return { type: 'text', message: 'No hay SMTP configurado para la organización. Pedile al admin que lo configure.' }
    }

    // 2. Search contact — try org_contacts+personas first, then clientes
    const pattern = `%${contacto}%`

    let matches: Array<{ nombre: string; apellido: string | null; email: any; source: string }> = []

    // Try org_contacts (new model)
    const ocResult = await query<{
      nombre: string
      apellido: string | null
      email: any
    }>(`
      SELECT p.nombre, p.apellido, p.email
      FROM org_contacts oc
      JOIN personas p ON p.id = oc.persona_id
      WHERE oc.org_id = $1
        AND (
          p.nombre ILIKE $2
          OR COALESCE(p.apellido, '') ILIKE $2
          OR CONCAT(p.nombre, ' ', COALESCE(p.apellido, '')) ILIKE $2
        )
      ORDER BY p.nombre
      LIMIT 5
    `, [orgId, pattern])

    matches.push(...ocResult.rows.map(r => ({ ...r, source: 'org_contacts' })))

    // Also try clientes (legacy)
    if (matches.length === 0) {
      const clResult = await query<{
        nombre: string
        apellido: string | null
        email: any
      }>(`
        SELECT nombre, '' AS apellido, email
        FROM clientes
        WHERE org_id = $1
          AND estado = 'Activo'
          AND nombre ILIKE $2
        ORDER BY nombre
        LIMIT 5
      `, [orgId, pattern])

      matches.push(...clResult.rows.map(r => ({ ...r, source: 'clientes' })))
    }

    if (matches.length === 0) {
      return { type: 'text', message: `No encontré ningún contacto con "${contacto}".` }
    }

    // 3. Find first match with valid email
    let target: { fullName: string; email: string } | null = null
    for (const m of matches) {
      const email = extractEmail(m.email)
      if (email) {
        const fullName = m.apellido ? `${m.nombre} ${m.apellido}`.trim() : m.nombre
        target = { fullName, email }
        break
      }
    }

    if (!target) {
      const firstName = matches[0].nombre
      return { type: 'text', message: `Encontré a ${firstName} pero no tiene email registrado.` }
    }

    // 4. Build HTML
    const paragraphs = mensaje.split('\n').filter((l: string) => l.trim()).map((l: string) => `<p>${l}</p>`).join('\n')
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${asunto}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
${paragraphs}
</body>
</html>`

    // 5. Send
    try {
      await sendEmail(orgId, target.email, asunto, html)
    } catch (e: any) {
      return { type: 'text', message: `Error al enviar email a ${target.fullName}: ${e.message}` }
    }

    const extra = matches.length > 1
      ? ` (había ${matches.length} resultados, le mandé al primero)`
      : ''

    return {
      type: 'text',
      message: `Email enviado a ${target.fullName} (${target.email}).${extra}\nAsunto: ${asunto}`,
    }
  },
}

register(entry)
export default entry
