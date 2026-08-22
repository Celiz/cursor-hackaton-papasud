import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

/**
 * GET /api/permisos
 * Lista todos los permisos disponibles en el sistema
 * Solo accesible para administradores
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar si es admin
    if (!session.is_admin) {
      return NextResponse.json(
        { error: "Solo administradores pueden ver permisos" },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT id, modulo, accion, descripcion, created_at
       FROM permisos
       WHERE org_id = $1
       ORDER BY modulo, accion`,
      [session.org_id]
    );

    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching permisos:", error);
    return NextResponse.json(
      { error: "Error al obtener permisos", details: error.message },
      { status: 500 }
    );
  }
}
