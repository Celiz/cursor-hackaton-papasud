import { query } from '@locus/db'
import type { EscEvent } from '@locus/db/schema/escuela'

export async function getEvents(orgId: string) {
  const result = await query(
    `SELECT * FROM esc_events
     WHERE org_id = $1
     ORDER BY datetime DESC`,
    [orgId]
  )
  return result.rows as EscEvent[]
}

export async function getEventById(id: string) {
  const result = await query('SELECT * FROM esc_events WHERE id = $1', [id])
  return result.rows[0] as EscEvent | undefined
}

export async function createEvent(orgId: string, data: {
  title: string
  description?: string
  type?: string
  datetime: string
  duration_minutes?: number
  zoom_link?: string
  zoom_id?: string
  zoom_password?: string
  replay_url?: string
  is_published?: boolean
}) {
  const result = await query(
    `INSERT INTO esc_events (org_id, title, description, type, datetime, duration_minutes, zoom_link, zoom_id, zoom_password, replay_url, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [orgId, data.title, data.description || null, data.type || null, data.datetime, data.duration_minutes || 120, data.zoom_link || null, data.zoom_id || null, data.zoom_password || null, data.replay_url || null, data.is_published ?? true]
  )
  return result.rows[0] as EscEvent
}

export async function updateEvent(id: string, data: Partial<EscEvent>) {
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
    `UPDATE esc_events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] as EscEvent
}

export async function deleteEvent(id: string) {
  await query('DELETE FROM esc_events WHERE id = $1', [id])
}
