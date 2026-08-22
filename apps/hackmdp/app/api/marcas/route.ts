import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

/**
 * GET /api/marcas
 * Catálogo de marcas de equipos por organización.
 * ?include_inactive=true para incluir las desactivadas.
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
      `SELECT * FROM marcas
       WHERE org_id = $1
         ${includeInactive ? '' : 'AND activo = true'}
       ORDER BY nombre ASC`,
      [session.org_id]
    );

    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error GET /api/marcas:', error);
    return NextResponse.json(
      { error: error?.message || 'Error inesperado' },
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
    const nombre = String(body.nombre || '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 });
    }

    // Dedupe case-insensitive: si ya existe, lo reactivamos
    const existing = await query(
      `SELECT * FROM marcas
       WHERE org_id = $1 AND LOWER(TRIM(nombre)) = LOWER($2)
       LIMIT 1`,
      [session.org_id, nombre]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (!row.activo) {
        const reactivated = await query(
          `UPDATE marcas SET activo = true, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [row.id]
        );
        return NextResponse.json(reactivated.rows[0], { status: 200 });
      }
      return NextResponse.json(row, { status: 200 });
    }

    const result = await query(
      `INSERT INTO marcas (org_id, nombre, slug, logo_url, sitio_web, activo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [
        session.org_id,
        nombre,
        body.slug || null,
        body.logo_url || null,
        body.sitio_web || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error POST /api/marcas:', error);
    return NextResponse.json(
      { error: error?.message || 'Error inesperado' },
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
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const allowed = ['nombre', 'slug', 'logo_url', 'sitio_web', 'activo'];
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(updates)) {
      if (!allowed.includes(k)) continue;
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    values.push(id);
    const idIdx = i++;
    values.push(session.org_id);
    const orgIdx = i;
    const result = await query(
      `UPDATE marcas
         SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idIdx} AND org_id = $${orgIdx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error PATCH /api/marcas:', error);
    return NextResponse.json(
      { error: error?.message || 'Error inesperado' },
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

    const sp = new URL(request.url).searchParams;
    const id = sp.get('id');
    const hard = sp.get('hard') === 'true';
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    if (hard) {
      await query(`DELETE FROM marcas WHERE id = $1 AND org_id = $2`, [id, session.org_id]);
    } else {
      await query(
        `UPDATE marcas SET activo = false, updated_at = NOW()
         WHERE id = $1 AND org_id = $2`,
        [id, session.org_id]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error DELETE /api/marcas:', error);
    return NextResponse.json(
      { error: error?.message || 'Error inesperado' },
      { status: 500 }
    );
  }
}
