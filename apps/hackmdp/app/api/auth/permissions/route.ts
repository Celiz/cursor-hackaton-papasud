import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const revalidate = 0;

/**
 * GET /api/auth/permissions
 * Obtiene los permisos del usuario autenticado
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.persona_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Use persona_id (not session.id which is auth_credentials.id)
    // perfiles.id stores persona_id
    const userId = session.persona_id;

    // Obtener perfil del usuario con su rol
    const perfilResult = await query(
      `SELECT
        p.id,
        p.rol_id,
        p.permisos_custom,
        p.metadata,
        r.id as role_id,
        r.nombre as role_nombre,
        r.descripcion as role_descripcion,
        r.es_admin,
        r.color as role_color
      FROM perfiles p
      LEFT JOIN roles r ON p.rol_id = r.id
      WHERE p.id = $1`,
      [userId]
    );

    // Si no tiene perfil, crear uno básico
    if (perfilResult.rows.length === 0) {
      return NextResponse.json({
        isAdmin: false,
        role: null,
        permisos: [],
        perfil: null,
      });
    }

    const perfil = perfilResult.rows[0];

    // Si es admin, no necesita permisos específicos
    if (perfil.es_admin) {
      return NextResponse.json({
        isAdmin: true,
        role: {
          id: perfil.role_id,
          nombre: perfil.role_nombre,
          descripcion: perfil.role_descripcion,
          es_admin: true,
          color: perfil.role_color,
        },
        permisos: [],
        perfil: {
          id: perfil.id,
          rol_id: perfil.rol_id,
          permisos_custom: perfil.permisos_custom || [],
        },
      });
    }

    // Obtener permisos del rol
    const permisosResult = await query(
      `SELECT
        pm.id,
        pm.modulo,
        pm.accion,
        pm.descripcion
      FROM roles_permisos rp
      JOIN permisos pm ON rp.permiso_id = pm.id
      WHERE rp.rol_id = $1
      ORDER BY pm.modulo, pm.accion`,
      [perfil.rol_id]
    );

    // Combinar con permisos custom del perfil si existen
    let permisos = permisosResult.rows;

    if (perfil.permisos_custom && Array.isArray(perfil.permisos_custom)) {
      // Los permisos custom son IDs de permisos adicionales
      if (perfil.permisos_custom.length > 0) {
        const customResult = await query(
          `SELECT id, modulo, accion, descripcion
           FROM permisos
           WHERE id = ANY($1)`,
          [perfil.permisos_custom]
        );

        // Agregar permisos custom que no estén ya incluidos
        const existingIds = new Set(permisos.map((p: any) => p.id));
        customResult.rows.forEach((p: any) => {
          if (!existingIds.has(p.id)) {
            permisos.push(p);
          }
        });
      }
    }

    return NextResponse.json({
      isAdmin: false,
      role: perfil.role_id ? {
        id: perfil.role_id,
        nombre: perfil.role_nombre,
        descripcion: perfil.role_descripcion,
        es_admin: false,
        color: perfil.role_color,
      } : null,
      permisos: permisos.map((p: any) => ({
        id: p.id,
        modulo: p.modulo,
        accion: p.accion,
        descripcion: p.descripcion,
      })),
      perfil: {
        id: perfil.id,
        rol_id: perfil.rol_id,
        permisos_custom: perfil.permisos_custom || [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Error al obtener permisos", details: error.message },
      { status: 500 }
    );
  }
}
