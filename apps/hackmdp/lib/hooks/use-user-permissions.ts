"use client"

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { useSession } from '@/lib/hooks/use-session';
import type {
  UseUserPermissionsReturn,
  Perfil,
  Role,
  Permiso,
  PermisosMap,
  Modulo,
  Accion,
} from '@/lib/types/roles';

// Global cache to persist permissions across component remounts/navigation
let globalPermissionsCache: {
  perfil: Perfil | null;
  role: Role | null;
  permisos: PermisosMap | null;
  userId: string | null;
  loaded: boolean;
  modulosOcultosKey?: string;
} = {
  perfil: null,
  role: null,
  permisos: null,
  userId: null,
  loaded: false,
  modulosOcultosKey: '',
};

/**
 * Hook para gestionar permisos del usuario autenticado
 * Carga el perfil, rol y permisos desde NextAuth y PostgreSQL
 */
export function useUserPermissions(): UseUserPermissionsReturn {
  // Initialize from cache to prevent flicker
  const [perfil, setPerfil] = useState<Perfil | null>(globalPermissionsCache.perfil);
  const [role, setRole] = useState<Role | null>(globalPermissionsCache.role);
  const [permisos, setPermisos] = useState<PermisosMap | null>(globalPermissionsCache.permisos);
  // Start with loading=false if we have cached data
  const [loading, setLoading] = useState(!globalPermissionsCache.loaded);
  const [error, setError] = useState<Error | null>(null);

  // Track if permissions have been loaded to avoid re-loading on navigation
  const hasLoadedRef = useRef(globalPermissionsCache.loaded);
  const lastUserIdRef = useRef<string | null>(globalPermissionsCache.userId);

  const { data: session, status } = useSession();

  /**
   * Construye el mapa de permisos desde la respuesta de la BD
   */
  const buildPermisosMap = useCallback((permisosList: Permiso[]): PermisosMap => {
    const map: PermisosMap = {};

    permisosList.forEach((permiso) => {
      if (!map[permiso.modulo]) {
        map[permiso.modulo] = [];
      }
      if (!map[permiso.modulo]!.includes(permiso.accion)) {
        map[permiso.modulo]!.push(permiso.accion);
      }
    });

    return map;
  }, []);

  /**
   * Carga los permisos del usuario desde la sesión de NextAuth
   */
  const loadPermissions = useCallback(async (forceReload = false) => {
    // Skip if already loaded for the same user (unless forced)
    const currentUserId = session?.user?.id;
    if (!forceReload && hasLoadedRef.current && lastUserIdRef.current === currentUserId) {
      return;
    }

    try {
      setError(null);

      // Verificar si hay sesión
      if (!session?.user?.id) {
        setPerfil(null);
        setRole(null);
        setPermisos(null);
        setLoading(false);
        hasLoadedRef.current = true;
        lastUserIdRef.current = null;
        return;
      }

      // Extraer información de la sesión
      // @ts-ignore
      const isAdmin = session.user.isAdmin || false;
      const roleName = session.user.role || 'user';
      // @ts-ignore
      const modulosOcultos: string[] = session.user.modulosOcultos || [];
      // Módulos en modo "solo lectura": visibles pero sin crear/editar/eliminar.
      // @ts-ignore
      const modulosSoloLectura: string[] = session.user.modulosSoloLectura || [];

      // Crear objeto de rol mínimo
      const newRole: Role = {
        id: 'session-role',
        nombre: roleName,
        descripcion: '',
        es_admin: isAdmin,
        nivel: isAdmin ? 100 : 0,
        color: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setRole(newRole);

      // Crear perfil mínimo
      const newPerfil: Perfil = {
        id: session.user.id,
        rol_id: 'session-role',
        permisos_custom: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        roles: newRole,
      };
      setPerfil(newPerfil);

      // Si es admin, tiene todos los permisos
      let newPermisos: PermisosMap;
      if (isAdmin) {
        newPermisos = {
          dashboard: ['leer'],
          clientes: ['leer', 'crear', 'editar', 'eliminar', 'exportar'],
          productos: ['leer', 'crear', 'editar', 'eliminar', 'exportar'],
          precios: ['leer', 'crear', 'editar', 'eliminar', 'exportar'],
          equipos: ['leer', 'crear', 'editar', 'eliminar'],
          equipos_unidades: ['leer', 'crear', 'editar', 'eliminar'],
          equipos_movimientos: ['leer', 'crear', 'editar', 'exportar'],
          equipos_alertas: ['leer', 'editar'],
          servicios: ['leer', 'crear', 'editar', 'eliminar'],
          servicios_tecnicos: ['leer', 'crear', 'editar', 'eliminar'],
          facturas: ['leer', 'crear', 'editar', 'eliminar', 'exportar'],
          notas_credito: ['leer', 'crear', 'editar', 'eliminar', 'exportar'],
          presupuestos: ['leer', 'crear', 'editar', 'eliminar', 'exportar'],
          pedidos: ['leer', 'crear', 'editar', 'eliminar', 'exportar'],
          pagos: ['leer', 'crear', 'editar', 'eliminar', 'exportar'],
          cuentas_corrientes: ['leer', 'exportar'],
          comodatos: ['leer', 'crear', 'editar', 'eliminar'],
          tareas: ['leer', 'crear', 'editar', 'eliminar'],
          personas: ['leer', 'crear', 'editar', 'eliminar'],
          laboratorios: ['leer', 'crear', 'editar', 'eliminar'],
          proveedores: ['leer', 'crear', 'editar', 'eliminar'],
          reportes: ['leer', 'exportar'],
          configuracion: ['leer', 'editar'],
          configuracion_roles: ['leer', 'editar'],
          mantenimiento: ['leer', 'crear', 'editar', 'eliminar'],
          integraciones_bancarias: ['leer', 'crear', 'editar', 'exportar'],
          catalogo_web: ['leer', 'crear', 'editar', 'eliminar'],
          oportunidades: ['leer', 'crear', 'editar', 'eliminar'],
          reactivos_lab: ['leer', 'crear', 'editar', 'eliminar'],
        };
        for (const m of modulosOcultos) {
          delete newPermisos[m as Modulo];
        }
      } else {
        // Para usuarios no admin, cargar permisos desde la API
        try {
          const response = await fetch('/api/auth/permissions');
          const data = await response.json();

          if (data.permisos && Array.isArray(data.permisos)) {
            newPermisos = buildPermisosMap(data.permisos);

            // Actualizar rol y perfil con datos del servidor si están disponibles
            if (data.role) {
              const serverRole: Role = {
                id: data.role.id,
                nombre: data.role.nombre,
                descripcion: data.role.descripcion || '',
                es_admin: data.role.es_admin || false,
                nivel: data.role.es_admin ? 100 : 0,
                color: data.role.color,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              setRole(serverRole);
              newPerfil.roles = serverRole;
              setPerfil(newPerfil);
            }
          } else {
            newPermisos = {};
          }
        } catch (apiError) {
          console.error('Error fetching permissions from API:', apiError);
          newPermisos = {};
        }
      }
      // Solo lectura: si el módulo es accesible, dejar solo 'leer' (sin crear/editar/eliminar).
      for (const m of modulosSoloLectura) {
        const mod = m as Modulo;
        if (newPermisos[mod]?.length) {
          newPermisos[mod] = ['leer'];
        }
      }
      setPermisos(newPermisos);

      // Update global cache
      globalPermissionsCache = {
        perfil: newPerfil,
        role: newRole,
        permisos: newPermisos,
        userId: currentUserId || null,
        loaded: true,
        modulosOcultosKey: modulosOcultos.join(',') + '|' + modulosSoloLectura.join(','),
      };

      setLoading(false);
      hasLoadedRef.current = true;
      lastUserIdRef.current = currentUserId || null;
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError(err as Error);
      setPerfil(null);
      setRole(null);
      setPermisos(null);
      setLoading(false);
    }
  }, [session?.user?.id, session?.user, buildPermisosMap]);

  /**
   * Cargar permisos cuando la sesión cambie
   */
  useEffect(() => {
    if (status === 'loading') {
      // Only show loading if we haven't loaded permissions yet AND no cache
      if (!hasLoadedRef.current && !globalPermissionsCache.loaded) {
        setLoading(true);
      }
      return;
    }

    if (status === 'unauthenticated') {
      setPerfil(null);
      setRole(null);
      setPermisos(null);
      setLoading(false);
      hasLoadedRef.current = true;
      lastUserIdRef.current = null;
      // Clear cache on logout
      globalPermissionsCache = {
        perfil: null,
        role: null,
        permisos: null,
        userId: null,
        loaded: false,
      };
      return;
    }

    if (status === 'authenticated') {
      // If same user and already cached (with same modulosOcultos), use cache immediately
      const currentUserId = session?.user?.id;
      const cachedOcultos = globalPermissionsCache.modulosOcultosKey ?? '';
      // @ts-ignore
      const currentOcultos = (session?.user?.modulosOcultos ?? []).join(',') + '|' +
        // @ts-ignore
        (session?.user?.modulosSoloLectura ?? []).join(',');
      if (
        globalPermissionsCache.loaded &&
        globalPermissionsCache.userId === currentUserId &&
        cachedOcultos === currentOcultos
      ) {
        setPerfil(globalPermissionsCache.perfil);
        setRole(globalPermissionsCache.role);
        setPermisos(globalPermissionsCache.permisos);
        setLoading(false);
        hasLoadedRef.current = true;
        return;
      }
      loadPermissions();
    }
  }, [status, session?.user?.id, loadPermissions]);

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = useCallback(
    (modulo: Modulo, accion: Accion): boolean => {
      // Admin-ness is reflected in the permisos map (hidden modules are deleted from it)
      return permisos?.[modulo]?.includes(accion) ?? false;
    },
    [permisos]
  );

  /**
   * Verifica si el usuario puede acceder a un módulo
   */
  const canAccess = useCallback(
    (modulo: Modulo): boolean => {
      // Admin-ness is reflected in the permisos map (hidden modules are deleted from it)
      return (permisos?.[modulo]?.length ?? 0) > 0;
    },
    [permisos]
  );

  // Create a refresh function that forces reload
  const refresh = useCallback(async () => {
    await loadPermissions(true);
  }, [loadPermissions]);

  return {
    perfil,
    role,
    permisos,
    loading,
    error,
    hasPermission,
    canAccess,
    isAdmin: role?.es_admin ?? false,
    refresh,
  };
}
