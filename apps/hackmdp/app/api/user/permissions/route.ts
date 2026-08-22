/**
 * API Route: GET /api/user/permissions
 * Obtiene el perfil, rol y permisos del usuario autenticado
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserPermissions } from "@/lib/server/get-user-permissions";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await getUserPermissions();

    if (!data.perfil) {
      return NextResponse.json(
        { error: "Not authenticated or profile not found" },
        { status: 401 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
