import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

// GET - Obtener todos los estados
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    let queryStr = `SELECT * FROM configuracion_estados WHERE activo = true AND org_id = $1`;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (tipo) {
      queryStr += ` AND tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }

    queryStr += ` ORDER BY orden ASC`;

    const result = await query(queryStr, params);
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error in GET /api/configuracion/estados:', error);
    return NextResponse.json(
      { error: 'Error al cargar estados', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo estado
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, label, value, color, icon, orden } = body;

    if (!tipo || !label || !value || !color) {
      return NextResponse.json(
        { error: 'Campos requeridos: tipo, label, value, color' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un estado con ese value y tipo
    const existingResult = await query(
      `SELECT id FROM configuracion_estados WHERE tipo = $1 AND value = $2 AND activo = true AND org_id = $3`,
      [tipo, value, session.org_id]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un estado con ese valor' },
        { status: 400 }
      );
    }

    // Si no se proporciona orden, obtener el máximo y sumar 1
    let finalOrden = orden;
    if (!finalOrden) {
      const maxOrdenResult = await query(
        `SELECT orden FROM configuracion_estados WHERE tipo = $1 AND org_id = $2 ORDER BY orden DESC LIMIT 1`,
        [tipo, session.org_id]
      );
      finalOrden = maxOrdenResult.rows[0] ? maxOrdenResult.rows[0].orden + 1 : 1;
    }

    const result = await query(
      `INSERT INTO configuracion_estados (tipo, label, value, color, icon, orden, activo, org_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [tipo, label, value, color, icon || null, finalOrden, true, session.org_id]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/configuracion/estados:', error);
    return NextResponse.json(
      { error: 'Error al crear estado', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, label, value, color, icon, orden, activo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (label !== undefined) {
      updates.push(`label = $${paramIndex}`);
      params.push(label);
      paramIndex++;
    }
    if (value !== undefined) {
      updates.push(`value = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      params.push(color);
      paramIndex++;
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex}`);
      params.push(icon);
      paramIndex++;
    }
    if (orden !== undefined) {
      updates.push(`orden = $${paramIndex}`);
      params.push(orden);
      paramIndex++;
    }
    if (activo !== undefined) {
      updates.push(`activo = $${paramIndex}`);
      params.push(activo);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    params.push(id);
    params.push(session.org_id);
    const result = await query(
      `UPDATE configuracion_estados SET ${updates.join(', ')} WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in PATCH /api/configuracion/estados:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar estado (soft delete)
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const result = await query(
      `UPDATE configuracion_estados SET activo = false WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, session.org_id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in DELETE /api/configuracion/estados:', error);
    return NextResponse.json(
      { error: 'Error al eliminar estado', details: error.message },
      { status: 500 }
    );
  }
}
