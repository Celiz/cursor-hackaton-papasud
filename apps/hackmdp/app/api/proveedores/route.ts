import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const estado = searchParams.get('estado');
    const search = searchParams.get('search');

    let sql = `SELECT * FROM proveedores WHERE org_id = $1`;
    const params: any[] = [session.org_id];

    if (estado && estado !== 'todos') {
      params.push(estado);
      sql += ` AND estado = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (nombre ILIKE $${params.length} OR cuit ILIKE $${params.length})`;
    }

    sql += ` ORDER BY nombre ASC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error in GET /api/proveedores:', error);
    return NextResponse.json(
      { error: 'Error al cargar proveedores', details: error.message },
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
    const {
      nombre,
      cuit,
      email,
      telefono,
      direccion,
      localidad,
      provincia,
      codigo_postal,
      condiciones_pago,
      moneda,
      cuenta_bancaria,
      cbu,
      alias_cbu,
      notas,
      estado = 'activo'
    } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO proveedores (
        nombre, cuit, email, telefono, direccion, localidad, provincia,
        codigo_postal, condiciones_pago, moneda, cuenta_bancaria, cbu, alias_cbu, notas, estado, org_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        nombre,
        cuit || null,
        email || [],
        telefono || [],
        direccion || null,
        localidad || null,
        provincia || null,
        codigo_postal || null,
        condiciones_pago || null,
        moneda || 'ARS',
        cuenta_bancaria || null,
        cbu || null,
        alias_cbu || null,
        notas || null,
        estado,
        session.org_id
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/proveedores:', error);
    return NextResponse.json(
      { error: 'Error al crear proveedor', details: error.message },
      { status: 500 }
    );
  }
}
