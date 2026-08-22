import { query } from '@locus/db'
import type { Subscription, TriggerType } from './types'

export async function createSubscription(params: {
  org_id: string
  persona_id: string
  telegram_user_id: string
  catalog_id: string
  params: Record<string, any>
  trigger_type: TriggerType
  cron_schedule?: string
  event_name?: string
  once_at?: string
  original_request?: string
}): Promise<Subscription> {
  const result = await query<Subscription>(
    `INSERT INTO telegram_subscriptions
     (org_id, persona_id, telegram_user_id, catalog_id, params, trigger_type, cron_schedule, event_name, once_at, original_request)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      params.org_id, params.persona_id, params.telegram_user_id,
      params.catalog_id, JSON.stringify(params.params), params.trigger_type,
      params.cron_schedule ?? null, params.event_name ?? null,
      params.once_at ?? null, params.original_request ?? null,
    ]
  )
  return result.rows[0]
}

export async function getSubscriptionsByPersona(personaId: string, orgId: string): Promise<Subscription[]> {
  const result = await query<Subscription>(
    `SELECT * FROM telegram_subscriptions
     WHERE persona_id = $1 AND org_id = $2
     ORDER BY created_at DESC`,
    [personaId, orgId]
  )
  return result.rows
}

export async function getSubscriptionsByOrg(orgId: string): Promise<Subscription[]> {
  const result = await query<Subscription>(
    `SELECT s.*, p.nombre AS persona_nombre
     FROM telegram_subscriptions s
     JOIN personas p ON p.id = s.persona_id
     WHERE s.org_id = $1
     ORDER BY s.created_at DESC`,
    [orgId]
  )
  return result.rows
}

export async function getActiveSubscriptions(triggerType?: TriggerType): Promise<(Subscription & { bot_token: string })[]> {
  const filter = triggerType ? `AND s.trigger_type = $1` : ''
  const params = triggerType ? [triggerType] : []
  const result = await query<Subscription & { bot_token: string }>(
    `SELECT s.*, tb.bot_token
     FROM telegram_subscriptions s
     JOIN telegram_bots tb ON tb.org_id = s.org_id AND tb.enabled = true
     WHERE s.enabled = true ${filter}
     ORDER BY s.org_id`,
    params
  )
  return result.rows
}

export async function toggleSubscription(id: string, enabled: boolean): Promise<void> {
  await query(
    `UPDATE telegram_subscriptions SET enabled = $2, updated_at = now() WHERE id = $1`,
    [id, enabled]
  )
}

export async function deleteSubscription(id: string): Promise<void> {
  await query(`DELETE FROM telegram_subscriptions WHERE id = $1`, [id])
}

export async function updateLastRun(id: string, result: any): Promise<void> {
  await query(
    `UPDATE telegram_subscriptions SET last_run = now(), last_result = $2, updated_at = now() WHERE id = $1`,
    [id, JSON.stringify(result)]
  )
}

export async function updateSubscriptionSchedule(id: string, cronSchedule: string): Promise<void> {
  await query(
    `UPDATE telegram_subscriptions SET cron_schedule = $2, updated_at = now() WHERE id = $1`,
    [id, cronSchedule]
  )
}
