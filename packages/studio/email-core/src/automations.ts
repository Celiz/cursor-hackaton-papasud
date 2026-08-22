import { query } from '@locus/db'
import { getTemplateById, renderTemplate } from './templates'
import { getEmailProvider } from './provider-factory'
import type { EmailAccountRow } from './types'

export interface EmailAutomatico {
  id: string
  org_id: string
  evento: string
  template_id: string
  activa: boolean
  delay_minutos: number
  destinatario: string
  config: Record<string, unknown>
  created_at: string
}

export interface CreateAutomaticoInput {
  org_id: string
  evento: string
  template_id: string
  destinatario?: string
  delay_minutos?: number
  config?: Record<string, unknown>
}

export interface UpdateAutomaticoInput {
  template_id?: string
  activa?: boolean
  delay_minutos?: number
  destinatario?: string
  config?: Record<string, unknown>
}

export const EVENTOS_DISPONIBLES = [
  { value: 'cliente_creado', label: 'Alumno nuevo (bienvenida)', destinatario_default: 'cliente' },
  { value: 'turno_creado', label: 'Inscripción a clase', destinatario_default: 'cliente' },
  { value: 'turno_recordatorio', label: 'Recordatorio de clase', destinatario_default: 'cliente' },
  { value: 'turno_cancelado', label: 'Clase cancelada', destinatario_default: 'cliente' },
  { value: 'cobro_registrado', label: 'Pago confirmado', destinatario_default: 'cliente' },
  { value: 'sesion_completada', label: 'Post-clase', destinatario_default: 'cliente' },
  { value: 'cumpleanos', label: 'Cumpleaños', destinatario_default: 'cliente' },
  { value: 'plan_por_vencer', label: 'Plan por vencer', destinatario_default: 'cliente' },
] as const

export async function getAutomaticos(org_id: string): Promise<EmailAutomatico[]> {
  const result = await query<EmailAutomatico>(
    `SELECT ea.*, et.nombre as template_nombre
     FROM email_automaticos ea
     JOIN email_templates et ON et.id = ea.template_id
     WHERE ea.org_id = $1
     ORDER BY ea.evento`,
    [org_id]
  )
  return result.rows
}

export async function getAutomaticoById(id: string, org_id: string): Promise<EmailAutomatico | null> {
  const result = await query<EmailAutomatico>(
    'SELECT * FROM email_automaticos WHERE id = $1 AND org_id = $2',
    [id, org_id]
  )
  return result.rows[0] || null
}

export async function createAutomatico(input: CreateAutomaticoInput): Promise<EmailAutomatico> {
  const result = await query<EmailAutomatico>(
    `INSERT INTO email_automaticos (org_id, evento, template_id, destinatario, delay_minutos, config)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.org_id, input.evento, input.template_id,
      input.destinatario || 'cliente',
      input.delay_minutos ?? 0,
      JSON.stringify(input.config || {}),
    ]
  )
  return result.rows[0]
}

export async function updateAutomatico(id: string, org_id: string, input: UpdateAutomaticoInput): Promise<EmailAutomatico | null> {
  const sets: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (input.template_id !== undefined) { sets.push(`template_id = $${idx++}`); params.push(input.template_id) }
  if (input.activa !== undefined) { sets.push(`activa = $${idx++}`); params.push(input.activa) }
  if (input.delay_minutos !== undefined) { sets.push(`delay_minutos = $${idx++}`); params.push(input.delay_minutos) }
  if (input.destinatario !== undefined) { sets.push(`destinatario = $${idx++}`); params.push(input.destinatario) }
  if (input.config !== undefined) { sets.push(`config = $${idx++}`); params.push(JSON.stringify(input.config)) }

  if (sets.length === 0) return getAutomaticoById(id, org_id)

  params.push(id, org_id)
  const result = await query<EmailAutomatico>(
    `UPDATE email_automaticos SET ${sets.join(', ')} WHERE id = $${idx++} AND org_id = $${idx} RETURNING *`,
    params
  )
  return result.rows[0] || null
}

export async function deleteAutomatico(id: string, org_id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM email_automaticos WHERE id = $1 AND org_id = $2',
    [id, org_id]
  )
  return (result.rowCount ?? 0) > 0
}

export async function dispararAutomatico(
  org_id: string,
  evento: string,
  variables: Record<string, string>
): Promise<void> {
  const rules = await query<EmailAutomatico & { template_asunto: string; template_cuerpo_html: string; template_cuerpo_text: string | null }>(
    `SELECT ea.*, et.asunto as template_asunto, et.cuerpo_html as template_cuerpo_html, et.cuerpo_text as template_cuerpo_text
     FROM email_automaticos ea
     JOIN email_templates et ON et.id = ea.template_id
     WHERE ea.org_id = $1 AND ea.evento = $2 AND ea.activa = true`,
    [org_id, evento]
  )

  if (rules.rows.length === 0) return

  const accountResult = await query<EmailAccountRow>(
    `SELECT * FROM email_accounts WHERE org_id = $1 AND activa = true ORDER BY es_predeterminada DESC LIMIT 1`,
    [org_id]
  )

  if (accountResult.rows.length === 0) {
    console.warn(`[email-auto] No active email account for org ${org_id}, skipping ${evento}`)
    return
  }

  const account = accountResult.rows[0]
  const provider = getEmailProvider(account)

  for (const rule of rules.rows) {
    if (rule.delay_minutos > 0) {
      console.warn(`[email-auto] Delayed sending not yet supported, skipping rule ${rule.id}`)
      continue
    }

    const to = variables.cliente_email || variables.profesional_email || variables.admin_email
    if (!to) {
      console.warn(`[email-auto] No recipient email for event ${evento}, rule ${rule.id}`)
      continue
    }

    const subject = renderTemplate(rule.template_asunto, variables)
    const html = renderTemplate(rule.template_cuerpo_html, variables)
    const text = rule.template_cuerpo_text ? renderTemplate(rule.template_cuerpo_text, variables) : undefined

    try {
      await provider.sendEmail({ to: [to], subject, html, text })
    } catch (err) {
      console.error(`[email-auto] Failed to send for event ${evento}, rule ${rule.id}:`, err)
    }
  }
}
