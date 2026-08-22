import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const offset = (page - 1) * pageSize;
    const productoId = searchParams.get("producto_id");
    const tipo = searchParams.get("tipo");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const params: any[] = [session.org_id];
    let paramIndex = 2;
    let whereConditions = "WHERE h.org_id = $1";

    if (productoId) {
      whereConditions += ` AND h.producto_id = $${paramIndex}`;
      params.push(productoId);
      paramIndex++;
    }

    if (tipo) {
      whereConditions += ` AND h.tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }

    if (from) {
      whereConditions += ` AND h.created_at >= $${paramIndex}`;
      params.push(from);
      paramIndex++;
    }

    if (to) {
      whereConditions += ` AND h.created_at <= $${paramIndex}`;
      params.push(to);
      paramIndex++;
    }

    const fromClause = `
      FROM historial_precios h
      JOIN productos p ON p.id = h.producto_id
      LEFT JOIN personas pe ON pe.id = h.usuario_id
    `;

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) as total ${fromClause} ${whereConditions}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || "0");

    // Data query
    const limitIndex = paramIndex;
    const offsetIndex = paramIndex + 1;
    const dataParams = [...params, pageSize, offset];

    const result = await query(
      `SELECT
        h.id,
        h.producto_id,
        h.tipo_precio,
        h.precio_anterior,
        h.precio_nuevo,
        h.tipo,
        h.motivo_cambio,
        h.referencia_id,
        h.usuario_id,
        h.created_at,
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        pe.nombre_completo as usuario_nombre
      ${fromClause}
      ${whereConditions}
      ORDER BY h.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      dataParams
    );

    return NextResponse.json({
      items: result.rows,
      total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/precios/historial:", error);
    return NextResponse.json(
      { error: "Error al cargar historial de precios" },
      { status: 500 }
    );
  }
}
