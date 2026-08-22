"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch lineas geneticas')
  return res.json()
}

export function useLineasGeneticas(filters?: { estado?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams()
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/lineas-geneticas${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    lineas: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useLineaGenetica(lineaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    lineaId ? `/api/cannabis/lineas-geneticas/${lineaId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    linea: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createLineaGenetica(linea: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/lineas-geneticas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(linea),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create linea genetica')
  }
  return res.json()
}

export async function updateLineaGenetica(lineaId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/lineas-geneticas/${lineaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update linea genetica')
  }
  return res.json()
}

export async function deleteLineaGenetica(lineaId: string) {
  const res = await fetch(`/api/cannabis/lineas-geneticas/${lineaId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete linea genetica')
  return res.json()
}
