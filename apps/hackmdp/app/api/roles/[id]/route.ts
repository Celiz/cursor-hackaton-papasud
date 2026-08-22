import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, color } = body;

    const result = await query(
      `UPDATE roles SET nombre = $1, descripcion = $2, color = $3, updated_at = NOW()
       WHERE id = $4 AND org_id = $5 RETURNING *`,
      [nombre, descripcion, color, id, session.org_id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in PATCH /api/roles/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar rol', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que no sea un rol admin
    const roleResult = await query(
      `SELECT es_admin FROM roles WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (roleResult.rows[0]?.es_admin) {
      return NextResponse.json(
        { error: 'No se puede eliminar el rol de Admin' },
        { status: 400 }
      );
    }

    await query(`DELETE FROM roles WHERE id = $1 AND org_id = $2`, [id, session.org_id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/roles/[id]:', error);
    return NextResponse.json(
      { error: 'Error al eliminar rol', details: error.message },
      { status: 500 }
    );
  }
}
