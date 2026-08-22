import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

/**
 * GET /api/productos/sugerencias?q=texto&limit=8
 * Sugerencias de productos por SIMILITUD DE NOMBRE (trigram / pg_trgm). Sirve para vincular
 * ítems de listas de proveedor cuyo código no matchea pero el nombre se parece
 * (ej. "Controlador digital G-142D" ~ "CONTROLADOR DIGITAL CENTRIFUGA G-142D").
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '8', 10) || 8, 1), 20);
    if (q.length < 2) return NextResponse.json({ sugerencias: [] });

    const res = await query(`
      SELECT id, codigo, nombre, precio_costo, ROUND(sim::numeric, 2) AS score
      FROM (
        SELECT id, codigo, nombre, precio_costo, similarity(nombre, $2) AS sim
        FROM productos
        WHERE org_id = $1
      ) t
      WHERE sim > 0.15
      ORDER BY sim DESC
      LIMIT $3
    `, [session.org_id, q, limit]);

    return NextResponse.json({ sugerencias: res.rows });
  } catch (error: any) {
    console.error('Error /api/productos/sugerencias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
