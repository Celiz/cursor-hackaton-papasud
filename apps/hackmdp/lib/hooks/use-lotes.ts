"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch lotes')
  return res.json()
}

interface LotesFilters {
  estado?: string
  sala_id?: string
  cepa_id?: string
  fase_actual?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useLotes(filters?: LotesFilters) {
  const params = new URLSearchParams()
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.sala_id) params.set('sala_id', filters.sala_id)
  if (filters?.cepa_id) params.set('cepa_id', filters.cepa_id)
  if (filters?.fase_actual) params.set('fase_actual', filters.fase_actual)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/lotes${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    lotes: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useLote(loteId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    loteId ? `/api/cannabis/lotes/${loteId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    lote: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createLote(lote: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/lotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lote),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create lote')
  }
  return res.json()
}

export async function updateLote(loteId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/lotes/${loteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update lote')
  }
  return res.json()
}

export async function deleteLote(loteId: string) {
  const res = await fetch(`/api/cannabis/lotes/${loteId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete lote')
  return res.json()
}

export async function avanzarFase(loteId: string, data: { nueva_fase: string; notas?: string }) {
  const res = await fetch(`/api/cannabis/lotes/${loteId}/avanzar-fase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to advance phase')
  }
  return res.json()
}
