import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  GEST1E_USER_ID,
  GEST1E_EMAIL,
  GEST1E_NOMBRE,
  isGest1eEnabledFor,
} from '@/lib/gest1e';

export const revalidate = 0;

/**
 * GET /api/users
 * Lista todos los usuarios del sistema (para chat interno)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Find current user's users.id by email
    const currentUser = await query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [session.email]
    );
    const currentUserId = currentUser.rows[0]?.id;

    const result = await query(`
      SELECT id, nombre, email FROM (
        SELECT DISTINCT ON (u.id)
          u.id,
          u.email,
          COALESCE(u.nombre_completo, u.email) as nombre
        FROM users u
        INNER JOIN app_users apu ON apu.id = u.id
        INNER JOIN auth_credentials ac ON ac.email = u.email
        INNER JOIN org_members om ON om.persona_id = ac.persona_id AND om.org_id = $2
        WHERE u.id != $1
        ORDER BY u.id
      ) t ORDER BY nombre ASC
    `, [currentUserId || '00000000-0000-0000-0000-000000000000', session.org_id]);

    const users = result.rows || [];

    if (isGest1eEnabledFor(session.org_id)) {
      users.unshift({
        id: GEST1E_USER_ID,
        nombre: GEST1E_NOMBRE,
        email: GEST1E_EMAIL,
      });
    }

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios', details: error.message },
      { status: 500 }
    );
  }
}
