'use client';

import useSWR from 'swr';
import type { InstalacionItemHistorial } from '@locus/core/instalaciones';

type HistorialEntry = InstalacionItemHistorial & { item_descripcion?: string };

const fetcher = async (url: string): Promise<HistorialEntry[]> => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar historial');
  return data;
};

export function useInstalacionHistorial(instalacionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<HistorialEntry[]>(
    instalacionId ? `/api/instalaciones/${instalacionId}/historial` : null,
    fetcher,
    { dedupingInterval: 5000 }
  );

  return {
    historial: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
