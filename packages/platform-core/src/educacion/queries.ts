import { query } from '@locus/db'
import type {
  EduConcept, EduLesson, EduMapping, EduUserProgress,
  EduUserStats, EduConceptNote, EduLessonConDependencias,
  EduLessonConProgreso, EduConceptConLessons, EduNivelResumen,
} from '@locus/db/schema/educacion'

// ============================================================================
// CONCEPTS
// ============================================================================

export async function getAllConcepts() {
  const result = await query(
    `SELECT * FROM edu_concepts ORDER BY nivel_origen ASC, nombre ASC`
  )
  return result.rows as EduConcept[]
}

export async function getConceptById(id: string) {
  const result = await query(
    'SELECT * FROM edu_concepts WHERE id = $1',
    [id]
  )
  return result.rows[0] as EduConcept | undefined
}

export async function getConceptsByNivel(nivel: number) {
  const result = await query(
    'SELECT * FROM edu_concepts WHERE nivel_origen = $1 ORDER BY nombre ASC',
    [nivel]
  )
  return result.rows as EduConcept[]
}

export async function getConceptWithLessons(conceptId: string): Promise<EduConceptConLessons | undefined> {
  const concept = await getConceptById(conceptId)
  if (!concept) return undefined

  const lessonsResult = await query(
    `SELECT l.id, l.titulo, l.nivel, l.estado
     FROM edu_lessons l
     JOIN edu_lesson_concepts lc ON l.id = lc.lesson_id
     WHERE lc.concept_id = $1
     ORDER BY l.nivel ASC, l.order_index ASC`,
    [conceptId]
  )

  return {
    ...concept,
    lessons: lessonsResult.rows,
  }
}

// ============================================================================
// LESSONS
// ============================================================================

export async function getAllLessons() {
  const result = await query(
    `SELECT * FROM edu_lessons ORDER BY nivel ASC, order_index ASC`
  )
  return result.rows as EduLesson[]
}

export async function getPublishedLessons() {
  const result = await query(
    `SELECT * FROM edu_lessons WHERE estado = 'publicado' ORDER BY nivel ASC, order_index ASC`
  )
  return result.rows as EduLesson[]
}

export async function getLessonsByNivel(nivel: number) {
  const result = await query(
    `SELECT * FROM edu_lessons WHERE nivel = $1 ORDER BY order_index ASC`,
    [nivel]
  )
  return result.rows as EduLesson[]
}

export async function getLessonById(id: string) {
  const result = await query(
    'SELECT * FROM edu_lessons WHERE id = $1',
    [id]
  )
  return result.rows[0] as EduLesson | undefined
}

export async function getLessonWithDependencies(lessonId: string): Promise<EduLessonConDependencias | undefined> {
  const lesson = await getLessonById(lessonId)
  if (!lesson) return undefined

  const [depsResult, unblocksResult, conceptsResult] = await Promise.all([
    query(
      `SELECT depends_on FROM edu_lesson_dependencies WHERE lesson_id = $1`,
      [lessonId]
    ),
    query(
      `SELECT lesson_id FROM edu_lesson_dependencies WHERE depends_on = $1`,
      [lessonId]
    ),
    query(
      `SELECT c.id, c.nombre, c.definicion_corta, c.tipo, lc.is_primary
       FROM edu_concepts c
       JOIN edu_lesson_concepts lc ON c.id = lc.concept_id
       WHERE lc.lesson_id = $1
       ORDER BY lc.is_primary DESC, c.nombre ASC`,
      [lessonId]
    ),
  ])

  return {
    ...lesson,
    dependencias: depsResult.rows.map(r => r.depends_on),
    desbloquea: unblocksResult.rows.map(r => r.lesson_id),
    conceptos: conceptsResult.rows,
  }
}

export async function getLessonsForNavigation() {
  const result = await query(
    `SELECT l.id, l.titulo, l.nivel, l.estado, l.order_index,
            COALESCE(
              (SELECT json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'is_primary', lc.is_primary))
               FROM edu_lesson_concepts lc
               JOIN edu_concepts c ON c.id = lc.concept_id
               WHERE lc.lesson_id = l.id),
              '[]'
            ) as conceptos
     FROM edu_lessons l
     WHERE l.estado = 'publicado'
     ORDER BY l.nivel ASC, l.order_index ASC`
  )
  return result.rows
}

// ============================================================================
// MAPPINGS
// ============================================================================

