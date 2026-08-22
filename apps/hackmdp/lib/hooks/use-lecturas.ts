"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch lecturas')
  return res.json()
}

export function useLecturas(salaId: string | null, options?: { from?: string; to?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams()
  if (salaId) params.set('sala_id', salaId)
  if (options?.from) params.set('from', options.from)
  if (options?.to) params.set('to', options.to)
  if (options?.page) params.set('page', String(options.page))
  if (options?.pageSize) params.set('pageSize', String(options.pageSize))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    salaId ? `/api/cannabis/lecturas?${qs}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    lecturas: data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useLecturasStats(salaId: string | null, days: number = 7) {
  const { data, error, isLoading } = useSWR(
    salaId ? `/api/cannabis/lecturas/stats?sala_id=${salaId}&days=${days}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  return {
    stats: data?.data ?? [],
    isLoading,
    error,
  }
}

export async function createLectura(lectura: Record<string, unknown>) {
  const res = await fetch('/api/cannabis/lecturas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lectura),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create lectura')
  }
  return res.json()
}
