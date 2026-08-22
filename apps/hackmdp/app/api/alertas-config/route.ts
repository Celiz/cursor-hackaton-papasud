import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET - Obtener configuraciones de alertas
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const activo = searchParams.get("activo");

    let queryStr = `SELECT * FROM alertas_config WHERE org_id = $1`;
    const params: any[] = [session.org_id];
    let paramCount = 2;

    if (tipo) {
      queryStr += ` AND tipo = $${paramCount}`;
      params.push(tipo);
      paramCount++;
    }

    if (activo !== null && activo !== undefined) {
      queryStr += ` AND activo = $${paramCount}`;
      params.push(activo === "true");
      paramCount++;
    }

    queryStr += ` ORDER BY nombre`;

    const result = await query(queryStr, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching alertas config:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración de alertas", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Crear nueva configuración de alerta
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.nombre || !body.tipo || !body.condicion) {
      return NextResponse.json(
        { error: "Campos requeridos: nombre, tipo, condicion" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO alertas_config (
        nombre, descripcion, tipo, condicion, destinatarios,
        canal, frecuencia, template_mensaje, activo, org_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        body.nombre,
        body.descripcion || null,
        body.tipo,
        JSON.stringify(body.condicion),
        JSON.stringify(body.destinatarios || []),
        body.canal || "email",
        body.frecuencia || "inmediata",
        body.template_mensaje || null,
        body.activo !== false,
        session.org_id,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error creating alerta config:", error);
    return NextResponse.json(
      { error: "Error al crear configuración de alerta", details: error?.message },
      { status: 500 }
    );
  }
}