export async function getMappingsByConcept(conceptId: string) {
  const result = await query(
    `SELECT m.*,
            cb.nombre as base_nombre,
            ce.nombre as equiv_nombre
     FROM edu_mappings m
     JOIN edu_concepts cb ON cb.id = m.concepto_base
     JOIN edu_concepts ce ON ce.id = m.concepto_equivalente
     WHERE m.concepto_base = $1 OR m.concepto_equivalente = $1
     ORDER BY m.nivel_base ASC`,
    [conceptId]
  )
  return result.rows
}

export async function getAllMappings() {
  const result = await query(
    `SELECT m.*,
            cb.nombre as base_nombre,
            ce.nombre as equiv_nombre
     FROM edu_mappings m
     JOIN edu_concepts cb ON cb.id = m.concepto_base
     JOIN edu_concepts ce ON ce.id = m.concepto_equivalente
     ORDER BY m.nivel_base ASC, m.nivel_equivalente ASC`
  )
  return result.rows
}

// ============================================================================
// USER PROGRESS
// ============================================================================

export async function getUserProgress(personaId: string) {
  const result = await query(
    `SELECT up.*, l.titulo, l.nivel, l.order_index
     FROM edu_user_progress up
     JOIN edu_lessons l ON l.id = up.lesson_id
     WHERE up.persona_id = $1
     ORDER BY l.nivel ASC, l.order_index ASC`,
    [personaId]
  )
  return result.rows as (EduUserProgress & { titulo: string; nivel: number; order_index: number })[]
}

export async function getUserLessonsWithProgress(personaId: string): Promise<EduLessonConProgreso[]> {
  const result = await query(
    `SELECT l.*,
            COALESCE(up.estado, 'bloqueado') as progreso,
            up.started_at,
            up.completed_at
     FROM edu_lessons l
     LEFT JOIN edu_user_progress up ON up.lesson_id = l.id AND up.persona_id = $1
     WHERE l.estado = 'publicado'
     ORDER BY l.nivel ASC, l.order_index ASC`,
    [personaId]
  )
  return result.rows as EduLessonConProgreso[]
}

export async function getUserNivelResumen(personaId: string): Promise<EduNivelResumen[]> {
  const result = await query(
    `SELECT
       l.nivel,
       COUNT(*) as total_lessons,
       COUNT(*) FILTER (WHERE COALESCE(up.estado, 'bloqueado') = 'completado') as completed,
       COUNT(*) FILTER (WHERE COALESCE(up.estado, 'bloqueado') = 'en_progreso') as in_progress,
       COUNT(*) FILTER (WHERE COALESCE(up.estado, 'bloqueado') = 'disponible') as available,
       COUNT(*) FILTER (WHERE COALESCE(up.estado, 'bloqueado') = 'bloqueado') as blocked
     FROM edu_lessons l
     LEFT JOIN edu_user_progress up ON up.lesson_id = l.id AND up.persona_id = $1
     WHERE l.estado = 'publicado'
     GROUP BY l.nivel
     ORDER BY l.nivel ASC`,
    [personaId]
  )

  const EDU_NIVEL_NOMBRES: Record<number, string> = {
    0: 'Lentes de Observación',
    1: 'Materia y Energía',
    2: 'Organización Molecular',
    3: 'Sistemas Vivos',
    4: 'Redes e Información',
    5: 'Sociedad',
  }

  return result.rows.map(r => ({
    nivel: r.nivel,
    nombre: EDU_NIVEL_NOMBRES[r.nivel] || `Escala ${r.nivel}`,
    total_lessons: parseInt(r.total_lessons),
    completed: parseInt(r.completed),
    in_progress: parseInt(r.in_progress),
    available: parseInt(r.available),
    blocked: parseInt(r.blocked),
  }))
}

export async function startLesson(personaId: string, lessonId: string) {
  const result = await query(
    `INSERT INTO edu_user_progress (persona_id, lesson_id, estado, started_at)
     VALUES ($1, $2, 'en_progreso', NOW())
     ON CONFLICT (persona_id, lesson_id)
     DO UPDATE SET estado = 'en_progreso', started_at = COALESCE(edu_user_progress.started_at, NOW())
     RETURNING *`,
    [personaId, lessonId]
  )
  return result.rows[0] as EduUserProgress
}

export async function completeLesson(personaId: string, lessonId: string, notes?: string) {
  const result = await query(
    `INSERT INTO edu_user_progress (persona_id, lesson_id, estado, completed_at, notes)
     VALUES ($1, $2, 'completado', NOW(), $3)
     ON CONFLICT (persona_id, lesson_id)
     DO UPDATE SET estado = 'completado', completed_at = NOW(), notes = COALESCE($3, edu_user_progress.notes)
     RETURNING *`,
    [personaId, lessonId, notes || null]
  )

  // Unlock dependent lessons
  await unlockDependentLessons(personaId, lessonId)

  // Update user stats
  await updateUserStats(personaId)

  return result.rows[0] as EduUserProgress
}

