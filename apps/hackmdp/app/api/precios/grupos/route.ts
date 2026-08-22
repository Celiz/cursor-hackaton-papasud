import { query, getClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await query(
      `SELECT pg.*,
              COUNT(pgi.producto_id)::int as producto_count
       FROM producto_grupos pg
       LEFT JOIN producto_grupo_items pgi ON pgi.grupo_id = pg.id
       WHERE pg.org_id = $1 AND pg.activo = true
       GROUP BY pg.id
       ORDER BY pg.nombre ASC`,
      [session.org_id]
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error("Error in GET /api/precios/grupos:", error);
    return NextResponse.json(
      { error: "Error al cargar grupos de productos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, descripcion, color, producto_ids } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: "nombre es requerido" },
        { status: 400 }
      );
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const groupResult = await client.query(
        `INSERT INTO producto_grupos (org_id, nombre, descripcion, color)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [session.org_id, nombre, descripcion || null, color || null]
      );

      const grupo = groupResult.rows[0];

      // Add products to group if provided
      if (producto_ids && Array.isArray(producto_ids) && producto_ids.length > 0) {
        const values = producto_ids
          .map((_: string, i: number) => `($1, $${i + 2})`)
          .join(", ");
        const params = [grupo.id, ...producto_ids];
        await client.query(
          `INSERT INTO producto_grupo_items (grupo_id, producto_id) VALUES ${values} ON CONFLICT DO NOTHING`,
          params
        );
      }

      await client.query("COMMIT");

      return NextResponse.json(grupo, { status: 201 });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("Error in POST /api/precios/grupos:", error);
    return NextResponse.json(
      { error: "Error al crear grupo de productos" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, nombre, descripcion, color } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(nombre);
    }
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex++}`);
      values.push(descripcion);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);

    values.push(id);
    const idIndex = paramIndex++;
    values.push(session.org_id);
    const orgIndex = paramIndex;

    const result = await query(
      `UPDATE producto_grupos SET ${updates.join(", ")} WHERE id = $${idIndex} AND org_id = $${orgIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    console.error("Error in PATCH /api/precios/grupos:", error);
    return NextResponse.json(
      { error: "Error al actualizar grupo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE producto_grupos SET activo = false, updated_at = NOW() WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Grupo desactivado" });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/precios/grupos:", error);
    return NextResponse.json(
      { error: "Error al eliminar grupo" },
      { status: 500 }
    );
  }
}
