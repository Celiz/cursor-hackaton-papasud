import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// DELETE - Eliminar tag
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

    await query(`DELETE FROM tags WHERE id = $1 AND org_id = $2`, [id, session.org_id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Error al eliminar tag", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar tag
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

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex}`);
      values.push(body.nombre.trim());
      paramIndex++;
    }
    if (body.color !== undefined) {
      fields.push(`color = $${paramIndex}`);
      values.push(body.color);
      paramIndex++;
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    values.push(id);
    const idParamIndex = paramIndex;
    paramIndex++;
    values.push(session.org_id);
    const result = await query(
      `UPDATE tags SET ${fields.join(", ")} WHERE id = $${idParamIndex} AND org_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Tag no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { error: "Error al actualizar tag", details: error.message },
      { status: 500 }
    );
  }
}
