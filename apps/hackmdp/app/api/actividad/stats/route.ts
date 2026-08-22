import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET - Estadísticas de actividad
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Actividad por tipo de entidad
    const byEntityResult = await query(
      `
      SELECT
        entidad_tipo,
        COUNT(*) as total
      FROM actividad
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
        AND org_id = $2
      GROUP BY entidad_tipo
      ORDER BY total DESC
    `,
      [days, session.org_id]
    );

    // Actividad por acción
    const byActionResult = await query(
      `
      SELECT
        accion,
        COUNT(*) as total
      FROM actividad
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
        AND org_id = $2
      GROUP BY accion
      ORDER BY total DESC
    `,
      [days, session.org_id]
    );

    // Actividad por usuario
    const byUserResult = await query(
      `
      SELECT
        usuario_nombre,
        usuario_id,
        COUNT(*) as total
      FROM actividad
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
        AND org_id = $2
      GROUP BY usuario_nombre, usuario_id
      ORDER BY total DESC
      LIMIT 10
    `,
      [days, session.org_id]
    );

    // Actividad por día
    const byDayResult = await query(
      `
      SELECT
        DATE(created_at) as fecha,
        COUNT(*) as total
      FROM actividad
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
        AND org_id = $2
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `,
      [days, session.org_id]
    );

    // Total general
    const totalResult = await query(
      `
      SELECT COUNT(*) as total
      FROM actividad
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
        AND org_id = $2
    `,
      [days, session.org_id]
    );

    // Actividad reciente importante
    const importantResult = await query(
      `
      SELECT *
      FROM actividad
      WHERE importante = true AND org_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `,
      [session.org_id]
    );

    return NextResponse.json({
      total: parseInt(totalResult.rows[0]?.total || "0"),
      byEntity: byEntityResult.rows,
      byAction: byActionResult.rows,
      byUser: byUserResult.rows,
      byDay: byDayResult.rows,
      recentImportant: importantResult.rows,
      period: `${days} días`,
    });
  } catch (error: any) {
    console.error("Error fetching activity stats:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas", details: error?.message },
      { status: 500 }
    );
  }
}
