import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(`
      SELECT lp.*,
        (SELECT COUNT(*) FROM clientes c WHERE c.lista_precios_id = lp.id)::int as clientes_count,
        (SELECT COUNT(*) FROM lista_precios_items lpi
           JOIN productos p ON p.id = lpi.producto_id AND p.deleted_at IS NULL
           WHERE lpi.lista_id = lp.id)::int as excepciones_count
      FROM listas_precios lp
      WHERE lp.org_id = $1 AND lp.activa = true
      ORDER BY lp.orden ASC, lp.nombre ASC
    `, [session.org_id]);
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching listas de precios:', error);
    return NextResponse.json(
      { error: 'Error al cargar listas de precios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, codigo, descripcion, margen_porcentaje, orden } = body;

    if (!nombre || !codigo) {
      return NextResponse.json(
        { error: 'Nombre y código son requeridos' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO listas_precios (org_id, nombre, codigo, descripcion, margen_porcentaje, orden)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [session.org_id, nombre, codigo.toUpperCase(), descripcion || null, margen_porcentaje || 30, orden || 0]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating lista de precios:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'Ya existe una lista con ese código' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear lista de precios' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, nombre, codigo, descripcion, margen_porcentaje, orden, activa } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(nombre);
    }
    if (codigo !== undefined) {
      updates.push(`codigo = $${paramIndex++}`);
      values.push(codigo.toUpperCase());
    }
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex++}`);
      values.push(descripcion);
    }
    if (margen_porcentaje !== undefined) {
      updates.push(`margen_porcentaje = $${paramIndex++}`);
      values.push(margen_porcentaje);
    }
    if (orden !== undefined) {
      updates.push(`orden = $${paramIndex++}`);
      values.push(orden);
    }
    if (activa !== undefined) {
      updates.push(`activa = $${paramIndex++}`);
      values.push(activa);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    values.push(id);
    const idIndex = paramIndex++;
    values.push(session.org_id);
    const orgIndex = paramIndex;

    const result = await query(
      `UPDATE listas_precios SET ${updates.join(', ')} WHERE id = $${idIndex} AND org_id = $${orgIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lista de precios no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('Error updating lista de precios:', error);
    return NextResponse.json(
      { error: 'Error al actualizar lista de precios' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    // Soft delete - solo desactivamos
    const result = await query(
      `UPDATE listas_precios SET activa = false WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lista de precios no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Lista de precios desactivada' });
  } catch (error: unknown) {
    console.error('Error deleting lista de precios:', error);
    return NextResponse.json(
      { error: 'Error al eliminar lista de precios' },
      { status: 500 }
    );
  }
}
