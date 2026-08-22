'use client';

import useSWR from 'swr';
import { agruparPorItem, type AdjuntoItem } from '@/lib/instalaciones/adjuntos';

const fetcher = async (url: string): Promise<AdjuntoItem[]> => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar adjuntos');
  return Array.isArray(data) ? data : [];
};

/**
 * Adjuntos de una instalación agrupados por ítem (item_ref → adjuntos).
 * Una sola llamada alimenta toda la solapa "Equipos e insumos".
 */
export function useInstalacionAdjuntos(instalacionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<AdjuntoItem[]>(
    instalacionId ? `/api/instalaciones/${instalacionId}/adjuntos` : null,
    fetcher,
    { dedupingInterval: 5000 }
  );

  const porItem = agruparPorItem(data ?? []);

  return { porItem, isLoading, error, mutate };
}
