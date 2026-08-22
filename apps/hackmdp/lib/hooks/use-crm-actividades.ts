"use client"

import useSWR from 'swr'
import type { CrmActividad } from '@/lib/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch actividades programadas')
  return res.json()
}

export function useCrmActividades(oportunidadId?: string, estado: string = 'pendiente') {
  const url = oportunidadId
    ? `/api/crm/actividades-programadas?oportunidad_id=${oportunidadId}&estado=${estado}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<CrmActividad[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    actividades: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
