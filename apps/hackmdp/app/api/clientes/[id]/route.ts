import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logActivity, generateDescription, detectChanges } from '@/lib/activity-logger';
import { getSession } from '@/lib/auth';

const LEGACY_CLIENT_ORGS = ['electromedicina'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Persona-based orgs: try org_contacts first
    if (!LEGACY_CLIENT_ORGS.includes(session.org_tipo || '')) {
      const ocResult = await query(
        `SELECT
          oc.id,
          oc.org_id,
          COALESCE(p.nombre || ' ' || COALESCE(p.apellido, ''), p.nombre) AS nombre,
          NULL AS nombre_fantasia,
          CASE WHEN p.documento_tipo IN ('CUIT', 'CUIL') THEN p.documento_nro ELSE NULL END AS cuit,
          p.email,
          p.telefono,
          p.direccion,
          p.ciudad AS localidad,
          p.provincia,
          CASE WHEN oc.activo THEN 'Activo' ELSE 'Inactivo' END AS estado,
          oc.condicion_iva,
          COALESCE(oc.saldo_a_favor, 0) AS saldo_a_favor,
          COALESCE(oc.saldo_a_favor_ivr, 0) AS saldo_a_favor_ivr,
          p.documento_tipo,
          p.documento_nro,
          oc.notas,
          p.created_at,
          p.updated_at
        FROM org_contacts oc
        JOIN personas p ON p.id = oc.persona_id
        WHERE oc.id = $1 AND oc.org_id = $2`,
        [id, session.org_id]
      );

      if (ocResult.rows.length > 0) {
        return NextResponse.json(ocResult.rows[0]);
      }
    }

    // Legacy clientes
    const result = await query(
      `SELECT c.*,
        ov.nombre as org_vinculada_nombre,
        lp.nombre as lista_precios_nombre,
        lp.margen_porcentaje as lista_precios_margen,
        CASE WHEN c.transporte_id IS NOT NULL THEN
          json_build_object(
            'id', t.id,
            'nombre', t.nombre,
            'tipo', t.tipo,
            'telefono', t.telefono
          )
        ELSE NULL END as transporte,
        COALESCE(
          (SELECT json_agg(json_build_object('id', tg.id, 'nombre', tg.nombre, 'color', tg.color) ORDER BY tg.nombre)
           FROM cliente_tags ct JOIN tags tg ON ct.tag_id = tg.id WHERE ct.cliente_id = c.id),
          '[]'::json
        ) as tags
       FROM clientes c
       LEFT JOIN transportes t ON c.transporte_id = t.id
       LEFT JOIN organizations ov ON c.org_vinculada_id = ov.id
       LEFT JOIN listas_precios lp ON lp.id = c.lista_precios_id
       WHERE c.id = $1 AND c.org_id = $2`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in GET /api/clientes/[id]:', error);
    return NextResponse.json(
      { error: 'Error al cargar cliente', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if this is an org_contact (persona-based client)
    const ocCheck = await query(
      `SELECT oc.id, oc.persona_id FROM org_contacts oc WHERE oc.id = $1 AND oc.org_id = $2`,
      [id, session.org_id]
    );

    if (ocCheck.rows.length > 0) {
      return patchPersonaCliente(id, ocCheck.rows[0].persona_id, body, session);
    }

    // Legacy clientes PATCH
    const previousResult = await query(
      `SELECT * FROM clientes WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );
    const previousData = previousResult.rows[0];

    if (!previousData) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const { tags: tagIds, ...updateData } = body;

    // Sanitize nullable UUID fields: empty string → null
    const nullableUuidFields = ['lista_precios_id', 'transporte_id', 'org_vinculada_id'];
    for (const field of nullableUuidFields) {
      if (field in updateData && !updateData[field]) {
        updateData[field] = null;
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    let cliente;

    if (fields.length > 0) {
      values.push(id);
      values.push(session.org_id);
      const result = await query(
        `UPDATE clientes SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} RETURNING *`,
        values
      );
      cliente = result.rows[0];
    } else {
      cliente = previousData;
    }

    // Actualizar tags si se proporcionaron
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      await query(`DELETE FROM cliente_tags WHERE cliente_id = $1`, [id]);
      if (tagIds.length > 0) {
        const tagValues = tagIds.map((_: string, i: number) => `($1, $${i + 2})`).join(", ");
        await query(
          `INSERT INTO cliente_tags (cliente_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
          [id, ...tagIds]
        );
      }
    }

    // Detectar cambios y registrar actividad
    const changes = detectChanges(previousData, cliente);
    if (changes) {
      await logActivity({
        action: "actualizar",
        entityType: "cliente",
        entityId: cliente.id,
        entityName: cliente.nombre,
        description: generateDescription("actualizar", "cliente", cliente.nombre),
        previousData: changes.previous,
        newData: changes.current,
      });
    }

    return NextResponse.json(cliente);
  } catch (error: any) {
    console.error('Error in PATCH /api/clientes/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar cliente', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH for persona-based clients (org_contacts + personas)
async function patchPersonaCliente(
  contactId: string,
  personaId: string,
  body: any,
  session: { org_id?: string }
) {
  // Fields that go to org_contacts
  const ocFields = ['condicion_iva', 'saldo_a_favor', 'saldo_a_favor_ivr', 'notas', 'activo'];
  // Fields that go to personas
  const personaFields = ['nombre', 'apellido', 'email', 'telefono', 'direccion', 'ciudad', 'provincia', 'documento_tipo', 'documento_nro'];
  // Map legacy field names
  const fieldMap: Record<string, string> = { localidad: 'ciudad' };

  const ocUpdates: string[] = [];
  const ocValues: any[] = [];
  const pUpdates: string[] = [];
  const pValues: any[] = [];
  let ocIdx = 1;
  let pIdx = 1;

  for (const [key, value] of Object.entries(body)) {
    const mappedKey = fieldMap[key] || key;
    if (ocFields.includes(mappedKey)) {
      ocUpdates.push(`${mappedKey} = $${ocIdx}`);
      ocValues.push(value);
      ocIdx++;
    } else if (personaFields.includes(mappedKey)) {
      pUpdates.push(`${mappedKey} = $${pIdx}`);
      pValues.push(value);
      pIdx++;
    }
  }

  if (ocUpdates.length > 0) {
    ocValues.push(contactId);
    await query(
      `UPDATE org_contacts SET ${ocUpdates.join(', ')} WHERE id = $${ocIdx}`,
      ocValues
    );
  }

  if (pUpdates.length > 0) {
    pValues.push(personaId);
    await query(
      `UPDATE personas SET ${pUpdates.join(', ')}, updated_at = NOW() WHERE id = $${pIdx}`,
      pValues
    );
  }

  // Return updated data in same shape
  const result = await query(
    `SELECT
      oc.id,
      oc.org_id,
      COALESCE(p.nombre || ' ' || COALESCE(p.apellido, ''), p.nombre) AS nombre,
      NULL AS nombre_fantasia,
      CASE WHEN p.documento_tipo IN ('CUIT', 'CUIL') THEN p.documento_nro ELSE NULL END AS cuit,
      p.email,
      p.telefono,
      p.direccion,
      p.ciudad AS localidad,
      p.provincia,
      CASE WHEN oc.activo THEN 'Activo' ELSE 'Inactivo' END AS estado,
      oc.condicion_iva,
      COALESCE(oc.saldo_a_favor, 0) AS saldo_a_favor,
      COALESCE(oc.saldo_a_favor_ivr, 0) AS saldo_a_favor_ivr,
      p.created_at,
      p.updated_at
    FROM org_contacts oc
    JOIN personas p ON p.id = oc.persona_id
    WHERE oc.id = $1`,
    [contactId]
  );

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Check if it's an org_contact
    const ocCheck = await query(
      `SELECT id FROM org_contacts WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (ocCheck.rows.length > 0) {
      // Deactivate instead of deleting (personas are shared)
      await query(
        `UPDATE org_contacts SET activo = false WHERE id = $1 AND org_id = $2`,
        [id, session.org_id]
      );
      return NextResponse.json({ success: true });
    }

    // Legacy clientes
    const previousResult = await query(
      `SELECT * FROM clientes WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );
    const cliente = previousResult.rows[0];

    await query(`DELETE FROM clientes WHERE id = $1 AND org_id = $2`, [id, session.org_id]);

    if (cliente) {
      await logActivity({
        action: "eliminar",
        entityType: "cliente",
        entityId: id,
        entityName: cliente.nombre,
        description: generateDescription("eliminar", "cliente", cliente.nombre),
        previousData: cliente,
        important: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/clientes/[id]:', error);
    return NextResponse.json(
      { error: 'Error al eliminar cliente', details: error.message },
      { status: 500 }
    );
  }
}
