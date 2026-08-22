"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch alertas')
  return res.json()
}

export function useAlertasCannabis(filters?: { sala_id?: string; activa?: boolean }) {
  const params = new URLSearchParams()
  if (filters?.sala_id) params.set('sala_id', filters.sala_id)
  if (filters?.activa !== undefined) params.set('activa', String(filters.activa))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/alertas${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    alertas: data?.data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useAlertasLog(filters?: { sala_id?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams()
  if (filters?.sala_id) params.set('sala_id', filters.sala_id)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cannabis/alertas/log${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    logs: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createAlerta(alerta: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/alertas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alerta),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create alerta')
  }
  return res.json()
}

export async function updateAlerta(alertaId: string, updates: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/alertas', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: alertaId, ...updates }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update alerta')
  }
  return res.json()
}

export async function deleteAlerta(alertaId: string) {
  const res = await fetch(`/api/cannabis/alertas?id=${alertaId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete alerta')
  return res.json()
}
