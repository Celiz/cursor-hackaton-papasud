"use client"

import useSWR from 'swr'
import type { InstalacionComentario } from '@locus/core/instalaciones'

const fetcher = async (url: string): Promise<InstalacionComentario[]> => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar comentarios')
  return Array.isArray(data) ? data : []
}

export function useInstalacionComentarios(instalacionId: string | null) {
  const { data = [], error, isLoading, mutate } = useSWR<InstalacionComentario[]>(
    instalacionId ? `/api/instalaciones/${instalacionId}/comentarios` : null,
    fetcher,
    { dedupingInterval: 3000 }
  )

  return { comentarios: data, isLoading, error, mutate }
}
