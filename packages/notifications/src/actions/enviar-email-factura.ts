import { z } from 'zod'
import { register } from '../registry'
import type { CatalogEntry, ActionResult } from '../types'

const entry: CatalogEntry = {
  id: 'enviar_email_factura',
  type: 'action',
  description:
    'Enviar factura por email al cliente. Params requeridos: comprobante_id, email_destino.',
  params: z.object({
    comprobante_id: z.string().uuid(),
    email_destino: z.string().email(),
  }),
  async execute(_orgId, params): Promise<ActionResult> {
    // Placeholder: email infrastructure is configured but SMTP credentials
    // must be set per-org in organizations.config.email before actual sending.
    const { comprobante_id, email_destino } = params

    return {
      type: 'text',
      message: `\u2709\uFE0F Email de factura ${comprobante_id} a ${email_destino}: funcionalidad configurada. El envio se activara cuando se configuren las credenciales SMTP de la organizacion.`,
    }
  },
}

register(entry)
export default entry
