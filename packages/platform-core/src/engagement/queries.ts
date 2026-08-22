import { query } from '@locus/db'
import type { EscChallenge, EscChallengeParticipant, EscChallengeCheckin, EscDailyCheckin, EscCommitment, EscEmotionalCheckin, EscUserStats, EscUserBadge } from '@locus/db/schema/escuela'

// Challenges
export async function getActiveChallenges(orgId: string) {
  const result = await query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM esc_challenge_participants cp WHERE cp.challenge_id = c.id) as participants_count
     FROM esc_challenges c
     WHERE c.org_id = $1 AND c.is_active = true
     ORDER BY c.created_at DESC`,
    [orgId]
  )
  return result.rows
}

export async function getChallengeById(id: string) {
  const result = await query('SELECT * FROM esc_challenges WHERE id = $1', [id])
  return result.rows[0] as EscChallenge | undefined
}

export async function joinChallenge(challengeId: string, personaId: string) {
  const result = await query(
    `INSERT INTO esc_challenge_participants (challenge_id, persona_id)
     VALUES ($1, $2)
     ON CONFLICT (challenge_id, persona_id) DO NOTHING
     RETURNING *`,
    [challengeId, personaId]
  )
  return result.rows[0] as EscChallengeParticipant | undefined
}

export async function challengeCheckin(challengeId: string, personaId: string, dayNumber: number, note?: string) {
  const result = await query(
    `INSERT INTO esc_challenge_checkins (challenge_id, persona_id, day_number, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (challenge_id, persona_id, day_number) DO NOTHING
     RETURNING *`,
    [challengeId, personaId, dayNumber, note || null]
  )
  return result.rows[0] as EscChallengeCheckin | undefined
}

export async function getChallengeProgress(challengeId: string, personaId: string) {
  const result = await query(
    `SELECT
       cp.joined_at, cp.completed, cp.completed_at,
       (SELECT COUNT(*) FROM esc_challenge_checkins cc WHERE cc.challenge_id = $1 AND cc.persona_id = $2) as checkins_count,
       c.duration_days
     FROM esc_challenge_participants cp
     JOIN esc_challenges c ON c.id = cp.challenge_id
     WHERE cp.challenge_id = $1 AND cp.persona_id = $2`,
    [challengeId, personaId]
  )
  return result.rows[0]
}

// Daily Checkins
export async function doDailyCheckin(personaId: string) {
  // Check if already checked in today
  const existing = await query(
    'SELECT * FROM esc_daily_checkins WHERE persona_id = $1 AND checkin_date = CURRENT_DATE',
    [personaId]
  )
  if (existing.rows.length > 0) {
    return { already_checked_in: true, checkin: existing.rows[0] as EscDailyCheckin }
  }

  // Get yesterday's checkin for streak
  const yesterday = await query(
    'SELECT streak_day FROM esc_daily_checkins WHERE persona_id = $1 AND checkin_date = CURRENT_DATE - 1',
    [personaId]
  )
  const streakDay = yesterday.rows.length > 0 ? yesterday.rows[0].streak_day + 1 : 1
  const bonusPoints = streakDay >= 7 ? 5 : 0

  const result = await query(
    `INSERT INTO esc_daily_checkins (persona_id, checkin_date, points_earned, streak_day)
     VALUES ($1, CURRENT_DATE, $2, $3)
     RETURNING *`,
    [personaId, 10 + bonusPoints, streakDay]
  )

  // Update user stats
  await query(
    `INSERT INTO esc_user_stats (persona_id, current_streak, longest_streak, participation_points, last_checkin_date, last_active_at)
     VALUES ($1, $2, $2, $3, CURRENT_DATE, NOW())
     ON CONFLICT (persona_id)
     DO UPDATE SET
       current_streak = $2,
       longest_streak = GREATEST(esc_user_stats.longest_streak, $2),
       participation_points = esc_user_stats.participation_points + $3,
       last_checkin_date = CURRENT_DATE,
       last_active_at = NOW(),
       updated_at = NOW()`,
    [personaId, streakDay, 10 + bonusPoints]
  )

  return { already_checked_in: false, checkin: result.rows[0] as EscDailyCheckin }
}

export async function getCheckinStreak(personaId: string) {
  const result = await query(
    `SELECT current_streak, longest_streak, last_checkin_date,
       (SELECT COUNT(*) FROM esc_daily_checkins WHERE persona_id = $1) as total_checkins
     FROM esc_user_stats
     WHERE persona_id = $1`,
    [personaId]
  )
  return result.rows[0] || { current_streak: 0, longest_streak: 0, total_checkins: 0 }
}

// Commitments
export async function getCommitments(personaId: string) {
  const result = await query(
    'SELECT * FROM esc_commitments WHERE persona_id = $1 ORDER BY created_at DESC',
    [personaId]
  )
  return result.rows as EscCommitment[]
}

export async function createCommitment(personaId: string, content: string, dueDate?: Date) {
  const result = await query(
    'INSERT INTO esc_commitments (persona_id, content, due_date) VALUES ($1, $2, $3) RETURNING *',
    [personaId, content, dueDate || null]
  )
  return result.rows[0] as EscCommitment
}

export async function updateCommitmentStatus(id: string, status: string, reflection?: string) {
  const result = await query(
    `UPDATE esc_commitments SET status = $2, reflection = COALESCE($3, reflection),
     completed_at = CASE WHEN $2 = 'cumplido' THEN NOW() ELSE completed_at END
     WHERE id = $1 RETURNING *`,
    [id, status, reflection || null]
  )
  return result.rows[0] as EscCommitment
}

// Emotional Checkins
export async function createEmotionalCheckin(personaId: string, score: number, emoji?: string, note?: string) {
  const result = await query(
    'INSERT INTO esc_emotional_checkins (persona_id, score, emoji, note) VALUES ($1, $2, $3, $4) RETURNING *',
    [personaId, score, emoji || null, note || null]
  )
  return result.rows[0] as EscEmotionalCheckin
}

export async function getEmotionalCheckins(personaId: string, limit = 30) {
  const result = await query(
    'SELECT * FROM esc_emotional_checkins WHERE persona_id = $1 ORDER BY created_at DESC LIMIT $2',
    [personaId, limit]
  )
  return result.rows as EscEmotionalCheckin[]
}

// User Stats & Rankings
export async function getUserStats(personaId: string) {
  const result = await query('SELECT * FROM esc_user_stats WHERE persona_id = $1', [personaId])
  return result.rows[0] as EscUserStats | undefined
}

export async function getRankings(orgId: string, type: 'general' | 'streak' | 'comments' = 'general', limit = 10) {
  let orderBy: string
  switch (type) {
    case 'streak': orderBy = 'current_streak DESC'; break
    case 'comments': orderBy = 'comments_count DESC'; break
    default: orderBy = 'participation_points DESC'
  }

  const result = await query(
    `SELECT us.*, p.nombre, p.email
     FROM esc_user_stats us
     JOIN personas p ON p.id = us.persona_id
     JOIN org_contacts oc ON oc.persona_id = us.persona_id AND oc.org_id = $1
     ORDER BY ${orderBy}
     LIMIT $2`,
    [orgId, limit]
  )
  return result.rows
}

// Badges
export async function getUserBadges(personaId: string) {
  const result = await query(
    'SELECT * FROM esc_user_badges WHERE persona_id = $1 ORDER BY earned_at DESC',
    [personaId]
  )
  return result.rows as EscUserBadge[]
}

// Admin: Challenge CRUD
export async function getAllChallenges(orgId: string) {
  const result = await query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM esc_challenge_participants cp WHERE cp.challenge_id = c.id) as participants_count
     FROM esc_challenges c
     WHERE c.org_id = $1
     ORDER BY c.created_at DESC`,
    [orgId]
  )
  return result.rows
}

