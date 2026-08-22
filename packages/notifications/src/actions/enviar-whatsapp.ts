import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, ActionResult } from '../types'

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3100'
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || 'dev-bridge-secret'

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
  if (!cleaned.startsWith('54')) cleaned = '54' + cleaned
  return cleaned
}

const entry: CatalogEntry = {
  id: 'enviar_whatsapp',
  type: 'action',
  description:
    'Enviar mensaje de WhatsApp a un contacto. Busca el contacto por nombre, obtiene su teléfono, y envía el mensaje via WhatsApp Bridge. Params: contacto (nombre a buscar), mensaje (texto a enviar). Requiere que el usuario tenga WhatsApp vinculado.',
  params: z.object({
    contacto: z.string().min(2),
    mensaje: z.string().min(1),
  }),
  async execute(orgId, params): Promise<ActionResult> {
    const { contacto, mensaje, _ctx_persona_id } = params

    if (!_ctx_persona_id) {
      return { type: 'text', message: 'Error: no se pudo identificar tu usuario para enviar por WhatsApp.' }
    }

    // 1. Check sender has a connected WA session
    const waSession = await query(
      `SELECT * FROM wa_bridge_sessions WHERE persona_id = $1 AND status = 'connected'`,
      [_ctx_persona_id]
    )
    if (waSession.rows.length === 0) {
      return {
        type: 'text',
        message: 'No tenés WhatsApp vinculado. Andá a Configuración > WhatsApp Bridge para vincular tu número.',
      }
    }

    // 2. Search for the contact
    const pattern = `%${contacto}%`
    const contactResult = await query<{
      persona_id: string
      nombre: string
      apellido: string | null
      telefono: string | null
    }>(
      `SELECT
        p.id AS persona_id,
        p.nombre,
        COALESCE(p.apellido, '') AS apellido,
        p.telefono
      FROM org_contacts oc
      JOIN personas p ON p.id = oc.persona_id
      WHERE oc.org_id = $1
        AND (
          p.nombre ILIKE $2
          OR COALESCE(p.apellido, '') ILIKE $2
          OR CONCAT(p.nombre, ' ', COALESCE(p.apellido, '')) ILIKE $2
        )
      ORDER BY p.nombre
      LIMIT 5`,
      [orgId, pattern]
    )

    if (contactResult.rows.length === 0) {
      return { type: 'text', message: `No encontré ningún contacto con "${contacto}".` }
    }

    // If multiple matches, pick the first one but inform
    const contact = contactResult.rows[0]
    const fullName = contact.apellido ? `${contact.nombre} ${contact.apellido}` : contact.nombre

    if (!contact.telefono) {
      return {
        type: 'text',
        message: `Encontré a ${fullName} pero no tiene teléfono registrado.`,
      }
    }

    // 3. Send via bridge
    const phone = cleanPhone(contact.telefono)
    try {
      const res = await fetch(`${BRIDGE_URL}/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': BRIDGE_SECRET,
        },
        body: JSON.stringify({
          personaId: _ctx_persona_id,
          phone,
          text: mensaje,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error del bridge')
      }
    } catch (e: any) {
      return {
        type: 'text',
        message: `Error al enviar WhatsApp a ${fullName}: ${e.message}`,
      }
    }

    const extra = contactResult.rows.length > 1
      ? ` (había ${contactResult.rows.length} resultados, le mandé al primero)`
      : ''

    return {
      type: 'text',
      message: `Mensaje enviado por WhatsApp a ${fullName} (${contact.telefono}).${extra}`,
    }
  },
}

register(entry)
export default entry
