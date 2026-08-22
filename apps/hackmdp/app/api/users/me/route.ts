import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Obtener datos del usuario actual
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(
      `SELECT u.id, u.email, u.nombre_completo, u.cargo, u.telefono_directo, u.firma_activa
       FROM users u
       INNER JOIN org_members om ON om.persona_id = u.id AND om.org_id = $2
       WHERE u.id = $1`,
      [session.id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Error al obtener perfil", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar datos del usuario actual
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Solo permitir actualizar ciertos campos
    const allowedFields = ["nombre_completo", "cargo", "telefono_directo", "firma_activa"];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    values.push(session.id);
    const userIdParam = paramIndex;
    paramIndex++;
    values.push(session.org_id);
    const orgIdParam = paramIndex;

    const result = await query(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${userIdParam}
         AND EXISTS (SELECT 1 FROM org_members om WHERE om.persona_id = $${userIdParam} AND om.org_id = $${orgIdParam})
       RETURNING id, email, nombre_completo, cargo, telefono_directo, firma_activa`,
      values
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Error al actualizar perfil", details: error.message },
      { status: 500 }
    );
  }
}
