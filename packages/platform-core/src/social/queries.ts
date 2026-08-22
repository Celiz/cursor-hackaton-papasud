import { query } from '@locus/db'
import type { EscConnection, EscConversation, EscMessage, EscMentorProfile, EscMentorship, EscMentorshipRequest } from '@locus/db/schema/escuela'

// Connections
export async function getConnections(personaId: string, status = 'accepted') {
  const result = await query(
    `SELECT c.*,
       CASE WHEN c.requester_id = $1 THEN p2.nombre ELSE p1.nombre END as other_name,
       CASE WHEN c.requester_id = $1 THEN c.recipient_id ELSE c.requester_id END as other_id
     FROM esc_connections c
     JOIN personas p1 ON p1.id = c.requester_id
     JOIN personas p2 ON p2.id = c.recipient_id
     WHERE (c.requester_id = $1 OR c.recipient_id = $1) AND c.status = $2
     ORDER BY c.created_at DESC`,
    [personaId, status]
  )
  return result.rows
}

export async function sendConnectionRequest(orgId: string, requesterId: string, recipientId: string, message?: string) {
  const result = await query(
    `INSERT INTO esc_connections (org_id, requester_id, recipient_id, message)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (requester_id, recipient_id) DO NOTHING
     RETURNING *`,
    [orgId, requesterId, recipientId, message || null]
  )
  return result.rows[0] as EscConnection | undefined
}

export async function respondToConnection(id: string, status: 'accepted' | 'rejected') {
  const result = await query(
    'UPDATE esc_connections SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, status]
  )
  return result.rows[0] as EscConnection
}

// Messaging
export async function getConversations(personaId: string) {
  const result = await query(
    `SELECT c.*,
       CASE WHEN c.participant_1 = $1 THEN p2.nombre ELSE p1.nombre END as other_name,
       CASE WHEN c.participant_1 = $1 THEN c.participant_2 ELSE c.participant_1 END as other_id,
       (SELECT COUNT(*) FROM esc_messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.is_read = false) as unread_count,
       (SELECT content FROM esc_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_text
     FROM esc_conversations c
     JOIN personas p1 ON p1.id = c.participant_1
     JOIN personas p2 ON p2.id = c.participant_2
     WHERE c.participant_1 = $1 OR c.participant_2 = $1
     ORDER BY c.last_message_at DESC`,
    [personaId]
  )
  return result.rows
}

export async function getOrCreateConversation(orgId: string, user1Id: string, user2Id: string) {
  const [p1, p2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id]
  const existing = await query(
    'SELECT * FROM esc_conversations WHERE participant_1 = $1 AND participant_2 = $2',
    [p1, p2]
  )
  if (existing.rows.length > 0) return existing.rows[0] as EscConversation

  const result = await query(
    'INSERT INTO esc_conversations (org_id, participant_1, participant_2) VALUES ($1, $2, $3) RETURNING *',
    [orgId, p1, p2]
  )
  return result.rows[0] as EscConversation
}

export async function getMessages(conversationId: string, limit = 50, offset = 0) {
  const result = await query(
    `SELECT m.*, p.nombre as sender_name
     FROM esc_messages m
     JOIN personas p ON p.id = m.sender_id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  )
  return result.rows as (EscMessage & { sender_name: string })[]
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const result = await query(
    'INSERT INTO esc_messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
    [conversationId, senderId, content]
  )
  await query('UPDATE esc_conversations SET last_message_at = NOW() WHERE id = $1', [conversationId])
  return result.rows[0] as EscMessage
}

export async function markMessagesRead(conversationId: string, personaId: string) {
  await query(
    'UPDATE esc_messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false',
    [conversationId, personaId]
  )
}

// Directory
export async function getMemberDirectory(orgId: string) {
  const result = await query(
    `SELECT p.id, p.nombre, p.email, p.telefono,
       emp.avatar_url, emp.bio, emp.instagram, emp.profession,
       emp.location, emp.is_profile_public,
       om.rol,
       ms.plan as membership_plan, ms.status as membership_status, ms.is_fundadora
     FROM esc_member_profiles emp
     JOIN personas p ON p.id = emp.persona_id
     LEFT JOIN org_members om ON om.persona_id = p.id AND om.org_id = emp.org_id
     LEFT JOIN esc_memberships ms ON ms.persona_id = p.id AND ms.org_id = emp.org_id
     WHERE emp.org_id = $1
     ORDER BY p.nombre`,
    [orgId]
  )
  return result.rows
}

// Mentoring
export async function getAvailableMentors(orgId: string) {
  const result = await query(
    `SELECT mp.*, p.nombre, p.email
     FROM esc_mentor_profiles mp
     JOIN personas p ON p.id = mp.persona_id
     WHERE mp.org_id = $1 AND mp.is_available = true
     ORDER BY p.nombre`,
    [orgId]
  )
  return result.rows
}

export async function getMentorProfile(personaId: string) {
  const result = await query('SELECT * FROM esc_mentor_profiles WHERE persona_id = $1', [personaId])
  return result.rows[0] as EscMentorProfile | undefined
}

export async function createMentorshipRequest(orgId: string, menteeId: string, mentorId: string, message?: string, goals?: string) {
  const result = await query(
    `INSERT INTO esc_mentorship_requests (org_id, mentee_id, mentor_id, message, goals)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [orgId, menteeId, mentorId, message || null, goals || null]
  )
  return result.rows[0] as EscMentorshipRequest
}

export async function getActiveMentorships(personaId: string) {
  const result = await query(
    `SELECT ms.*,
       mentor.nombre as mentor_name,
       mentee.nombre as mentee_name
     FROM esc_mentorships ms
     JOIN personas mentor ON mentor.id = ms.mentor_id
     JOIN personas mentee ON mentee.id = ms.mentee_id
     WHERE (ms.mentor_id = $1 OR ms.mentee_id = $1) AND ms.status = 'active'`,
    [personaId]
  )
  return result.rows
}
