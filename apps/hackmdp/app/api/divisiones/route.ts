import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DIVISION_COLOR_CLAVES } from '@/lib/division-colores';

export const revalidate = 0;

/**
 * Catálogo de divisiones de cliente. Mismo molde que /api/servicio-tipos.
 *
 * El valor se sigue guardando como TEXT en clientes.division: esta tabla manda
 * qué se OFRECE en el desplegable, no qué hay guardado. Por eso borrar una
 * división no toca a los clientes que ya la tienen (ver DELETE).
 */

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const includeInactive =
      new URL(request.url).searchParams.get('include_inactive') === 'true';

    const result = await query(
      `SELECT d.*,
              (SELECT COUNT(*)::int FROM clientes c
                WHERE c.org_id = d.org_id AND c.division = d.nombre) AS clientes_count
         FROM cliente_divisiones d
        WHERE d.org_id = $1
          ${includeInactive ? '' : 'AND d.activo = true'}
        ORDER BY d.orden ASC NULLS LAST, d.nombre ASC`,
      [session.org_id]
    );
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error in GET /api/divisiones:', error);
    return NextResponse.json(
      { error: 'Error al cargar divisiones', details: error.message },
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
    const nombre = String(body.nombre ?? '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (body.color && !DIVISION_COLOR_CLAVES.includes(body.color)) {
      return NextResponse.json({ error: 'Color desconocido' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO cliente_divisiones (org_id, nombre, color, orden, activo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (org_id, nombre) DO NOTHING
       RETURNING *`,
      [session.org_id, nombre, body.color || null, body.orden ?? 99, body.activo ?? true]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ya existe una división con ese nombre' }, { status: 409 });
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/divisiones:', error);
    return NextResponse.json(
      { error: 'Error al crear la división', details: error.message },
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
    if (!body.id) {
      return NextResponse.json({ error: 'Falta el id' }, { status: 400 });
    }
    if (body.color && !DIVISION_COLOR_CLAVES.includes(body.color)) {
      return NextResponse.json({ error: 'Color desconocido' }, { status: 400 });
    }

    const anterior = await query(
      `SELECT nombre FROM cliente_divisiones WHERE id = $1 AND org_id = $2`,
      [body.id, session.org_id]
    );
    if (anterior.rows.length === 0) {
      return NextResponse.json({ error: 'División no encontrada' }, { status: 404 });
    }
    const nombreAnterior = anterior.rows[0].nombre;
    const nombreNuevo = body.nombre !== undefined ? String(body.nombre).trim() : nombreAnterior;
    if (!nombreNuevo) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const result = await query(
      `UPDATE cliente_divisiones
          SET nombre = $1,
              color = COALESCE($2, color),
              orden = COALESCE($3, orden),
              activo = COALESCE($4, activo),
              updated_at = NOW()
        WHERE id = $5 AND org_id = $6
        RETURNING *`,
      [nombreNuevo, body.color ?? null, body.orden ?? null, body.activo ?? null, body.id, session.org_id]
    );

    // clientes.division guarda el NOMBRE, no el id: si se renombra la división
    // hay que arrastrar a los clientes o quedan apuntando a un nombre que ya no
    // existe (y desaparecerian del desplegable sin aviso).
    if (nombreNuevo !== nombreAnterior) {
      await query(
        `UPDATE clientes SET division = $1 WHERE org_id = $2 AND division = $3`,
        [nombreNuevo, session.org_id, nombreAnterior]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una división con ese nombre' }, { status: 409 });
    }
    console.error('Error in PATCH /api/divisiones:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la división', details: error.message },
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

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Falta el id' }, { status: 400 });
    }

    const div = await query(
      `SELECT nombre FROM cliente_divisiones WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );
    if (div.rows.length === 0) {
      return NextResponse.json({ error: 'División no encontrada' }, { status: 404 });
    }

    // Si hay clientes usándola no se borra: se desactiva. Borrarla los dejaría
    // con una división que no existe en ningún lado, y el dato de esos clientes
    // no es nuestro para tirarlo.
    const enUso = await query(
      `SELECT COUNT(*)::int AS c FROM clientes WHERE org_id = $1 AND division = $2`,
      [session.org_id, div.rows[0].nombre]
    );
    if (enUso.rows[0].c > 0) {
      await query(
        `UPDATE cliente_divisiones SET activo = false, updated_at = NOW()
          WHERE id = $1 AND org_id = $2`,
        [id, session.org_id]
      );
      return NextResponse.json({
        desactivada: true,
        clientes: enUso.rows[0].c,
        mensaje: `La división quedó desactivada (no se ofrece más) porque ${enUso.rows[0].c} cliente(s) la tienen asignada.`,
      });
    }

    await query(`DELETE FROM cliente_divisiones WHERE id = $1 AND org_id = $2`, [id, session.org_id]);
    return NextResponse.json({ borrada: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/divisiones:', error);
    return NextResponse.json(
      { error: 'Error al borrar la división', details: error.message },
      { status: 500 }
    );
  }
}
