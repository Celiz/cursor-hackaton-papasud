import { query } from '@locus/db'
import type { EscMembership, EscVipRequest } from '@locus/db/schema/escuela'

export async function getMembership(personaId: string, orgId: string) {
  const result = await query(
    'SELECT * FROM esc_memberships WHERE persona_id = $1 AND org_id = $2 AND status = \'activa\' ORDER BY created_at DESC LIMIT 1',
    [personaId, orgId]
  )
  return result.rows[0] as EscMembership | undefined
}

export async function getAllMemberships(orgId: string) {
  const result = await query(
    `SELECT m.*, p.nombre, p.email
     FROM esc_memberships m
     JOIN personas p ON p.id = m.persona_id
     WHERE m.org_id = $1
     ORDER BY m.created_at DESC`,
    [orgId]
  )
  return result.rows
}

export async function createMembership(orgId: string, data: { persona_id: string; plan: string; price: number; currency?: string; is_fundadora?: boolean; payment_method?: string; registered_by?: string }) {
  const result = await query(
    `INSERT INTO esc_memberships (org_id, persona_id, plan, price, currency, is_fundadora, payment_method, registered_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [orgId, data.persona_id, data.plan, data.price, data.currency || 'ARS', data.is_fundadora || false, data.payment_method || 'manual', data.registered_by || null]
  )
  return result.rows[0] as EscMembership
}

export async function updateMembershipStatus(id: string, status: string) {
  const result = await query(
    `UPDATE esc_memberships SET status = $2, canceled_at = CASE WHEN $2 = 'cancelada' THEN NOW() ELSE canceled_at END WHERE id = $1 RETURNING *`,
    [id, status]
  )
  return result.rows[0] as EscMembership
}

export async function markMembershipPaid(id: string, notes?: string) {
  const result = await query(
    `UPDATE esc_memberships SET is_paid = true, last_payment_date = NOW(), payment_notes = COALESCE($2, payment_notes) WHERE id = $1 RETURNING *`,
    [id, notes || null]
  )
  return result.rows[0] as EscMembership
}

export async function updateMembership(id: string, data: Partial<EscMembership>) {
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
    `UPDATE esc_memberships SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] as EscMembership
}

export async function deleteMembership(id: string) {
  await query('DELETE FROM esc_memberships WHERE id = $1', [id])
}

// VIP Requests (previously Sala Oro)
export async function getVipRequests(orgId: string, status?: string) {
  const conditions = ['r.org_id = $1']
  const params: unknown[] = [orgId]
  if (status) {
    conditions.push(`r.status = $${params.length + 1}`)
    params.push(status)
  }
  const result = await query(
    `SELECT r.*, p.nombre, p.email
     FROM esc_vip_requests r
     JOIN personas p ON p.id = r.persona_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.created_at DESC`,
    params
  )
  return result.rows
}

export async function createVipRequest(orgId: string, personaId: string, message?: string) {
  const result = await query(
    `INSERT INTO esc_vip_requests (org_id, persona_id, message)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [orgId, personaId, message || null]
  )
  return result.rows[0] as EscVipRequest
}

export async function updateVipRequestStatus(id: string, status: string, reviewedBy: string, adminNotes?: string) {
  const result = await query(
    `UPDATE esc_vip_requests SET status = $2, reviewed_by = $3, reviewed_at = NOW(), admin_notes = COALESCE($4, admin_notes), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status, reviewedBy, adminNotes || null]
  )
  return result.rows[0] as EscVipRequest
}
