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

    // Verify lista belongs to org
    const listaCheck = await query(
      `SELECT id, margen_porcentaje FROM listas_precios WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (listaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Lista de precios no encontrada" },
        { status: 404 }
      );
    }

    const listaMargen = parseFloat(listaCheck.rows[0].margen_porcentaje) || 0;

    const result = await query(
      `SELECT
        lpi.id as item_id,
        lpi.precio_fijo,
        lpi.margen_override,
        lpi.created_at as item_created_at,
        lpi.updated_at as item_updated_at,
        p.id as producto_id,
        p.codigo,
        p.nombre,
        p.precio_venta as precio_base,
        p.precio_costo,
        p.margen_porcentaje,
        c.nombre as categoria_nombre,
        m.nombre as marca_nombre,
        CASE
          WHEN lpi.precio_fijo IS NOT NULL THEN lpi.precio_fijo
          WHEN lpi.margen_override IS NOT NULL THEN p.precio_costo * (1 + lpi.margen_override / 100)
          ELSE p.precio_costo * (1 + $2 / 100.0)
        END as precio_calculado
      FROM lista_precios_items lpi
      JOIN productos p ON p.id = lpi.producto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN marcas m ON m.id = p.marca_id
      WHERE lpi.lista_id = $1 AND p.org_id = $3 AND p.deleted_at IS NULL
      ORDER BY p.nombre ASC`,
      [id, listaMargen, session.org_id]
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error("Error in GET /api/precios/listas/[id]/items:", error);
    return NextResponse.json(
      { error: "Error al cargar items de lista de precios" },
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
    const { producto_id, precio_fijo, margen_override } = body;

    if (!producto_id) {
      return NextResponse.json(
        { error: "producto_id es requerido" },
        { status: 400 }
      );
    }

    if (precio_fijo === undefined && margen_override === undefined) {
      return NextResponse.json(
        { error: "Debe enviar precio_fijo o margen_override" },
        { status: 400 }
      );
    }

    // Verify lista belongs to org
    const listaCheck = await query(
      `SELECT id FROM listas_precios WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (listaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Lista de precios no encontrada" },
        { status: 404 }
      );
    }

    const result = await query(
      `INSERT INTO lista_precios_items (lista_id, producto_id, precio_fijo, margen_override)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (lista_id, producto_id) DO UPDATE SET
         precio_fijo = EXCLUDED.precio_fijo,
         margen_override = EXCLUDED.margen_override,
         updated_at = NOW()
       RETURNING *`,
      [id, producto_id, precio_fijo ?? null, margen_override ?? null]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    console.error("Error in POST /api/precios/listas/[id]/items:", error);
    return NextResponse.json(
      { error: "Error al crear/actualizar override de precio" },
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
    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get("producto_id");

    if (!productoId) {
      return NextResponse.json(
        { error: "producto_id es requerido" },
        { status: 400 }
      );
    }

    // Verify lista belongs to org
    const listaCheck = await query(
      `SELECT id FROM listas_precios WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (listaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Lista de precios no encontrada" },
        { status: 404 }
      );
    }

    const result = await query(
      `DELETE FROM lista_precios_items WHERE lista_id = $1 AND producto_id = $2 RETURNING *`,
      [id, productoId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Override no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Override eliminado" });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/precios/listas/[id]/items:", error);
    return NextResponse.json(
      { error: "Error al eliminar override de precio" },
      { status: 500 }
    );
  }
}
