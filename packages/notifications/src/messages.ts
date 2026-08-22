import { query } from '@locus/db'

interface LogMessageParams {
  org_id: string
  persona_id?: string
  telegram_user_id: string
  direction: 'inbound' | 'outbound'
  message_text?: string
  intent_detected?: string
  catalog_id?: string
  confidence?: number
  response_text?: string
  response_time_ms?: number
}

export async function logMessage(params: LogMessageParams): Promise<void> {
  await query(
    `INSERT INTO telegram_messages
     (org_id, persona_id, telegram_user_id, direction, message_text, intent_detected, catalog_id, confidence, response_text, response_time_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      params.org_id, params.persona_id ?? null, params.telegram_user_id,
      params.direction, params.message_text ?? null, params.intent_detected ?? null,
      params.catalog_id ?? null, params.confidence ?? null,
      params.response_text ?? null, params.response_time_ms ?? null,
    ]
  )
}

export async function getMessages(orgId: string, filters?: {
  persona_id?: string
  intent?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}) {
  const conditions = ['tm.org_id = $1']
  const params: any[] = [orgId]
  let idx = 2

  if (filters?.persona_id) {
    conditions.push(`tm.persona_id = $${idx++}`)
    params.push(filters.persona_id)
  }
  if (filters?.intent) {
    conditions.push(`tm.intent_detected = $${idx++}`)
    params.push(filters.intent)
  }
  if (filters?.from) {
    conditions.push(`tm.created_at >= $${idx++}`)
    params.push(filters.from)
  }
  if (filters?.to) {
    conditions.push(`tm.created_at <= $${idx++}`)
    params.push(filters.to)
  }

  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0

  const result = await query(
    `SELECT tm.*, p.nombre AS persona_nombre
     FROM telegram_messages tm
     LEFT JOIN personas p ON p.id = tm.persona_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY tm.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  const countResult = await query(
    `SELECT count(*)::int AS total FROM telegram_messages tm WHERE ${conditions.join(' AND ')}`,
    params
  )

  return { rows: result.rows, total: countResult.rows[0].total }
}

export async function getMessageStats(orgId: string) {
  const result = await query(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE direction = 'inbound')::int AS inbound,
       count(*) FILTER (WHERE direction = 'outbound')::int AS outbound,
       count(*) FILTER (WHERE intent_detected IS NOT NULL)::int AS with_intent,
       count(*) FILTER (WHERE intent_detected = 'subscribe')::int AS subscribe_intents,
       count(*) FILTER (WHERE intent_detected = 'action')::int AS action_intents,
       count(*) FILTER (WHERE intent_detected = 'unknown')::int AS unknown_intents
     FROM telegram_messages
     WHERE org_id = $1 AND created_at > now() - interval '30 days'`,
    [orgId]
  )
  return result.rows[0]
}
