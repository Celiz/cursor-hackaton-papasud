"use client"

import useSWR from 'swr'

// Note: /api/equipos-unidades supports ?estado= filter but not ?q= text search.
// Client-side filtering should be applied by consumers when searchQuery is used.
export interface EquipoUnidadStock {
  id: string
  codigo: string | null
  numero_serie: string
  equipo_id: string
  equipo_nombre: string
  estado_general: string
}

const fetcher = async (url: string): Promise<EquipoUnidadStock[]> => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error')
  return Array.isArray(data) ? data : []
}

export function useStockEquipos(searchQuery: string = '') {
  // /api/equipos-unidades supports ?estado= but not ?q= — text filtering is client-side
  const url = `/api/equipos-unidades?estado=stock`
  const { data = [], error, isLoading } = useSWR<EquipoUnidadStock[]>(url, fetcher, {
    dedupingInterval: 2000,
  })

  const equipos = searchQuery
    ? data.filter(
        (e) =>
          e.numero_serie.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.equipo_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.codigo ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data

  return { equipos, isLoading, error }
}
