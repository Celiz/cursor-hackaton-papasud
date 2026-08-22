import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET - Obtener todos los tags
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(
      `SELECT * FROM tags WHERE org_id = $1 ORDER BY nombre ASC`,
      [session.org_id]
    );
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Error al obtener tags", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo tag
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.nombre) {
      return NextResponse.json(
        { error: "Campo requerido: nombre" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO tags (nombre, color, org_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (nombre, org_id) DO UPDATE SET nombre = tags.nombre
       RETURNING *`,
      [body.nombre.trim(), body.color || "gray", session.org_id]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Error al crear tag", details: error.message },
      { status: 500 }
    );
  }
}
