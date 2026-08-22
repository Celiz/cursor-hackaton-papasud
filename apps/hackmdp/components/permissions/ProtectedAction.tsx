"use client"

import React from 'react';
import { useUserPermissions } from '@/lib/hooks/use-user-permissions';
import type { Modulo, Accion } from '@/lib/types/roles';

interface ProtectedActionProps {
  modulo: Modulo;
  accion: Accion;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

/**
 * Componente para proteger acciones individuales según permisos
 *
 * @example
 * <ProtectedAction modulo="clientes" accion="crear">
 *   <Button onClick={handleCreate}>Nuevo Cliente</Button>
 * </ProtectedAction>
 */
export function ProtectedAction({
  modulo,
  accion,
  children,
  fallback = null,
  showLoading = false,
}: ProtectedActionProps) {
  const { hasPermission, loading } = useUserPermissions();

  if (loading && showLoading) {
    return <div className="h-9 w-20 animate-pulse rounded bg-muted" />;
  }

  if (loading && !showLoading) {
    return null;
  }

  if (!hasPermission(modulo, accion)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
