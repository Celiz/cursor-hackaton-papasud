import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(`
      SELECT DISTINCT COALESCE(cat.nombre, p.categoria) as nombre
      FROM productos p
      LEFT JOIN categorias cat ON p.categoria_id = cat.id
      WHERE p.org_id = $1
        AND p.deleted_at IS NULL
        AND COALESCE(cat.nombre, p.categoria) IS NOT NULL
      ORDER BY 1
    `, [session.org_id]);

    return NextResponse.json(result.rows.map(r => r.nombre));
  } catch (error: any) {
    console.error('Error in GET /api/categorias:', error);
    return NextResponse.json(
      { error: 'Error al obtener categorías', details: error.message },
      { status: 500 }
    );
  }
}
