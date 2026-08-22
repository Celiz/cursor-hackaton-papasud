import { query } from '@locus/db'

// ===========================================
// SUBSCRIPTION PLANS
// ===========================================

export interface SubscriptionPlan {
  id: string
  org_id: string
  slug: string
  name: string
  description: string | null
  features: string[]
  price: number
  currency: string
  frequency: number
  frequency_type: string
  is_active: boolean
  is_popular: boolean
  order_index: number
  mp_reason: string | null
  created_at: Date
  updated_at: Date
}

export interface SubscriptionEvent {
  id: string
  org_id: string
  membership_id: string | null
  event_type: string
  mp_subscription_id: string | null
  mp_status: string | null
  mp_raw: Record<string, unknown> | null
  created_at: Date
}

export async function getActivePlans(orgId: string): Promise<SubscriptionPlan[]> {
  const result = await query<SubscriptionPlan>(
    `SELECT * FROM esc_subscription_plans
     WHERE org_id = $1 AND is_active = true
     ORDER BY order_index ASC, created_at ASC`,
    [orgId]
  )
  return result.rows
}

export async function getAllPlans(orgId: string): Promise<SubscriptionPlan[]> {
  const result = await query<SubscriptionPlan>(
    `SELECT * FROM esc_subscription_plans
     WHERE org_id = $1
     ORDER BY order_index ASC, created_at ASC`,
    [orgId]
  )
  return result.rows
}

export async function getPlanById(id: string): Promise<SubscriptionPlan | null> {
  const result = await query<SubscriptionPlan>(
    'SELECT * FROM esc_subscription_plans WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function createPlan(orgId: string, data: {
  slug: string
  name: string
  description?: string
  features?: string[]
  price: number
  currency?: string
  frequency?: number
  frequency_type?: string
  is_active?: boolean
  is_popular?: boolean
  order_index?: number
  mp_reason?: string
}): Promise<SubscriptionPlan> {
  const result = await query<SubscriptionPlan>(
    `INSERT INTO esc_subscription_plans (org_id, slug, name, description, features, price, currency, frequency, frequency_type, is_active, is_popular, order_index, mp_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      orgId,
      data.slug,
      data.name,
      data.description || null,
      data.features || [],
      data.price,
      data.currency || 'ARS',
      data.frequency || 1,
      data.frequency_type || 'months',
      data.is_active !== false,
      data.is_popular || false,
      data.order_index || 0,
      data.mp_reason || null,
    ]
  )
  return result.rows[0]
}

export async function updatePlan(id: string, data: Partial<Omit<SubscriptionPlan, 'id' | 'org_id' | 'created_at' | 'updated_at'>>): Promise<SubscriptionPlan | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = $${idx}`)
    values.push(value)
    idx++
  }

  if (fields.length === 0) return null

  values.push(id)
  const result = await query<SubscriptionPlan>(
    `UPDATE esc_subscription_plans SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] || null
}

export async function deletePlan(id: string): Promise<void> {
  await query('DELETE FROM esc_subscription_plans WHERE id = $1', [id])
}

// ===========================================
// SUBSCRIPTION EVENTS (audit log)
// ===========================================

export async function logSubscriptionEvent(orgId: string, data: {
  membership_id?: string
  event_type: string
  mp_subscription_id?: string
  mp_status?: string
  mp_raw?: Record<string, unknown>
}): Promise<SubscriptionEvent> {
  const result = await query<SubscriptionEvent>(
    `INSERT INTO esc_subscription_events (org_id, membership_id, event_type, mp_subscription_id, mp_status, mp_raw)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      orgId,
      data.membership_id || null,
      data.event_type,
      data.mp_subscription_id || null,
      data.mp_status || null,
      data.mp_raw ? JSON.stringify(data.mp_raw) : null,
    ]
  )
  return result.rows[0]
}

export async function getSubscriptionEvents(orgId: string, filters?: {
  membership_id?: string
  mp_subscription_id?: string
  limit?: number
}): Promise<SubscriptionEvent[]> {
  const conditions = ['org_id = $1']
  const params: unknown[] = [orgId]

  if (filters?.membership_id) {
    params.push(filters.membership_id)
    conditions.push(`membership_id = $${params.length}`)
  }
  if (filters?.mp_subscription_id) {
    params.push(filters.mp_subscription_id)
    conditions.push(`mp_subscription_id = $${params.length}`)
  }

  const limit = filters?.limit || 50
  params.push(limit)

  const result = await query<SubscriptionEvent>(
    `SELECT * FROM esc_subscription_events
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  )
  return result.rows
}

// ===========================================
// MP-LINKED MEMBERSHIP HELPERS
// ===========================================

export async function createMPMembership(orgId: string, data: {
  persona_id: string
  plan_id?: string | null
  plan: string
  price: number
  currency: string
  mp_subscription_id?: string | null
  mp_external_reference?: string | null
}): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `INSERT INTO esc_memberships (org_id, persona_id, plan_id, plan, price, currency, status, payment_method, mp_subscription_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'pausada', 'mercadopago', $7)
     RETURNING id`,
    [orgId, data.persona_id, data.plan_id ?? null, data.plan, data.price, data.currency, data.mp_subscription_id ?? null]
  )
  return result.rows[0]
}

export async function getMembershipByMPSubscriptionId(mpSubscriptionId: string) {
  const result = await query(
    `SELECT m.*, p.nombre, p.email
     FROM esc_memberships m
     JOIN personas p ON p.id = m.persona_id
     WHERE m.mp_subscription_id = $1
     ORDER BY m.created_at DESC LIMIT 1`,
    [mpSubscriptionId]
  )
  return result.rows[0] || null
}

export async function updateMembershipFromWebhook(mpSubscriptionId: string, data: {
  status: string
  mp_payer_id?: string
  next_payment_date?: string
  last_payment_date?: string
}) {
  const fields = ['status = $2']
  const values: unknown[] = [mpSubscriptionId, data.status]
  let idx = 3

  if (data.status === 'activa') {
    fields.push(`is_paid = true`)
  }
  if (data.status === 'cancelada') {
    fields.push(`canceled_at = NOW()`)
  }
  if (data.mp_payer_id) {
    fields.push(`mp_payer_id = $${idx}`)
    values.push(data.mp_payer_id)
    idx++
  }
  if (data.next_payment_date) {
    fields.push(`next_payment_date = $${idx}`)
    values.push(data.next_payment_date)
    idx++
  }
  if (data.last_payment_date) {
    fields.push(`last_payment_date = $${idx}`)
    values.push(data.last_payment_date)
    idx++
  }

  const result = await query(
    `UPDATE esc_memberships SET ${fields.join(', ')} WHERE mp_subscription_id = $1 RETURNING *`,
    values
  )
  return result.rows[0] || null
}

// ===========================================
// MP ACCESS TOKEN
// ===========================================

export async function getMPAccessToken(orgId: string): Promise<string | null> {
  const result = await query(
    `SELECT valor FROM org_settings WHERE org_id = $1 AND clave = 'mp_access_token'`,
    [orgId]
  )
  return result.rows[0]?.valor || null
}
