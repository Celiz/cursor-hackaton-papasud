"use client"

import useSWR from 'swr'
import type { AgMetrica } from '@studio/erp-core/agencias'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch metricas')
  return res.json()
}

export interface MetricasFilters {
  agencia_tipo?: string
  canal?: string
  fecha_desde?: string
  fecha_hasta?: string
}

function buildMetricasUrl(filters: MetricasFilters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.set(key, val)
  })
  const qs = params.toString()
  return `/api/agencias/metricas${qs ? `?${qs}` : ''}`
}

export function useMetricas(filters: MetricasFilters = {}) {
  const url = buildMetricasUrl(filters)
  const { data, error, isLoading, mutate } = useSWR<AgMetrica[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    metricas: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export async function createMetrica(metrica: {
  agencia_tipo: string
  canal?: string
  fecha: string
  datos: Record<string, number>
}) {
  const res = await fetch('/api/agencias/metricas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metrica),
  })
  if (!res.ok) throw new Error('Failed to create metrica')
  return res.json()
}
