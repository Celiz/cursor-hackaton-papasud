import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const revalidate = 0;

/**
 * GET /api/inventario/lotes/alertas
 *
 * Devuelve counts agregados de lotes por bucket de vencimiento + un sample
 * de los más urgentes. Pensado para widgets de dashboard y badges de sidebar.
 *
 * Response:
 *   {
 *     vencidos: { total: N, con_stock: N, suma_stock: N },
 *     proximos_7d: { total, con_stock, suma_stock },
 *     proximos_30d: { total, con_stock, suma_stock },
 *     proximos_90d: { total, con_stock, suma_stock },
 *     sample_urgentes: [ { id, producto, lote, vencimiento, dias, stock } ... ]
 *   }
 *
 * Sample size: 10 rows ordenadas por vencimiento ascendente, priorizando los
 * vencidos y los próximos a vencer con stock disponible.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Query de counts en un solo roundtrip usando FILTER
    const countsResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE pl.vencimiento < CURRENT_DATE)                                    AS vencidos_total,
         COUNT(*) FILTER (WHERE pl.vencimiento < CURRENT_DATE AND pl.stock > 0)                   AS vencidos_con_stock,
         COALESCE(SUM(pl.stock) FILTER (WHERE pl.vencimiento < CURRENT_DATE AND pl.stock > 0), 0) AS vencidos_suma_stock,

         COUNT(*) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')  AS prox7_total,
         COUNT(*) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND pl.stock > 0) AS prox7_con_stock,
         COALESCE(SUM(pl.stock) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND pl.stock > 0), 0) AS prox7_suma_stock,

         COUNT(*) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS prox30_total,
         COUNT(*) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND pl.stock > 0) AS prox30_con_stock,
         COALESCE(SUM(pl.stock) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND pl.stock > 0), 0) AS prox30_suma_stock,

         COUNT(*) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days') AS prox90_total,
         COUNT(*) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' AND pl.stock > 0) AS prox90_con_stock,
         COALESCE(SUM(pl.stock) FILTER (WHERE pl.vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' AND pl.stock > 0), 0) AS prox90_suma_stock
       FROM productos_lotes pl
       JOIN productos p ON pl.producto_id = p.id
       WHERE p.org_id = $1
         AND pl.vencimiento IS NOT NULL`,
      [session.org_id]
    );

    const c = countsResult.rows[0];

    // Sample de los 10 más urgentes: prioridad para vencidos CON stock (porque
    // son los que hay que sacar del circuito) y después próximos a vencer.
    // Los vencidos sin stock no molestan — son históricos que ya no existen.
    const sampleResult = await query(
      `SELECT
         pl.id,
         pl.lote,
         pl.vencimiento,
         pl.vencimiento - CURRENT_DATE AS dias,
         pl.stock,
         p.codigo AS producto_codigo,
         p.nombre AS producto_nombre,
         p.id     AS producto_id,
         m.nombre AS marca_nombre
       FROM productos_lotes pl
       JOIN productos p ON pl.producto_id = p.id
       LEFT JOIN marcas m ON pl.marca_id = m.id
       WHERE p.org_id = $1
         AND pl.vencimiento IS NOT NULL
         AND pl.stock > 0
         AND pl.vencimiento <= CURRENT_DATE + INTERVAL '90 days'
       ORDER BY
         CASE WHEN pl.vencimiento < CURRENT_DATE THEN 0 ELSE 1 END,
         pl.vencimiento ASC
       LIMIT 10`,
      [session.org_id]
    );

    return NextResponse.json({
      vencidos: {
        total: Number(c.vencidos_total) || 0,
        con_stock: Number(c.vencidos_con_stock) || 0,
        suma_stock: Number(c.vencidos_suma_stock) || 0,
      },
      proximos_7d: {
        total: Number(c.prox7_total) || 0,
        con_stock: Number(c.prox7_con_stock) || 0,
        suma_stock: Number(c.prox7_suma_stock) || 0,
      },
      proximos_30d: {
        total: Number(c.prox30_total) || 0,
        con_stock: Number(c.prox30_con_stock) || 0,
        suma_stock: Number(c.prox30_suma_stock) || 0,
      },
      proximos_90d: {
        total: Number(c.prox90_total) || 0,
        con_stock: Number(c.prox90_con_stock) || 0,
        suma_stock: Number(c.prox90_suma_stock) || 0,
      },
      sample_urgentes: sampleResult.rows || [],
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error in GET /api/inventario/lotes/alertas:", error);
    return NextResponse.json(
      { error: "Error al obtener alertas", details: errorMessage },
      { status: 500 }
    );
  }
}
