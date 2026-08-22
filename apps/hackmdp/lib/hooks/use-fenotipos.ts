"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch fenotipos')
  return res.json()
}

interface FenotiposFilters {
  cepa_id?: string
  cruce_id?: string
  seleccionado?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export function useFenotipos(filters?: FenotiposFilters) {
  const params = new URLSearchParams()
  if (filters?.cepa_id) params.set('cepa_id', filters.cepa_id)
  if (filters?.cruce_id) params.set('cruce_id', filters.cruce_id)
  if (filters?.seleccionado !== undefined) params.set('seleccionado', String(filters.seleccionado))
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/fenotipos${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    fenotipos: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useFenotipo(fenotipoId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    fenotipoId ? `/api/cannabis/fenotipos/${fenotipoId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    fenotipo: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createFenotipo(fenotipo: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/fenotipos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fenotipo),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create fenotipo')
  }
  return res.json()
}

export async function updateFenotipo(fenotipoId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/fenotipos/${fenotipoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update fenotipo')
  }
  return res.json()
}

export async function deleteFenotipo(fenotipoId: string) {
  const res = await fetch(`/api/cannabis/fenotipos/${fenotipoId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete fenotipo')
  return res.json()
}
