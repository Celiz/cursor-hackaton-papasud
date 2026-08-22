import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const revalidate = 0;

/**
 * GET /api/reportes/costo-absorbido?mes=YYYY-MM
 *
 * Reporte de costo absorbido por servicios sin_cargo en el período.
 *
 * Devuelve:
 *   - servicios: lista de servicios sin_cargo del mes con insumos parseados
 *   - resumen: monto_servicio total, monto_insumos total, costo_total
 *   - por_motivo: agrupado por motivo (garantía, cortesía, etc.)
 *   - por_cliente: top clientes con más costo absorbido
 *
 * Los insumos se parsean de `servicios.insumos_utilizados` (JSON text) para
 * calcular cantidades y vincular con productos reales.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes");

    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json(
        { error: "Parámetro 'mes' requerido en formato YYYY-MM" },
        { status: 400 }
      );
    }

    const orgId = session.org_id;
    const desde = `${mes}-01`;
    const hastaExpr = `'${mes}-01'::date + INTERVAL '1 month' - INTERVAL '1 day'`;

    // Servicios sin_cargo del período
    const servicios = await query(
      `SELECT
         s.id,
         s.fecha,
         s.estado,
         s.tecnico,
         s.sin_cargo,
         s.motivo_sin_cargo,
         s.monto_servicio,
         s.monto_insumos,
         s.insumos_utilizados,
         s.tipo_servicio,
         c.nombre AS cliente_nombre,
         c.cuit AS cliente_cuit,
         c.id AS cliente_id,
         eu.codigo AS equipo_codigo,
         eq.marca AS equipo_marca,
         eq.modelo AS equipo_modelo
       FROM servicios s
       LEFT JOIN clientes c ON c.id = s.cliente_id
       LEFT JOIN equipos_unidades eu ON eu.id = s.equipo_id
       LEFT JOIN equipos eq ON eq.id = eu.equipo_id
       WHERE s.org_id = $1
         AND s.sin_cargo = true
         AND s.fecha >= $2::date
         AND s.fecha <= (${hastaExpr})
       ORDER BY s.fecha ASC`,
      [orgId, desde]
    );

    // Parsear insumos JSON y calcular costo por producto
    const rows = (servicios.rows || []).map((s: any) => {
      let insumos: Array<{ producto_id: string; codigo: string; nombre: string; cantidad: number }> = [];
      try {
        const raw = typeof s.insumos_utilizados === "string"
          ? JSON.parse(s.insumos_utilizados)
          : s.insumos_utilizados;
        if (Array.isArray(raw)) insumos = raw;
      } catch { /* ignore parse errors */ }

      return {
        ...s,
        insumos,
        costo_total: (Number(s.monto_servicio) || 0) + (Number(s.monto_insumos) || 0),
      };
    });

    // Resumen
    const totalServicio = rows.reduce((s: number, r: any) => s + (Number(r.monto_servicio) || 0), 0);
    const totalInsumos = rows.reduce((s: number, r: any) => s + (Number(r.monto_insumos) || 0), 0);

    // Por motivo
    const porMotivo: Record<string, { count: number; costo: number }> = {};
    for (const r of rows) {
      const motivo = r.motivo_sin_cargo || "Sin especificar";
      if (!porMotivo[motivo]) porMotivo[motivo] = { count: 0, costo: 0 };
      porMotivo[motivo].count += 1;
      porMotivo[motivo].costo += r.costo_total;
    }

    // Por cliente (top 10)
    const porCliente: Record<string, { nombre: string; cuit: string | null; count: number; costo: number }> = {};
    for (const r of rows) {
      const key = r.cliente_id || "sin-cliente";
      if (!porCliente[key]) porCliente[key] = { nombre: r.cliente_nombre || "Sin cliente", cuit: r.cliente_cuit, count: 0, costo: 0 };
      porCliente[key].count += 1;
      porCliente[key].costo += r.costo_total;
    }

    return NextResponse.json({
      periodo: mes,
      servicios: rows,
      resumen: {
        total_servicios: rows.length,
        monto_servicio: totalServicio,
        monto_insumos: totalInsumos,
        costo_total: totalServicio + totalInsumos,
      },
      por_motivo: Object.entries(porMotivo)
        .map(([motivo, v]) => ({ motivo, ...v }))
        .sort((a, b) => b.costo - a.costo),
      por_cliente: Object.values(porCliente)
        .sort((a, b) => b.costo - a.costo)
        .slice(0, 10),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error in GET /api/reportes/costo-absorbido:", error);
    return NextResponse.json(
      { error: "Error al generar reporte", details: errorMessage },
      { status: 500 }
    );
  }
}
