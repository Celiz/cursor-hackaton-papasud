import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(`
      SELECT
        prs.*,
        json_build_object(
          'id', p.id,
          'nombre_completo', p.nombre_completo,
          'tipo_persona', p.tipo_persona,
          'email', p.email,
          'telefono', p.telefono
        ) as persona,
        json_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'cuit', c.cuit
        ) as razon_social
      FROM personas_razones_sociales prs
      LEFT JOIN personas p ON prs.persona_id = p.id
      LEFT JOIN clientes c ON prs.razon_social_id = c.id
      WHERE prs.org_id = $1
      ORDER BY prs.created_at DESC
    `, [session.org_id]);

    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching personas_razones_sociales:", error);
    return NextResponse.json(
      { error: "Error al cargar datos", details: error.message },
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
    body.org_id = session.org_id;

    const fields = Object.keys(body);
    const values = Object.values(body);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const columns = fields.join(', ');

    const result = await query(`
      INSERT INTO personas_razones_sociales (${columns})
      VALUES (${placeholders})
      RETURNING *
    `, values);

    // Fetch with joined data
    const fullResult = await query(`
      SELECT
        prs.*,
        json_build_object('id', p.id, 'nombre_completo', p.nombre_completo) as persona,
        json_build_object('id', c.id, 'nombre', c.nombre) as razon_social
      FROM personas_razones_sociales prs
      LEFT JOIN personas p ON prs.persona_id = p.id
      LEFT JOIN clientes c ON prs.razon_social_id = c.id
      WHERE prs.id = $1 AND prs.org_id = $2
    `, [result.rows[0].id, session.org_id]);

    return NextResponse.json(fullResult.rows[0]);
  } catch (error: any) {
    console.error("Error creating personas_razones_sociales:", error);
    return NextResponse.json(
      { error: "Error al crear", details: error.message },
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    if (fields.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    values.push(id);
    values.push(session.org_id);

    const result = await query(`
      UPDATE personas_razones_sociales
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length - 1} AND org_id = $${values.length}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating personas_razones_sociales:", error);
    return NextResponse.json(
      { error: "Error al actualizar", details: error.message },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const result = await query(`
      DELETE FROM personas_razones_sociales WHERE id = $1 AND org_id = $2 RETURNING id
    `, [id, session.org_id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting personas_razones_sociales:", error);
    return NextResponse.json(
      { error: "Error al eliminar", details: error.message },
      { status: 500 }
    );
  }
}
