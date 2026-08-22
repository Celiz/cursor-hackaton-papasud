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
      SELECT * FROM categoria_personas
      WHERE activo = true AND org_id = $1
      ORDER BY orden ASC
    `, [session.org_id]);
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error in GET /api/categoria-personas:', error);
    return NextResponse.json(
      { error: 'Error al cargar categorías', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const result = await query(
      `INSERT INTO categoria_personas (nombre, descripcion, orden, activo, org_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [body.nombre, body.descripcion || null, body.orden || 0, body.activo ?? true, session.org_id]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/categoria-personas:', error);
    return NextResponse.json(
      { error: 'Error al crear categoría', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    params.push(id);
    params.push(session.org_id);
    const result = await query(
      `UPDATE categoria_personas SET ${fields.join(', ')} WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in PATCH /api/categoria-personas:', error);
    return NextResponse.json(
      { error: 'Error al actualizar categoría', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    await query(`DELETE FROM categoria_personas WHERE id = $1 AND org_id = $2`, [id, session.org_id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/categoria-personas:', error);
    return NextResponse.json(
      { error: 'Error al eliminar categoría', details: error.message },
      { status: 500 }
    );
  }
}
