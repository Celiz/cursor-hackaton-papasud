"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch cepas')
  return res.json()
}

interface CepasFilters {
  tipo?: string
  estado?: string
  es_propia?: boolean
  dificultad?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useCepas(filters?: CepasFilters) {
  const params = new URLSearchParams()
  if (filters?.tipo) params.set('tipo', filters.tipo)
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.es_propia !== undefined) params.set('es_propia', String(filters.es_propia))
  if (filters?.dificultad) params.set('dificultad', filters.dificultad)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/cepas${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    cepas: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useCepa(cepaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    cepaId ? `/api/cannabis/cepas/${cepaId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    cepa: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useCepaGenealogy(cepaId: string | null) {
  const { data, error, isLoading } = useSWR(
    cepaId ? `/api/cannabis/cepas/${cepaId}/genealogy` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  return {
    ancestros: data?.ancestros ?? [],
    descendencia: data?.descendencia ?? [],
    isLoading,
    error,
  }
}

export async function createCepa(cepa: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/cepas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cepa),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create cepa')
  }
  return res.json()
}

export async function updateCepa(cepaId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/cepas/${cepaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update cepa')
  }
  return res.json()
}

export async function deleteCepa(cepaId: string) {
  const res = await fetch(`/api/cannabis/cepas/${cepaId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete cepa')
  return res.json()
}
