import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.precio_venta,
        p.precio_costo,
        p.margen_porcentaje,
        p.margen_pesos,
        p.stock_actual,
        p.categoria_id,
        p.marca_id,
        c.nombre as categoria_nombre,
        m.nombre as marca_nombre,
        pgi.added_at
      FROM producto_grupo_items pgi
      JOIN productos p ON p.id = pgi.producto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN marcas m ON m.id = p.marca_id
      WHERE pgi.grupo_id = $1 AND p.org_id = $2 AND p.deleted_at IS NULL
      ORDER BY p.nombre ASC`,
      [id, session.org_id]
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error("Error in GET /api/precios/grupos/[id]/items:", error);
    return NextResponse.json(
      { error: "Error al cargar productos del grupo" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { producto_ids } = body;

    if (!producto_ids || !Array.isArray(producto_ids) || producto_ids.length === 0) {
      return NextResponse.json(
        { error: "producto_ids es requerido y debe ser un array no vacío" },
        { status: 400 }
      );
    }

    // Verify group belongs to org
    const groupCheck = await query(
      `SELECT id FROM producto_grupos WHERE id = $1 AND org_id = $2 AND activo = true`,
      [id, session.org_id]
    );

    if (groupCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    const values = producto_ids
      .map((_: string, i: number) => `($1, $${i + 2})`)
      .join(", ");

    await query(
      `INSERT INTO producto_grupo_items (grupo_id, producto_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [id, ...producto_ids]
    );

    return NextResponse.json({ message: "Productos agregados al grupo" });
  } catch (error: unknown) {
    console.error("Error in POST /api/precios/grupos/[id]/items:", error);
    return NextResponse.json(
      { error: "Error al agregar productos al grupo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { producto_ids } = body;

    if (!producto_ids || !Array.isArray(producto_ids) || producto_ids.length === 0) {
      return NextResponse.json(
        { error: "producto_ids es requerido y debe ser un array no vacío" },
        { status: 400 }
      );
    }

    // Verify group belongs to org
    const groupCheck = await query(
      `SELECT id FROM producto_grupos WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (groupCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    await query(
      `DELETE FROM producto_grupo_items WHERE grupo_id = $1 AND producto_id = ANY($2::uuid[])`,
      [id, producto_ids]
    );

    return NextResponse.json({ message: "Productos removidos del grupo" });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/precios/grupos/[id]/items:", error);
    return NextResponse.json(
      { error: "Error al remover productos del grupo" },
      { status: 500 }
    );
  }
}
