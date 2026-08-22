import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT * FROM proveedores WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in GET /api/proveedores/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener proveedor', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
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
      estado,
      dias_aviso_vencimiento,
      dias_antiguedad_aviso
    } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE proveedores SET
        nombre = $1,
        cuit = $2,
        email = $3,
        telefono = $4,
        direccion = $5,
        localidad = $6,
        provincia = $7,
        codigo_postal = $8,
        condiciones_pago = $9,
        moneda = $10,
        cuenta_bancaria = $11,
        cbu = $12,
        alias_cbu = $13,
        notas = $14,
        estado = $15,
        dias_aviso_vencimiento = $16,
        dias_antiguedad_aviso = $17
      WHERE id = $18 AND org_id = $19
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
        estado || 'activo',
        dias_aviso_vencimiento === '' || dias_aviso_vencimiento == null ? null : Number(dias_aviso_vencimiento),
        dias_antiguedad_aviso === '' || dias_antiguedad_aviso == null ? null : Number(dias_antiguedad_aviso),
        id,
        session.org_id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in PUT /api/proveedores/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar proveedor', details: error.message },
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

    // Verificar si tiene remitos o pagos asociados
    const checkRemitos = await query(
      `SELECT COUNT(*) as count FROM remitos_compra WHERE proveedor_id = $1`,
      [id]
    );

    if (parseInt(checkRemitos.rows[0]?.count || '0') > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el proveedor porque tiene remitos de compra asociados' },
        { status: 400 }
      );
    }

    const result = await query(
      `DELETE FROM proveedores WHERE id = $1 AND org_id = $2 RETURNING id`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error in DELETE /api/proveedores/[id]:', error);
    return NextResponse.json(
      { error: 'Error al eliminar proveedor', details: error.message },
      { status: 500 }
    );
  }
}
