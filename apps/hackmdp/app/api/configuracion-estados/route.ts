import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

// GET - Obtener estados de servicio o contables
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'servicio' o 'contable'

    let queryStr = `
      SELECT * FROM configuracion_estados
      WHERE activo = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (tipo) {
      queryStr += ` AND tipo = $${paramIndex++}`;
      params.push(tipo);
    }

    queryStr += ` ORDER BY orden ASC`;

    const result = await query(queryStr, params);

    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error fetching configuracion_estados:', error);
    return NextResponse.json(
      { error: 'Error al obtener estados', details: error.message },
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

    // Validación básica
    if (!body.tipo || !body.label || !body.value || !body.color) {
      return NextResponse.json(
        { error: 'Campos requeridos: tipo, label, value, color' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO configuracion_estados (tipo, label, value, color, icon, orden, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        body.tipo,
        body.label,
        body.value,
        body.color,
        body.icon || null,
        body.orden || 0,
        true,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating estado:', error);
    return NextResponse.json(
      { error: 'Error al crear estado', details: error.message },
      { status: 500 }
    );
  }
}
