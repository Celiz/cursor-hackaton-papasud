// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import type { Modulo, Accion } from '@/lib/types/roles';

/**
 * Verifica si el usuario autenticado tiene un permiso específico
 *
 * @param modulo - El módulo a verificar
 * @param accion - La acción a verificar
 * @returns { hasPermission, user, error }
 */
export async function checkPermission(modulo: Modulo, accion: Accion) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        hasPermission: false,
        user: null,
        error: 'No autenticado',
      };
    }

    // Obtener perfil con rol
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('*, roles:rol_id(*)')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      return {
        hasPermission: false,
        user,
        error: 'Perfil no encontrado',
      };
    }

    // Si es admin, tiene todos los permisos
    if (perfil.roles?.es_admin) {
      return {
        hasPermission: true,
        user,
        error: null,
      };
    }

    // Verificar permiso específico
    const { data: permisos, error: permisosError } = await supabase
      .from('roles_permisos')
      .select(`
        permisos:permiso_id (
          modulo,
          accion
        )
      `)
      .eq('rol_id', perfil.rol_id);

    if (permisosError) {
      return {
        hasPermission: false,
        user,
        error: 'Error al verificar permisos',
      };
    }

    // Buscar el permiso específico
    const hasPermission = permisos.some(
      rp => rp.permisos?.modulo === modulo && rp.permisos?.accion === accion
    );

    return {
      hasPermission,
      user,
      error: hasPermission ? null : 'Sin permisos',
    };
  } catch (error: any) {
    console.error('Error in checkPermission:', error);
    return {
      hasPermission: false,
      user: null,
      error: error.message || 'Error al verificar permisos',
    };
  }
}

/**
 * Verifica si el usuario es administrador
 */
export async function isAdmin() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { isAdmin: false, user: null };
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('roles:rol_id(es_admin)')
      .eq('id', user.id)
      .single();

    return {
      isAdmin: perfil?.roles?.es_admin || false,
      user,
    };
  } catch (error) {
    return { isAdmin: false, user: null };
  }
}

/**
 * Middleware helper para proteger API routes
 * Uso:
 *
 * export async function POST(request: Request) {
 *   const { hasPermission, error } = await requirePermission('clientes', 'crear');
 *   if (!hasPermission) {
 *     return NextResponse.json({ error }, { status: 403 });
 *   }
 *   // ... resto del código
 * }
 */
export async function requirePermission(modulo: Modulo, accion: Accion) {
  return checkPermission(modulo, accion);
}
