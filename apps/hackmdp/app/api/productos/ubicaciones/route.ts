import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

/**
 * GET /api/productos/ubicaciones?deposito_id=xxx
 *
 * Devuelve la lista de ubicaciones (estantes / pallets / etc) que ya están
 * en uso en la org, opcionalmente scope por depósito. Sirve para poblar un
 * combobox y reusar ubicaciones existentes en lugar de texto libre.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const depositoId = new URL(request.url).searchParams.get('deposito_id');

    let sql = `
      SELECT DISTINCT ubicacion
      FROM productos
      WHERE org_id = $1
        AND ubicacion IS NOT NULL
        AND TRIM(ubicacion) != ''
        AND deleted_at IS NULL
    `;
    const params: any[] = [session.org_id];
    if (depositoId) {
      sql += ` AND deposito_id = $2`;
      params.push(depositoId);
    }
    sql += ` ORDER BY ubicacion ASC LIMIT 500`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows.map((r: any) => r.ubicacion));
  } catch (error: any) {
    console.error('Error GET /api/productos/ubicaciones:', error);
    return NextResponse.json(
      { error: 'Error al cargar ubicaciones', details: error.message },
      { status: 500 }
    );
  }
}
