import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Obtener archivos de un cliente
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
        ca.*,
        u.nombre_completo as created_by_name
       FROM cliente_archivos ca
       LEFT JOIN users u ON ca.created_by = u.id
       WHERE ca.cliente_id = $1
         AND EXISTS (SELECT 1 FROM clientes WHERE id = $1 AND org_id = $2)
       ORDER BY ca.created_at DESC`,
      [id, session.org_id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching archivos:", error);
    return NextResponse.json(
      { error: "Error al obtener archivos" },
      { status: 500 }
    );
  }
}

// POST - Crear archivo (metadatos)
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
    const { nombre, url, tipo, tamaño, categoria = "documento", descripcion, created_by } = body;

    if (!nombre || !url) {
      return NextResponse.json(
        { error: "Nombre y URL son requeridos" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO cliente_archivos (cliente_id, nombre, url, tipo, tamaño, categoria, descripcion, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, nombre, url, tipo || null, tamaño || null, categoria, descripcion || null, created_by || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating archivo:", error);
    return NextResponse.json(
      { error: "Error al crear archivo" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar archivo
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
    const archivoId = searchParams.get("archivoId");

    if (!archivoId) {
      return NextResponse.json(
        { error: "ID de archivo requerido" },
        { status: 400 }
      );
    }

    // Obtener info del archivo antes de eliminar, verificando que pertenece a un cliente de la org
    const archivo = await query(
      `SELECT ca.* FROM cliente_archivos ca
       WHERE ca.id = $1 AND ca.cliente_id = $2
         AND EXISTS (SELECT 1 FROM clientes WHERE id = $2 AND org_id = $3)`,
      [archivoId, id, session.org_id]
    );

    if (archivo.rows.length === 0) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      );
    }

    await query("DELETE FROM cliente_archivos WHERE id = $1", [archivoId]);

    return NextResponse.json({ success: true, deletedFile: archivo.rows[0] });
  } catch (error) {
    console.error("Error deleting archivo:", error);
    return NextResponse.json(
      { error: "Error al eliminar archivo" },
      { status: 500 }
    );
  }
}
