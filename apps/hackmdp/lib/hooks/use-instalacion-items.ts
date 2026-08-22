"use client"

import useSWR from 'swr'
import type { InstalacionItem } from '@locus/core/instalaciones'

interface ItemsResponse {
  equipos: InstalacionItem[]
  items: InstalacionItem[]
}

const fetcher = async (url: string): Promise<ItemsResponse> => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar items')
  return data
}

export function useInstalacionItems(instalacionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ItemsResponse>(
    instalacionId ? `/api/instalaciones/${instalacionId}/items` : null,
    fetcher,
    { dedupingInterval: 5000 }
  )

  return {
    equipos: data?.equipos ?? [],
    items: data?.items ?? [],
    all: [...(data?.equipos ?? []), ...(data?.items ?? [])],
    isLoading,
    error,
    mutate,
  }
}
