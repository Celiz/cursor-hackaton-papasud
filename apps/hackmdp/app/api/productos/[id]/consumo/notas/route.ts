import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

export const revalidate = 0;

const upsertSchema = z.object({
  cliente_id: z.string().uuid(),
  notas: z.string(),
});

/**
 * POST — Upsert commercial notes for a product-client pair.
 * [id] = producto_id
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: producto_id } = await params;
    const body = await request.json();

    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cliente_id, notas } = parsed.data;

    const result = await query(
      `INSERT INTO producto_consumo_notas (org_id, producto_id, cliente_id, notas)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (org_id, producto_id, cliente_id) DO UPDATE SET notas = $4, updated_at = now()
       RETURNING *`,
      [session.org_id, producto_id, cliente_id, notas]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/productos/[id]/consumo/notas:', error);
    return NextResponse.json(
      { error: 'Error al guardar notas de consumo', details: error.message },
      { status: 500 }
    );
  }
}
