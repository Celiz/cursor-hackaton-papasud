import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const revalidate = 0;

/**
 * GET /api/reportes/libro-iva-ventas?mes=YYYY-MM
 *
 * Libro IVA Ventas del período indicado. Devuelve:
 *   - rows: cada factura fiscal (A/B/C) del mes con desglose de neto, IVA, total
 *   - totales: agregados por tipo de factura y alícuota
 *   - resumen: neto gravado, IVA débito fiscal, no gravado, exento, total
 *
 * Formato pensado para exportar a Excel (CITI ventas AFIP) o PDF.
 * Excluye IVR (no son fiscales).
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes"); // YYYY-MM

    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json(
        { error: "Parámetro 'mes' requerido en formato YYYY-MM" },
        { status: 400 }
      );
    }

    const orgId = session.org_id;
    const desde = `${mes}-01`;
    const hasta = `${mes}-01::date + INTERVAL '1 month' - INTERVAL '1 day'`;

    // Facturas del período con cliente y desglose
    const facturas = await query(
      `SELECT
         f.id,
         f.nro_factura,
         f.tipo_factura,
         f.punto_venta,
         f.fecha_emision,
         f.subtotal,
         f.iva,
         f.total,
         f.cae,
         f.cae_vto,
         f.estado,
         c.nombre AS cliente_nombre,
         c.cuit AS cliente_cuit,
         c.condicion_iva AS cliente_condicion_iva
       FROM facturas f
       LEFT JOIN clientes c ON c.id = f.cliente_id
       WHERE f.org_id = $1
         AND f.tipo_factura IN ('A', 'B', 'C')
         AND f.fecha_emision >= $2::date
         AND f.fecha_emision <= (${hasta})
         AND f.estado <> 'anulada'
       ORDER BY f.tipo_factura, f.nro_factura ASC`,
      [orgId, desde]
    );

    // Notas de crédito del período (restan del IVA débito fiscal)
    const ncs = await query(
      `SELECT
         nc.id,
         nc.nro_nota,
         nc.fecha,
         nc.monto,
         nc.motivo,
         c.nombre AS cliente_nombre,
         c.cuit AS cliente_cuit
       FROM notas_credito nc
       LEFT JOIN clientes c ON nc.cliente_id = c.id
       WHERE nc.org_id = $1
         AND nc.fecha >= $2::date
         AND nc.fecha <= (${hasta})
       ORDER BY nc.fecha ASC`,
      [orgId, desde]
    );

    // Totales por tipo de factura
    const totalesPorTipo = await query(
      `SELECT
         f.tipo_factura,
         COUNT(*) AS cantidad,
         COALESCE(SUM(f.subtotal), 0) AS neto,
         COALESCE(SUM(f.iva), 0) AS iva,
         COALESCE(SUM(f.total), 0) AS total
       FROM facturas f
       WHERE f.org_id = $1
         AND f.tipo_factura IN ('A', 'B', 'C')
         AND f.fecha_emision >= $2::date
         AND f.fecha_emision <= (${hasta})
         AND f.estado <> 'anulada'
       GROUP BY f.tipo_factura
       ORDER BY f.tipo_factura`,
      [orgId, desde]
    );

    // Resumen general
    const resumen = await query(
      `SELECT
         COALESCE(SUM(f.subtotal), 0) AS neto_gravado,
         COALESCE(SUM(f.iva), 0) AS iva_debito_fiscal,
         COALESCE(SUM(f.total), 0) AS total_ventas,
         COUNT(*) AS cantidad_comprobantes,
         COALESCE((
           SELECT SUM(nc.monto) FROM notas_credito nc
           WHERE nc.org_id = $1
             AND nc.fecha >= $2::date
             AND nc.fecha <= (${hasta})
         ), 0) AS total_notas_credito
       FROM facturas f
       WHERE f.org_id = $1
         AND f.tipo_factura IN ('A', 'B', 'C')
         AND f.fecha_emision >= $2::date
         AND f.fecha_emision <= (${hasta})
         AND f.estado <> 'anulada'`,
      [orgId, desde]
    );

    const r = resumen.rows[0];

    return NextResponse.json({
      periodo: mes,
      facturas: facturas.rows || [],
      notas_credito: ncs.rows || [],
      totales_por_tipo: (totalesPorTipo.rows || []).map((t: any) => ({
        tipo: t.tipo_factura,
        cantidad: Number(t.cantidad),
        neto: Number(t.neto),
        iva: Number(t.iva),
        total: Number(t.total),
      })),
      resumen: {
        neto_gravado: Number(r.neto_gravado) || 0,
        iva_debito_fiscal: Number(r.iva_debito_fiscal) || 0,
        total_ventas: Number(r.total_ventas) || 0,
        cantidad_comprobantes: Number(r.cantidad_comprobantes) || 0,
        total_notas_credito: Number(r.total_notas_credito) || 0,
        neto_menos_nc: (Number(r.total_ventas) || 0) - (Number(r.total_notas_credito) || 0),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error in GET /api/reportes/libro-iva-ventas:", error);
    return NextResponse.json(
      { error: "Error al generar libro IVA ventas", details: errorMessage },
      { status: 500 }
    );
  }
}
