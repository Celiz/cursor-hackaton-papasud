import { query } from '@locus/db'
import type { EscContent, EscContentProgress, EscLesson, EscLessonProgress } from '@locus/db/schema/escuela'

export async function getPublishedContent(orgId: string) {
  const result = await query(
    `SELECT * FROM esc_content
     WHERE org_id = $1 AND is_published = true
     ORDER BY order_index ASC, created_at DESC`,
    [orgId]
  )
  return result.rows as EscContent[]
}

export async function getAllContent(orgId: string) {
  const result = await query(
    `SELECT * FROM esc_content
     WHERE org_id = $1
     ORDER BY module_name ASC NULLS LAST, order_index ASC, created_at DESC`,
    [orgId]
  )
  return result.rows as EscContent[]
}

export async function getContentById(id: string) {
  const result = await query(
    'SELECT * FROM esc_content WHERE id = $1',
    [id]
  )
  return result.rows[0] as EscContent | undefined
}

export async function getContentByModule(orgId: string, moduleName: string) {
  const result = await query(
    `SELECT * FROM esc_content
     WHERE org_id = $1 AND module_name = $2 AND is_published = true
     ORDER BY order_index ASC`,
    [orgId, moduleName]
  )
  return result.rows as EscContent[]
}

export async function getLessonsByContent(contentId: string) {
  const result = await query(
    `SELECT * FROM esc_lessons
     WHERE content_id = $1
     ORDER BY order_index ASC`,
    [contentId]
  )
  return result.rows as EscLesson[]
}

export async function getContentProgress(personaId: string, contentId: string) {
  const result = await query(
    'SELECT * FROM esc_content_progress WHERE persona_id = $1 AND content_id = $2',
    [personaId, contentId]
  )
  return result.rows[0] as EscContentProgress | undefined
}

export async function getUserContentProgress(personaId: string, orgId: string) {
  const result = await query(
    `SELECT cp.*, c.title, c.type, c.thumbnail_url, c.module_name
     FROM esc_content_progress cp
     JOIN esc_content c ON c.id = cp.content_id
     WHERE cp.persona_id = $1 AND c.org_id = $2
     ORDER BY cp.last_accessed_at DESC`,
    [personaId, orgId]
  )
  return result.rows
}

export async function upsertContentProgress(personaId: string, contentId: string, completed: boolean, progressPercent: number) {
  const result = await query(
    `INSERT INTO esc_content_progress (persona_id, content_id, completed, progress_percent, last_accessed_at, started_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (persona_id, content_id)
     DO UPDATE SET
       completed = $3,
       progress_percent = $4,
       last_accessed_at = NOW(),
       completed_at = CASE WHEN $3 = true AND esc_content_progress.completed_at IS NULL THEN NOW() ELSE esc_content_progress.completed_at END
     RETURNING *`,
    [personaId, contentId, completed, progressPercent]
  )
  return result.rows[0] as EscContentProgress
}

export async function upsertLessonProgress(personaId: string, lessonId: string, completed: boolean, notes?: string) {
  const result = await query(
    `INSERT INTO esc_lesson_progress (persona_id, lesson_id, completed, completed_at, notes)
     VALUES ($1, $2, $3, CASE WHEN $3 = true THEN NOW() ELSE NULL END, $4)
     ON CONFLICT (persona_id, lesson_id)
     DO UPDATE SET
       completed = $3,
       completed_at = CASE WHEN $3 = true AND esc_lesson_progress.completed_at IS NULL THEN NOW() ELSE esc_lesson_progress.completed_at END,
       notes = COALESCE($4, esc_lesson_progress.notes)
     RETURNING *`,
    [personaId, lessonId, completed, notes || null]
  )
  return result.rows[0] as EscLessonProgress
}

// Admin queries
export async function createContent(orgId: string, data: Omit<EscContent, 'id' | 'org_id' | 'created_at'>) {
  const result = await query(
    `INSERT INTO esc_content (org_id, title, description, type, category, file_url, thumbnail_url, duration_minutes, plan_required, is_published, order_index, is_locked, lock_type, lock_message, module_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [orgId, data.title, data.description, data.type, data.category, data.file_url, data.thumbnail_url, data.duration_minutes, data.plan_required, data.is_published, data.order_index, data.is_locked, data.lock_type, data.lock_message, data.module_name]
  )
  return result.rows[0] as EscContent
}

export async function updateContent(id: string, data: Partial<EscContent>) {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'org_id' || key === 'created_at') continue
    fields.push(`${key} = $${idx}`)
    values.push(value)
    idx++
  }

  if (fields.length === 0) return null

  values.push(id)
  const result = await query(
    `UPDATE esc_content SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] as EscContent
}

export async function deleteContent(id: string) {
  await query('DELETE FROM esc_content WHERE id = $1', [id])
}

export async function createLesson(data: { content_id: string; title: string; body?: string; order_index: number; lesson_type?: string; video_url?: string; audio_url?: string; reading_time_minutes?: number }) {
  const result = await query(
    `INSERT INTO esc_lessons (content_id, title, body, order_index, lesson_type, video_url, audio_url, reading_time_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.content_id, data.title, data.body || null, data.order_index, data.lesson_type || null, data.video_url || null, data.audio_url || null, data.reading_time_minutes || null]
  )
  return result.rows[0] as EscLesson
}

export async function updateLesson(id: string, data: Partial<EscLesson>) {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'content_id' || key === 'created_at' || key === 'updated_at') continue
    fields.push(`${key} = $${idx}`)
    values.push(value)
    idx++
  }

  if (fields.length === 0) return null

  values.push(id)
  const result = await query(
    `UPDATE esc_lessons SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] as EscLesson
}

export async function deleteLesson(id: string) {
  await query('DELETE FROM esc_lessons WHERE id = $1', [id])
}
