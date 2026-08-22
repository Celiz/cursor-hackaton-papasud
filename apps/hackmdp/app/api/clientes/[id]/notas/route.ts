import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Obtener notas de un cliente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT
        cn.*,
        u.nombre_completo as created_by_name
       FROM cliente_notas cn
       LEFT JOIN users u ON cn.created_by = u.id
       WHERE cn.cliente_id = $1
         AND EXISTS (SELECT 1 FROM clientes WHERE id = $1 AND org_id = $2)
       ORDER BY cn.created_at DESC`,
      [id, session.org_id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching notas:", error);
    return NextResponse.json(
      { error: "Error al obtener notas" },
      { status: 500 }
    );
  }
}

// POST - Crear nota
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el cliente pertenece a la org
    const clienteCheck = await query(
      `SELECT id FROM clientes WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );
    if (clienteCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { contenido, tipo = "general", created_by } = body;

    if (!contenido?.trim()) {
      return NextResponse.json(
        { error: "El contenido es requerido" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO cliente_notas (cliente_id, contenido, tipo, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, contenido.trim(), tipo, created_by || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating nota:", error);
    return NextResponse.json(
      { error: "Error al crear nota" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar nota
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const notaId = searchParams.get("notaId");

    if (!notaId) {
      return NextResponse.json(
        { error: "ID de nota requerido" },
        { status: 400 }
      );
    }

    // Verificar que la nota pertenece a un cliente de la org antes de eliminar
    const notaCheck = await query(
      `SELECT cn.id FROM cliente_notas cn
       WHERE cn.id = $1 AND cn.cliente_id = $2
         AND EXISTS (SELECT 1 FROM clientes WHERE id = $2 AND org_id = $3)`,
      [notaId, id, session.org_id]
    );

    if (notaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Nota no encontrada" },
        { status: 404 }
      );
    }

    await query("DELETE FROM cliente_notas WHERE id = $1", [notaId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting nota:", error);
    return NextResponse.json(
      { error: "Error al eliminar nota" },
      { status: 500 }
    );
  }
}
