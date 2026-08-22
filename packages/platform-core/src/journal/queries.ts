import { query } from '@locus/db'
import type { EscJournalEntry, EscJournalPrompt, EscJournalSupport } from '@locus/db/schema/escuela'

export async function getDailyPrompt(orgId: string) {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const result = await query(
    `SELECT * FROM esc_journal_prompts
     WHERE org_id = $1 AND is_active = true
     ORDER BY created_at
     LIMIT 1 OFFSET $2`,
    [orgId, dayOfYear % 100]
  )
  if (result.rows.length === 0) {
    // Fallback to first prompt
    const fallback = await query(
      'SELECT * FROM esc_journal_prompts WHERE org_id = $1 AND is_active = true LIMIT 1',
      [orgId]
    )
    return fallback.rows[0] as EscJournalPrompt | undefined
  }
  return result.rows[0] as EscJournalPrompt
}

export async function getJournalEntries(personaId: string, options?: { limit?: number; offset?: number; mood?: string }) {
  const conditions = ['persona_id = $1']
  const params: unknown[] = [personaId]

  if (options?.mood) {
    conditions.push(`mood = $${params.length + 1}`)
    params.push(options.mood)
  }

  const limit = options?.limit || 20
  const offset = options?.offset || 0

  const result = await query(
    `SELECT je.*, jp.content as prompt_content, jp.category as prompt_category
     FROM esc_journal_entries je
     LEFT JOIN esc_journal_prompts jp ON jp.id = je.prompt_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY je.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )
  return result.rows
}

export async function createJournalEntry(personaId: string, content: string, options?: { prompt_id?: string; tags?: string[]; mood?: string }) {
  const result = await query(
    `INSERT INTO esc_journal_entries (persona_id, prompt_id, content, tags, mood)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [personaId, options?.prompt_id || null, content, options?.tags || null, options?.mood || null]
  )
  return result.rows[0] as EscJournalEntry
}

export async function deleteJournalEntry(id: string, personaId: string) {
  await query('DELETE FROM esc_journal_entries WHERE id = $1 AND persona_id = $2', [id, personaId])
}

export async function shareJournalEntry(id: string, personaId: string) {
  const result = await query(
    `UPDATE esc_journal_entries SET is_shared = true, shared_at = NOW()
     WHERE id = $1 AND persona_id = $2
     RETURNING *`,
    [id, personaId]
  )
  return result.rows[0] as EscJournalEntry
}

export async function unshareJournalEntry(id: string, personaId: string) {
  await query('DELETE FROM esc_journal_support WHERE entry_id = $1', [id])
  const result = await query(
    `UPDATE esc_journal_entries SET is_shared = false, shared_at = NULL, support_count = 0
     WHERE id = $1 AND persona_id = $2
     RETURNING *`,
    [id, personaId]
  )
  return result.rows[0] as EscJournalEntry
}

export async function getSharedEntries(orgId: string, limit = 20, offset = 0) {
  const result = await query(
    `SELECT je.*, p.nombre as autor_nombre,
       jp.content as prompt_content
     FROM esc_journal_entries je
     JOIN personas p ON p.id = je.persona_id
     JOIN org_contacts oc ON oc.persona_id = je.persona_id AND oc.org_id = $1
     LEFT JOIN esc_journal_prompts jp ON jp.id = je.prompt_id
     WHERE je.is_shared = true
     ORDER BY je.shared_at DESC
     LIMIT $2 OFFSET $3`,
    [orgId, limit, offset]
  )
  return result.rows
}

export async function addSupport(entryId: string, personaId: string, supportType: string, message?: string) {
  const result = await query(
    `INSERT INTO esc_journal_support (entry_id, persona_id, support_type, message)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (entry_id, persona_id) DO NOTHING
     RETURNING *`,
    [entryId, personaId, supportType, message || null]
  )
  if (result.rows.length > 0) {
    await query('UPDATE esc_journal_entries SET support_count = support_count + 1 WHERE id = $1', [entryId])
  }
  return result.rows[0] as EscJournalSupport | undefined
}

// Admin: Journal prompts
export async function getJournalPrompts(orgId: string) {
  const result = await query(
    'SELECT * FROM esc_journal_prompts WHERE org_id = $1 ORDER BY created_at DESC',
    [orgId]
  )
  return result.rows as EscJournalPrompt[]
}

export async function createJournalPrompt(orgId: string, content: string, category?: string, createdBy?: string) {
  const result = await query(
    'INSERT INTO esc_journal_prompts (org_id, content, category, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
    [orgId, content, category || null, createdBy || null]
  )
  return result.rows[0] as EscJournalPrompt
}

export async function updateJournalPrompt(id: string, data: { content?: string; category?: string; is_active?: boolean }) {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'org_id' || key === 'created_at' || key === 'created_by') continue
    fields.push(`${key} = $${idx}`)
    values.push(value)
    idx++
  }
  if (fields.length === 0) return null
  values.push(id)
  const result = await query(
    `UPDATE esc_journal_prompts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] as EscJournalPrompt
}

export async function deleteJournalPrompt(id: string) {
  await query('DELETE FROM esc_journal_prompts WHERE id = $1', [id])
}
