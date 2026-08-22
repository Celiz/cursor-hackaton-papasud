import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

// GET - Estadísticas de alertas de reposición
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (
          WHERE (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias > 1.5
        ) as criticas,
        COUNT(*) FILTER (
          WHERE (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias > 1.2
            AND (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias <= 1.5
        ) as altas,
        COUNT(*) FILTER (
          WHERE (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias > 1.0
            AND (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias <= 1.2
        ) as medias,
        COUNT(*) FILTER (
          WHERE cip.reposicion_contactado_at IS NOT NULL
            AND cip.reposicion_contactado_at::date = CURRENT_DATE
        ) as contactados_hoy,
        COUNT(DISTINCT cip.cliente_id) as clientes_afectados
      FROM cliente_insumos_preferidos cip
      JOIN clientes c ON cip.cliente_id = c.id
      WHERE c.org_id = $1
        AND cip.activo = true
        AND cip.frecuencia_dias IS NOT NULL
        AND cip.frecuencia_dias > 0
        AND cip.ultima_compra IS NOT NULL
        AND (CURRENT_DATE - cip.ultima_compra) > cip.frecuencia_dias
        AND (cip.reposicion_snooze_hasta IS NULL OR cip.reposicion_snooze_hasta < CURRENT_DATE)
    `, [session.org_id]);

    const stats = result.rows[0];

    return NextResponse.json({
      total: parseInt(stats.total) || 0,
      criticas: parseInt(stats.criticas) || 0,
      altas: parseInt(stats.altas) || 0,
      medias: parseInt(stats.medias) || 0,
      contactadosHoy: parseInt(stats.contactados_hoy) || 0,
      clientesAfectados: parseInt(stats.clientes_afectados) || 0,
    });
  } catch (error: any) {
    console.error("Error fetching alertas reposicion stats:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas", details: error?.message },
      { status: 500 }
    );
  }
}
