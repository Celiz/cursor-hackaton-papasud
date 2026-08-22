import { query } from '@locus/db'
import type { EscLead, EscBooking, EscAvailability, EscBlockedDate } from '@locus/db/schema/escuela'

// Leads
export async function getLeads(orgId: string, status?: string) {
  const conditions = ['l.org_id = $1']
  const params: unknown[] = [orgId]

  if (status) {
    conditions.push(`l.status = $${params.length + 1}`)
    params.push(status)
  }

  const result = await query(
    `SELECT l.*, b.datetime as booking_datetime, b.status as booking_status
     FROM esc_leads l
     LEFT JOIN esc_bookings b ON b.id = l.booking_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY l.created_at DESC`,
    params
  )
  return result.rows
}

export async function getLeadById(id: string) {
  const result = await query('SELECT * FROM esc_leads WHERE id = $1', [id])
  return result.rows[0] as EscLead | undefined
}

export async function createLead(orgId: string, data: { full_name: string; email: string; phone: string; instagram?: string; situacion_actual?: string; mayor_desafio?: string; que_quieres_lograr?: string; porque_ahora?: string; inversion_lista?: boolean; como_conociste?: string }) {
  const result = await query(
    `INSERT INTO esc_leads (org_id, full_name, email, phone, instagram, situacion_actual, mayor_desafio, que_quieres_lograr, porque_ahora, inversion_lista, como_conociste)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [orgId, data.full_name, data.email, data.phone, data.instagram || null, data.situacion_actual || null, data.mayor_desafio || null, data.que_quieres_lograr || null, data.porque_ahora || null, data.inversion_lista ?? null, data.como_conociste || null]
  )
  return result.rows[0] as EscLead
}

export async function updateLeadStatus(id: string, status: string, notas?: string) {
  const result = await query(
    `UPDATE esc_leads SET status = $2, notas = COALESCE($3, notas), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status, notas || null]
  )
  return result.rows[0] as EscLead
}

export async function updateLead(id: string, data: Partial<EscLead>) {
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
    `UPDATE esc_leads SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] as EscLead
}

export async function deleteLead(id: string) {
  await query('DELETE FROM esc_leads WHERE id = $1', [id])
}

// Bookings
export async function getBookings(orgId: string, status?: string) {
  const conditions = ['org_id = $1']
  const params: unknown[] = [orgId]

  if (status) {
    conditions.push(`status = $${params.length + 1}`)
    params.push(status)
  }

  const result = await query(
    `SELECT * FROM esc_bookings WHERE ${conditions.join(' AND ')} ORDER BY datetime ASC`,
    params
  )
  return result.rows as EscBooking[]
}

export async function createBooking(orgId: string, data: { lead_id?: string; persona_id?: string; datetime: Date; duration_minutes?: number; type?: string; google_event_id?: string; meeting_url?: string; notas?: string }) {
  const result = await query(
    `INSERT INTO esc_bookings (org_id, lead_id, persona_id, datetime, duration_minutes, type, google_event_id, meeting_url, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [orgId, data.lead_id || null, data.persona_id || null, data.datetime, data.duration_minutes || 30, data.type || 'discovery', data.google_event_id || null, data.meeting_url || null, data.notas || null]
  )
  return result.rows[0] as EscBooking
}

export async function updateBookingStatus(id: string, status: string) {
  const result = await query(
    'UPDATE esc_bookings SET status = $2 WHERE id = $1 RETURNING *',
    [id, status]
  )
  return result.rows[0] as EscBooking
}

// Availability
export async function getAvailability(orgId: string) {
  const result = await query(
    'SELECT * FROM esc_availability WHERE org_id = $1 AND is_active = true ORDER BY day_of_week, start_time',
    [orgId]
  )
  return result.rows as EscAvailability[]
}

export async function getBlockedDates(orgId: string) {
  const result = await query(
    'SELECT * FROM esc_blocked_dates WHERE org_id = $1 AND date >= CURRENT_DATE ORDER BY date',
    [orgId]
  )
  return result.rows as EscBlockedDate[]
}
