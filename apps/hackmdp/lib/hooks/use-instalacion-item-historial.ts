'use client';

import useSWR from 'swr';
import type { InstalacionItemHistorial } from '@locus/core/instalaciones';

const fetcher = async (url: string): Promise<InstalacionItemHistorial[]> => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar historial');
  return data;
};

export function useInstalacionItemHistorial(
  instalacionId: string | null,
  itemId: string | null
) {
  const { data, error, isLoading, mutate } = useSWR<InstalacionItemHistorial[]>(
    instalacionId && itemId
      ? `/api/instalaciones/${instalacionId}/items/${itemId}/historial`
      : null,
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
