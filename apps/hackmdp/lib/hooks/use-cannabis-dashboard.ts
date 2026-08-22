"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch cannabis dashboard')
  return res.json()
}

export interface CannabisDashboardKPIs {
  lotes_activos: number
  cepas_activas: number
  cosechas_mes: number
  cosechas_mes_peso_g: number
  alertas_pendientes: number
  salas_activas: number
  banco_semillas_bajo_stock: number
}

export function useCannabisDashboard() {
  const { data, error, isLoading, mutate } = useSWR<CannabisDashboardKPIs>(
    '/api/cannabis/dashboard',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      refreshInterval: 120000,
    }
  )

  return {
    kpis: data ?? null,
    isLoading,
    error,
    mutate,
  }
}
