"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch banco semillas')
  return res.json()
}

interface BancoSemillasFilters {
  cepa_id?: string
  estado?: string
  disponible_venta?: boolean
  page?: number
  pageSize?: number
}

export function useBancoSemillas(filters?: BancoSemillasFilters) {
  const params = new URLSearchParams()
  if (filters?.cepa_id) params.set('cepa_id', filters.cepa_id)
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.disponible_venta !== undefined) params.set('disponible_venta', String(filters.disponible_venta))
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/banco-semillas${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    semillas: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useBancoSemilla(semillaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    semillaId ? `/api/cannabis/banco-semillas/${semillaId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    semilla: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createBancoSemilla(semilla: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/banco-semillas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(semilla),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create banco semilla')
  }
  return res.json()
}

export async function updateBancoSemilla(semillaId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/banco-semillas/${semillaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update banco semilla')
  }
  return res.json()
}

export async function deleteBancoSemilla(semillaId: string) {
  const res = await fetch(`/api/cannabis/banco-semillas/${semillaId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete banco semilla')
  return res.json()
}
