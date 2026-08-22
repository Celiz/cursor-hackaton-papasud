import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET - Obtener una configuración específica
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

    const result = await query(
      `SELECT * FROM alertas_config WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Configuración no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching alerta config:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración", details: error?.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración
export async function PUT(
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

    const result = await query(
      `UPDATE alertas_config
       SET nombre = $1,
           descripcion = $2,
           tipo = $3,
           condicion = $4,
           destinatarios = $5,
           canal = $6,
           frecuencia = $7,
           template_mensaje = $8,
           activo = $9,
           updated_at = NOW()
       WHERE id = $10 AND org_id = $11
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
        id,
        session.org_id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Configuración no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating alerta config:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar configuración
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

    const result = await query(
      `DELETE FROM alertas_config WHERE id = $1 AND org_id = $2 RETURNING id`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Configuración no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Configuración eliminada" });
  } catch (error: any) {
    console.error("Error deleting alerta config:", error);
    return NextResponse.json(
      { error: "Error al eliminar configuración", details: error?.message },
      { status: 500 }
    );
  }
}
