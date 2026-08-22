/**
 * Server-side function para obtener permisos del usuario
 * Se usa en Server Components y Server Actions
 */

import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import type { Perfil, Role, Permiso } from "@/lib/types/roles";

export async function getUserPermissions() {
  try {
    // Obtener sesión
    const session = await getSession();

    if (!session?.id) {
      return {
        perfil: null,
        role: null,
        permisos: [],
        isAdmin: false,
      };
    }

    // Obtener perfil del usuario
    const perfilResult = await query(
      `SELECT
        p.*,
        r.id as role_id,
        r.nombre as role_nombre,
        r.descripcion as role_descripcion,
        r.es_admin as role_es_admin,
        r.nivel as role_nivel
      FROM perfiles p
      LEFT JOIN roles r ON p.rol_id = r.id
      WHERE p.id = $1
      LIMIT 1`,
      [session.id]
    );

    const perfil = perfilResult.rows[0];

    if (!perfil) {
      return {
        perfil: null,
        role: null,
        permisos: [],
        isAdmin: false,
      };
    }

    // Construir objeto de rol
    const role: Role | null = perfil.role_id ? {
      id: perfil.role_id,
      nombre: perfil.role_nombre,
      descripcion: perfil.role_descripcion,
      es_admin: perfil.role_es_admin,
      nivel: perfil.role_nivel,
      color: perfil.role_color || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } : null;

    // Si es admin, no necesitamos cargar permisos individuales
    if (role?.es_admin) {
      return {
        perfil: {
          id: perfil.id,
          rol_id: perfil.rol_id,
          permisos_custom: perfil.permisos_custom,
          metadata: perfil.metadata,
          created_at: perfil.created_at,
          updated_at: perfil.updated_at,
          roles: role,
        } as Perfil,
        role,
        permisos: [],
        isAdmin: true,
      };
    }

    // Si no es admin, cargar permisos del rol
    let permisos: Permiso[] = [];

    if (role?.id) {
      const permisosResult = await query(
        `SELECT
          p.id,
          p.modulo,
          p.accion,
          p.descripcion,
          p.created_at
        FROM roles_permisos rp
        JOIN permisos p ON rp.permiso_id = p.id
        WHERE rp.rol_id = $1`,
        [role.id]
      );

      permisos = permisosResult.rows as Permiso[];
    }

    return {
      perfil: {
        id: perfil.id,
        rol_id: perfil.rol_id,
        permisos_custom: perfil.permisos_custom,
        metadata: perfil.metadata,
        created_at: perfil.created_at,
        updated_at: perfil.updated_at,
        roles: role,
      } as Perfil,
      role,
      permisos,
      isAdmin: false,
    };
  } catch (error) {
    console.error("Error in getUserPermissions:", error);
    return {
      perfil: null,
      role: null,
      permisos: [],
      isAdmin: false,
    };
  }
}
