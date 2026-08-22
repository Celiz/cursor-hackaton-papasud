import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

// GET /api/inventario/alertas-stock - Obtener productos con stock bajo
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limite = searchParams.get("limite") || "20";
    const deposito_id = searchParams.get("deposito_id");

    let sql = `
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.categoria,
        d.id as deposito_id,
        d.nombre AS deposito,
        d.codigo AS deposito_codigo,
        sd.cantidad_disponible,
        sd.punto_reorden,
        sd.stock_minimo,
        (sd.punto_reorden - sd.cantidad_disponible) AS cantidad_reordenar,
        CASE
          WHEN sd.cantidad_disponible <= sd.stock_minimo THEN 'critico'
          WHEN sd.cantidad_disponible <= sd.punto_reorden THEN 'bajo'
          ELSE 'normal'
        END as nivel_alerta,
        ROUND(
          (sd.cantidad_disponible::numeric / NULLIF(sd.punto_reorden, 0)) * 100,
          1
        ) as porcentaje_stock
      FROM productos p
      JOIN stock_depositos sd ON p.id = sd.producto_id
      JOIN depositos d ON sd.deposito_id = d.id
      WHERE sd.cantidad_disponible <= sd.punto_reorden
        AND sd.punto_reorden IS NOT NULL
        AND sd.punto_reorden > 0
        AND p.org_id = $1
    `;

    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (deposito_id) {
      sql += ` AND sd.deposito_id = $${paramIndex++}`;
      params.push(deposito_id);
    }

    sql += ` ORDER BY
      CASE
        WHEN sd.cantidad_disponible <= sd.stock_minimo THEN 0
        ELSE 1
      END,
      (sd.punto_reorden - sd.cantidad_disponible) DESC
    LIMIT $${paramIndex}`;
    params.push(parseInt(limite));

    const result = await query(sql, params);

    // También obtener resumen
    const resumenSql = `
      SELECT
        COUNT(*) FILTER (WHERE sd.cantidad_disponible <= sd.stock_minimo AND sd.stock_minimo IS NOT NULL) as criticos,
        COUNT(*) FILTER (WHERE sd.cantidad_disponible <= sd.punto_reorden AND (sd.cantidad_disponible > sd.stock_minimo OR sd.stock_minimo IS NULL)) as bajos,
        COUNT(*) as total_alertas
      FROM stock_depositos sd
      JOIN depositos d ON sd.deposito_id = d.id
      WHERE sd.cantidad_disponible <= sd.punto_reorden
        AND sd.punto_reorden IS NOT NULL
        AND sd.punto_reorden > 0
        AND d.org_id = $1
    `;
    const resumenResult = await query(resumenSql, [session.org_id]);

    return NextResponse.json({
      alertas: result.rows || [],
      resumen: resumenResult.rows[0] || { criticos: 0, bajos: 0, total_alertas: 0 },
    });
  } catch (error: any) {
    console.error("Error in GET /api/inventario/alertas-stock:", error);
    return NextResponse.json(
      { error: "Error al obtener alertas de stock", details: error.message },
      { status: 500 }
    );
  }
}
