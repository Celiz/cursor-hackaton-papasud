import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

/**
 * GET /api/org-members
 *
 * Returns all members of the current org (from org_members + personas).
 * Used for @mention autocomplete in ComentariosTab.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(
      `SELECT
         om.persona_id,
         COALESCE(NULLIF(p.nombre_completo, ''), p.nombre) AS nombre
       FROM org_members om
       JOIN personas p ON p.id = om.persona_id
       WHERE om.org_id = $1
       ORDER BY nombre ASC`,
      [session.org_id]
    );

    return NextResponse.json(result.rows ?? []);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error in GET /api/org-members:', error);
    return NextResponse.json({ error: 'Error al obtener miembros', details: msg }, { status: 500 });
  }
}
