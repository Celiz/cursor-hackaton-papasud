import { query } from '@locus/db'

export interface EmailTemplate {
  id: string
  org_id: string
  nombre: string
  slug: string
  asunto: string
  cuerpo_html: string
  cuerpo_text: string | null
  variables: string[]
  categoria: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateTemplateInput {
  org_id: string
  nombre: string
  slug: string
  asunto: string
  cuerpo_html: string
  cuerpo_text?: string
  variables?: string[]
  categoria?: string
}

export interface UpdateTemplateInput {
  nombre?: string
  asunto?: string
  cuerpo_html?: string
  cuerpo_text?: string
  variables?: string[]
  categoria?: string
  activo?: boolean
}

export async function getTemplates(org_id: string): Promise<EmailTemplate[]> {
  const result = await query<EmailTemplate>(
    'SELECT * FROM email_templates WHERE org_id = $1 ORDER BY nombre',
    [org_id]
  )
  return result.rows
}

export async function getTemplateById(id: string, org_id: string): Promise<EmailTemplate | null> {
  const result = await query<EmailTemplate>(
    'SELECT * FROM email_templates WHERE id = $1 AND org_id = $2',
    [id, org_id]
  )
  return result.rows[0] || null
}

export async function getTemplateBySlug(slug: string, org_id: string): Promise<EmailTemplate | null> {
  const result = await query<EmailTemplate>(
    'SELECT * FROM email_templates WHERE slug = $1 AND org_id = $2',
    [slug, org_id]
  )
  return result.rows[0] || null
}

export async function createTemplate(input: CreateTemplateInput): Promise<EmailTemplate> {
  const result = await query<EmailTemplate>(
    `INSERT INTO email_templates (org_id, nombre, slug, asunto, cuerpo_html, cuerpo_text, variables, categoria)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.org_id, input.nombre, input.slug, input.asunto,
      input.cuerpo_html, input.cuerpo_text || null,
      input.variables || [], input.categoria || 'general',
    ]
  )
  return result.rows[0]
}

export async function updateTemplate(id: string, org_id: string, input: UpdateTemplateInput): Promise<EmailTemplate | null> {
  const sets: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (input.nombre !== undefined) { sets.push(`nombre = $${idx++}`); params.push(input.nombre) }
  if (input.asunto !== undefined) { sets.push(`asunto = $${idx++}`); params.push(input.asunto) }
  if (input.cuerpo_html !== undefined) { sets.push(`cuerpo_html = $${idx++}`); params.push(input.cuerpo_html) }
  if (input.cuerpo_text !== undefined) { sets.push(`cuerpo_text = $${idx++}`); params.push(input.cuerpo_text) }
  if (input.variables !== undefined) { sets.push(`variables = $${idx++}`); params.push(input.variables) }
  if (input.categoria !== undefined) { sets.push(`categoria = $${idx++}`); params.push(input.categoria) }
  if (input.activo !== undefined) { sets.push(`activo = $${idx++}`); params.push(input.activo) }

  if (sets.length === 0) return getTemplateById(id, org_id)

  sets.push(`updated_at = now()`)
  params.push(id, org_id)

  const result = await query<EmailTemplate>(
    `UPDATE email_templates SET ${sets.join(', ')} WHERE id = $${idx++} AND org_id = $${idx} RETURNING *`,
    params
  )
  return result.rows[0] || null
}

export async function deleteTemplate(id: string, org_id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM email_templates WHERE id = $1 AND org_id = $2',
    [id, org_id]
  )
  return (result.rowCount ?? 0) > 0
}

export function renderTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '')
}
