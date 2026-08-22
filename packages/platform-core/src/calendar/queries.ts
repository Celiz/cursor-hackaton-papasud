import { query } from '@locus/db'
import type { EscGoogleToken } from '@locus/db/schema/escuela'

export async function getGoogleToken(personaId: string) {
  const result = await query(
    'SELECT * FROM esc_google_tokens WHERE persona_id = $1',
    [personaId]
  )
  return result.rows[0] as EscGoogleToken | undefined
}

export async function saveGoogleToken(personaId: string, data: { access_token: string; refresh_token: string; expires_at?: Date; scope?: string; email?: string }) {
  const result = await query(
    `INSERT INTO esc_google_tokens (persona_id, access_token, refresh_token, expires_at, scope, email)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (persona_id)
     DO UPDATE SET
       access_token = $2,
       refresh_token = $3,
       expires_at = $4,
       scope = COALESCE($5, esc_google_tokens.scope),
       email = COALESCE($6, esc_google_tokens.email),
       updated_at = NOW()
     RETURNING *`,
    [personaId, data.access_token, data.refresh_token, data.expires_at || null, data.scope || null, data.email || null]
  )
  return result.rows[0] as EscGoogleToken
}

export async function deleteGoogleToken(personaId: string) {
  await query('DELETE FROM esc_google_tokens WHERE persona_id = $1', [personaId])
}
