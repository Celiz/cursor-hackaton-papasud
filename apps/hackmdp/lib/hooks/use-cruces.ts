"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch cruces')
  return res.json()
}

interface CrucesFilters {
  estado?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useCruces(filters?: CrucesFilters) {
  const params = new URLSearchParams()
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/cruces${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    cruces: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useCruce(cruceId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    cruceId ? `/api/cannabis/cruces/${cruceId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    cruce: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createCruce(cruce: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/cruces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cruce),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create cruce')
  }
  return res.json()
}

export async function updateCruce(cruceId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/cruces/${cruceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update cruce')
  }
  return res.json()
}

export async function deleteCruce(cruceId: string) {
  const res = await fetch(`/api/cannabis/cruces/${cruceId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete cruce')
  return res.json()
}