export async function createChallenge(orgId: string, data: {
  title: string; description?: string; duration_days: number
  start_date?: string; end_date?: string; instructions?: string
  badge_name?: string; badge_image_url?: string; is_active?: boolean
  created_by?: string
}) {
  const result = await query(
    `INSERT INTO esc_challenges (org_id, title, description, duration_days, start_date, end_date, instructions, badge_name, badge_image_url, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [orgId, data.title, data.description || null, data.duration_days, data.start_date || null, data.end_date || null, data.instructions || null, data.badge_name || null, data.badge_image_url || null, data.is_active ?? true, data.created_by || null]
  )
  return result.rows[0] as EscChallenge
}

export async function updateChallenge(id: string, data: Partial<EscChallenge>) {
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
    `UPDATE esc_challenges SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] as EscChallenge
}

export async function deleteChallenge(id: string) {
  await query('DELETE FROM esc_challenges WHERE id = $1', [id])
}

// Admin: Badge Types CRUD
export async function getBadgeTypes(orgId: string) {
  const result = await query(
    `SELECT bt.*,
       (SELECT COUNT(*) FROM esc_user_badges ub WHERE ub.badge_name = bt.slug) as awarded_count
     FROM esc_badge_types bt
     WHERE bt.org_id = $1
     ORDER BY bt.category, bt.name`,
    [orgId]
  )
  return result.rows
}

export async function createBadgeType(orgId: string, data: {
  slug: string; name: string; description?: string; icon?: string; color?: string
  category?: string; requirement_type?: string; requirement_value?: number
  points_awarded?: number; is_active?: boolean
}) {
  const result = await query(
    `INSERT INTO esc_badge_types (org_id, slug, name, description, icon, color, category, requirement_type, requirement_value, points_awarded, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [orgId, data.slug, data.name, data.description || null, data.icon || null, data.color || null, data.category || null, data.requirement_type || null, data.requirement_value || null, data.points_awarded || 0, data.is_active ?? true]
  )
  return result.rows[0]
}

export async function updateBadgeType(id: string, data: Record<string, unknown>) {
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
    `UPDATE esc_badge_types SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0]
}

export async function deleteBadgeType(id: string) {
  await query('DELETE FROM esc_badge_types WHERE id = $1', [id])
}
