"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch salas')
  return res.json()
}

export function useSalas(estado?: string) {
  const params = estado ? `?estado=${estado}` : ''
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/salas${params}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    salas: data?.data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useSala(salaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    salaId ? `/api/cannabis/salas/${salaId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    sala: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createSala(sala: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/salas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sala),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create sala')
  }
  return res.json()
}

export async function updateSala(salaId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/salas/${salaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update sala')
  }
  return res.json()
}

export async function deleteSala(salaId: string) {
  const res = await fetch(`/api/cannabis/salas/${salaId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete sala')
  }
  return res.json()
}
