import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

// GET - Obtener estadísticas de categorías de productos
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(`
      SELECT
        COALESCE(c.nombre, p.categoria, 'Sin categoría') as categoria,
        COUNT(*)::int as count
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.org_id = $1 AND p.deleted_at IS NULL
      GROUP BY COALESCE(c.nombre, p.categoria, 'Sin categoría')
      ORDER BY count DESC
    `, [session.org_id]);

    // Build stats object with category counts
    const stats: Record<string, number> = {
      total: 0
    };

    for (const row of result.rows || []) {
      if (row.categoria) {
        stats[row.categoria] = row.count;
        stats.total += row.count;
      }
    }

    // Also get categories list for reference
    const categories = (result.rows || [])
      .filter((r: any) => r.categoria)
      .map((r: any) => ({
        name: r.categoria,
        count: r.count
      }));

    return NextResponse.json({
      stats,
      categories
    });
  } catch (error: any) {
    console.error("Error fetching productos stats:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas", details: error?.message },
      { status: 500 }
    );
  }
}
