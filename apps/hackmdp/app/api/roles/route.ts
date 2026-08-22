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

    const result = await query(
      `SELECT * FROM roles WHERE org_id = $1 ORDER BY nombre ASC`,
      [session.org_id]
    );

    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error in GET /api/roles:', error);
    return NextResponse.json(
      { error: 'Error al obtener roles', details: error.message },
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
    const { nombre, descripcion, color } = body;

    const result = await query(
      `INSERT INTO roles (nombre, descripcion, color, es_admin, org_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        nombre,
        descripcion || null,
        color || '#6366f1',
        false, // Roles custom nunca son admin
        session.org_id
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/roles:', error);
    return NextResponse.json(
      { error: 'Error al crear rol', details: error.message },
      { status: 500 }
    );
  }
}
