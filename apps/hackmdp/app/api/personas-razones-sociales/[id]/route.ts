import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

const EDITABLE_FIELDS = new Set([
  'tipo_relacion',
  'es_contacto_principal',
  'recibe_facturas',
  'recibe_presupuestos',
  'recibe_notificaciones',
  'activo',
  'fecha_inicio',
  'fecha_fin',
  'notas',
]);

const VALID_TIPOS = new Set([
  'contacto_principal',
  'contacto_ventas',
  'contacto_administrativo',
  'contacto_tecnico',
  'responsable_compras',
  'responsable_pagos',
  'otro',
]);

async function assertOrgOwnership(prsId: string, orgId: string): Promise<boolean> {
  const result = await query(
    `SELECT prs.id
     FROM personas_razones_sociales prs
     JOIN clientes c ON c.id = prs.razon_social_id
     WHERE prs.id = $1 AND c.org_id = $2`,
    [prsId, orgId]
  );
  return result.rows.length > 0;
}

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

    if (!(await assertOrgOwnership(id, session.org_id))) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    if (body.tipo_relacion && !VALID_TIPOS.has(body.tipo_relacion)) {
      return NextResponse.json({ error: 'tipo_relacion inválido' }, { status: 400 });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(body)) {
      if (!EDITABLE_FIELDS.has(key)) continue;
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
    }

    values.push(id);
    const result = await query(
      `UPDATE personas_razones_sociales
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in PATCH /api/personas-razones-sociales/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    if (!(await assertOrgOwnership(id, session.org_id))) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    await query(`DELETE FROM personas_razones_sociales WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/personas-razones-sociales/[id]:', error);
    return NextResponse.json(
      { error: 'Error al eliminar', details: error.message },
      { status: 500 }
    );
  }
}
