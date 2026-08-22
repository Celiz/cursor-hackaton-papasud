"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch cosechas')
  return res.json()
}

interface CosechasFilters {
  estado?: string
  cepa_id?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useCosechas(filters?: CosechasFilters) {
  const params = new URLSearchParams()
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.cepa_id) params.set('cepa_id', filters.cepa_id)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/cosechas${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    cosechas: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useCosecha(cosechaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    cosechaId ? `/api/cannabis/cosechas/${cosechaId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    cosecha: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createCosecha(cosecha: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/cosechas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cosecha),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create cosecha')
  }
  return res.json()
}

export async function updateCosecha(cosechaId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/cosechas/${cosechaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update cosecha')
  }
  return res.json()
}

export async function deleteCosecha(cosechaId: string) {
  const res = await fetch(`/api/cannabis/cosechas/${cosechaId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete cosecha')
  return res.json()
}
