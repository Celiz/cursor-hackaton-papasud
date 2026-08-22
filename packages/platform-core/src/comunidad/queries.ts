import { query } from '@locus/db'
import type { EscPost, EscComment, EscForumSpace } from '@locus/db/schema/escuela'

export async function getForumSpaces(orgId: string) {
  const result = await query(
    'SELECT * FROM esc_forum_spaces WHERE org_id = $1 AND is_archived = false ORDER BY order_index',
    [orgId]
  )
  return result.rows as EscForumSpace[]
}

export async function getPosts(orgId: string, options?: { spaceId?: string; limit?: number; offset?: number }) {
  const conditions = ['p.org_id = $1', 'p.is_thread_starter = true']
  const params: unknown[] = [orgId]

  if (options?.spaceId) {
    conditions.push(`p.space_id = $${params.length + 1}`)
    params.push(options.spaceId)
  }

  const limit = options?.limit || 20
  const offset = options?.offset || 0

  const result = await query(
    `SELECT p.*,
       per.nombre as autor_nombre,
       (SELECT COUNT(*) FROM esc_comments c WHERE c.post_id = p.id) as comments_count,
       (SELECT COUNT(*) FROM esc_likes l WHERE l.post_id = p.id) as likes_count
     FROM esc_posts p
     JOIN personas per ON per.id = p.persona_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.last_activity_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )
  return result.rows
}

export async function getPostById(id: string) {
  const result = await query(
    `SELECT p.*,
       per.nombre as autor_nombre,
       (SELECT COUNT(*) FROM esc_comments c WHERE c.post_id = p.id) as comments_count,
       (SELECT COUNT(*) FROM esc_likes l WHERE l.post_id = p.id) as likes_count
     FROM esc_posts p
     JOIN personas per ON per.id = p.persona_id
     WHERE p.id = $1`,
    [id]
  )
  return result.rows[0]
}

export async function createPost(orgId: string, personaId: string, data: { title?: string; content: string; space_id?: string; category?: string; tags?: string[]; is_anonymous?: boolean }) {
  const result = await query(
    `INSERT INTO esc_posts (org_id, persona_id, title, content, space_id, category, tags, is_anonymous)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [orgId, personaId, data.title || null, data.content, data.space_id || null, data.category || null, data.tags || null, data.is_anonymous || false]
  )
  return result.rows[0] as EscPost
}

export async function getComments(postId: string) {
  const result = await query(
    `SELECT c.*, per.nombre as autor_nombre
     FROM esc_comments c
     JOIN personas per ON per.id = c.persona_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId]
  )
  return result.rows
}

export async function createComment(orgId: string, postId: string, personaId: string, content: string) {
  const result = await query(
    `INSERT INTO esc_comments (org_id, post_id, persona_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [orgId, postId, personaId, content]
  )
  // Update post activity
  await query(
    'UPDATE esc_posts SET last_activity_at = NOW(), thread_replies_count = thread_replies_count + 1 WHERE id = $1',
    [postId]
  )
  return result.rows[0] as EscComment
}

// Admin: Forum Spaces CRUD
export async function createForumSpace(orgId: string, data: { slug: string; name: string; description?: string; icon?: string; color?: string; order_index?: number; is_private?: boolean }) {
  const result = await query(
    `INSERT INTO esc_forum_spaces (org_id, slug, name, description, icon, color, order_index, is_private)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [orgId, data.slug, data.name, data.description || null, data.icon || null, data.color || null, data.order_index || 0, data.is_private || false]
  )
  return result.rows[0] as EscForumSpace
}

export async function updateForumSpace(id: string, data: Partial<EscForumSpace>) {
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
    `UPDATE esc_forum_spaces SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] as EscForumSpace
}

export async function deleteForumSpace(id: string) {
  await query('DELETE FROM esc_forum_spaces WHERE id = $1', [id])
}

export async function deletePost(id: string) {
  await query('DELETE FROM esc_posts WHERE id = $1', [id])
}

export async function deleteComment(id: string) {
  await query('DELETE FROM esc_comments WHERE id = $1', [id])
}

export async function toggleLike(personaId: string, postId?: string, commentId?: string) {
  const existing = await query(
    'SELECT id FROM esc_likes WHERE persona_id = $1 AND post_id IS NOT DISTINCT FROM $2 AND comment_id IS NOT DISTINCT FROM $3',
    [personaId, postId || null, commentId || null]
  )
  if (existing.rows.length > 0) {
    await query('DELETE FROM esc_likes WHERE id = $1', [existing.rows[0].id])
    return { liked: false }
  }
  await query(
    'INSERT INTO esc_likes (persona_id, post_id, comment_id) VALUES ($1, $2, $3)',
    [personaId, postId || null, commentId || null]
  )
  return { liked: true }
}
