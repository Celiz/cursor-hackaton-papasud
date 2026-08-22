"use client"

import useSWR from 'swr'
import type { AgPlan } from '@studio/erp-core/agencias'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch planes')
  return res.json()
}

export function usePlanes(agenciaTipo?: string) {
  const params = agenciaTipo ? `?agencia_tipo=${agenciaTipo}` : ''
  const { data, error, isLoading, mutate } = useSWR<AgPlan[]>(
    `/api/agencias/planes${params}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    planes: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function usePlan(planId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<AgPlan>(
    planId ? `/api/agencias/planes/${planId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    plan: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createPlan(plan: {
  agencia_tipo: string
  nombre: string
  descripcion?: string
  periodo_inicio: string
  periodo_fin: string
  objetivos?: unknown[]
  estrategia?: Record<string, unknown>
  notas?: string
}) {
  const res = await fetch('/api/agencias/planes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })
  if (!res.ok) throw new Error('Failed to create plan')
  return res.json()
}

export async function updatePlan(planId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/agencias/planes/${planId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update plan')
  return res.json()
}

export async function deletePlan(planId: string) {
  const res = await fetch(`/api/agencias/planes/${planId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete plan')
  return res.json()
}