export async function initializeUserProgress(personaId: string) {
  // Get all published lessons with no dependencies (entry points)
  const entryLessons = await query(
    `SELECT l.id FROM edu_lessons l
     WHERE l.estado = 'publicado'
     AND NOT EXISTS (
       SELECT 1 FROM edu_lesson_dependencies ld WHERE ld.lesson_id = l.id
     )`
  )

  // Mark entry lessons as available
  for (const lesson of entryLessons.rows) {
    await query(
      `INSERT INTO edu_user_progress (persona_id, lesson_id, estado)
       VALUES ($1, $2, 'disponible')
       ON CONFLICT (persona_id, lesson_id) DO NOTHING`,
      [personaId, lesson.id]
    )
  }

  return entryLessons.rows.length
}

async function unlockDependentLessons(personaId: string, completedLessonId: string) {
  // Find lessons that depend on the completed one
  const dependents = await query(
    `SELECT DISTINCT ld.lesson_id
     FROM edu_lesson_dependencies ld
     WHERE ld.depends_on = $1`,
    [completedLessonId]
  )

  for (const dep of dependents.rows) {
    // Check if ALL dependencies for this lesson are completed
    const unmet = await query(
      `SELECT COUNT(*) as unmet
       FROM edu_lesson_dependencies ld
       WHERE ld.lesson_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM edu_user_progress up
         WHERE up.persona_id = $2 AND up.lesson_id = ld.depends_on AND up.estado = 'completado'
       )`,
      [dep.lesson_id, personaId]
    )

    if (parseInt(unmet.rows[0].unmet) === 0) {
      // All deps met — unlock
      await query(
        `INSERT INTO edu_user_progress (persona_id, lesson_id, estado)
         VALUES ($1, $2, 'disponible')
         ON CONFLICT (persona_id, lesson_id)
         DO UPDATE SET estado = CASE
           WHEN edu_user_progress.estado = 'bloqueado' THEN 'disponible'
           ELSE edu_user_progress.estado
         END`,
        [personaId, dep.lesson_id]
      )
    }
  }
}

async function updateUserStats(personaId: string) {
  await query(
    `INSERT INTO edu_user_stats (persona_id, lessons_completed, lessons_in_progress, current_level, highest_lesson, last_activity_at)
     SELECT
       $1,
       COUNT(*) FILTER (WHERE up.estado = 'completado'),
       COUNT(*) FILTER (WHERE up.estado = 'en_progreso'),
       COALESCE(MAX(l.nivel) FILTER (WHERE up.estado = 'completado'), 0),
       (SELECT up2.lesson_id FROM edu_user_progress up2
        JOIN edu_lessons l2 ON l2.id = up2.lesson_id
        WHERE up2.persona_id = $1 AND up2.estado = 'completado'
        ORDER BY up2.completed_at DESC LIMIT 1),
       NOW()
     FROM edu_user_progress up
     JOIN edu_lessons l ON l.id = up.lesson_id
     WHERE up.persona_id = $1
     ON CONFLICT (persona_id)
     DO UPDATE SET
       lessons_completed = EXCLUDED.lessons_completed,
       lessons_in_progress = EXCLUDED.lessons_in_progress,
       current_level = EXCLUDED.current_level,
       highest_lesson = EXCLUDED.highest_lesson,
       last_activity_at = NOW()`,
    [personaId]
  )
}

// ============================================================================
// CONCEPT NOTES
// ============================================================================

export async function getConceptNotes(personaId: string, conceptId: string) {
  const result = await query(
    `SELECT * FROM edu_concept_notes
     WHERE persona_id = $1 AND concept_id = $2
     ORDER BY created_at DESC`,
    [personaId, conceptId]
  )
  return result.rows as EduConceptNote[]
}

export async function createConceptNote(personaId: string, conceptId: string, content: string) {
  const result = await query(
    `INSERT INTO edu_concept_notes (persona_id, concept_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [personaId, conceptId, content]
  )
  return result.rows[0] as EduConceptNote
}

// ============================================================================
// USER STATS
// ============================================================================

export async function getUserStats(personaId: string) {
  const result = await query(
    'SELECT * FROM edu_user_stats WHERE persona_id = $1',
    [personaId]
  )
  return result.rows[0] as EduUserStats | undefined
}
