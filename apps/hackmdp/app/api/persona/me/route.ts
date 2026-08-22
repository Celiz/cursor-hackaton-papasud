import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Obtener datos de la persona actual + orgs
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.persona_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const personaResult = await query(
      `SELECT p.id, p.nombre, p.email, p.telefono, p.documento_tipo, p.documento_nro, p.fecha_nacimiento,
              p.bio, p.que_construyo, p.etapa, p.busco, p.tags, p.linkedin_url, p.instagram, p.website,
              p.created_at
       FROM personas p
       WHERE p.id = $1`,
      [session.persona_id]
    );

    if (personaResult.rows.length === 0) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    const orgsResult = await query(
      `SELECT o.id, o.nombre, o.slug, o.tipo, om.rol
       FROM org_members om
       JOIN organizations o ON o.id = om.org_id
       WHERE om.persona_id = $1
       ORDER BY o.nombre`,
      [session.persona_id]
    );

    const credResult = await query(
      `SELECT email, last_login FROM auth_credentials WHERE persona_id = $1`,
      [session.persona_id]
    );

    return NextResponse.json({
      ...personaResult.rows[0],
      organizations: orgsResult.rows,
      auth: credResult.rows[0] || null,
    });
  } catch (error: any) {
    console.error("Error fetching persona profile:", error);
    return NextResponse.json(
      { error: "Error al obtener perfil", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar datos de la persona
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.persona_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = [
      "nombre", "telefono", "documento_tipo", "documento_nro", "fecha_nacimiento",
      "bio", "que_construyo", "etapa", "busco", "tags", "linkedin_url", "instagram", "website",
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field] || null);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    values.push(session.persona_id);

    const result = await query(
      `UPDATE personas SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, nombre, email, telefono, documento_tipo, documento_nro, fecha_nacimiento,
                bio, que_construyo, etapa, busco, tags, linkedin_url, instagram, website`,
      values
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating persona profile:", error);
    return NextResponse.json(
      { error: "Error al actualizar perfil", details: error.message },
      { status: 500 }
    );
  }
}
