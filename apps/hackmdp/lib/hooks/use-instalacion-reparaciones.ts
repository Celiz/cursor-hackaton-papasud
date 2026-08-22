'use client';

import useSWR from 'swr';
import type { EstadoReparacion } from '@locus/core/instalaciones';

export interface ReparacionActual {
  item_ref: string;
  estado: EstadoReparacion;
  motivo?: string | null;
  equipo_descripcion?: string | null;
  autor_nombre?: string | null;
  created_at: string;
}

const fetcher = async (url: string): Promise<ReparacionActual[]> => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar reparaciones');
  return Array.isArray(data) ? data : [];
};

/**
 * Estado ACTUAL de reparación por ítem (mapa item_ref → estado) para pintar el badge.
 */
export function useInstalacionReparaciones(instalacionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ReparacionActual[]>(
    instalacionId ? `/api/instalaciones/${instalacionId}/reparaciones` : null,
    fetcher,
    { dedupingInterval: 5000 }
  );

  const porItem = new Map<string, ReparacionActual>();
  for (const r of data ?? []) porItem.set(r.item_ref, r);

  return { porItem, isLoading, error, mutate };
}
