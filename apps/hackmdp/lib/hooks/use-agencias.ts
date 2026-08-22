"use client"

import useSWR from 'swr'
import type { Agencia, EmpresaAgencia } from '@studio/erp-core/agencias'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch agencias')
  return res.json()
}

export type AgenciaConEstado = Agencia & {
  empresa_agencia_id: string | null
  empresa_estado: string | null
  empresa_config: Record<string, unknown> | null
}

export function useAgencias() {
  const { data, error, isLoading, mutate } = useSWR<AgenciaConEstado[]>(
    '/api/agencias',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    agencias: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export async function enableAgencia(agenciaId: string) {
  const res = await fetch('/api/agencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agencia_id: agenciaId }),
  })
  if (!res.ok) throw new Error('Failed to enable agencia')
  return res.json()
}
