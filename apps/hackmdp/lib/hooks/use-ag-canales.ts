"use client"

import useSWR from 'swr'
import type { AgCanal } from '@studio/erp-core/agencias'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch canales')
  return res.json()
}

export function useCanales() {
  const { data, error, isLoading, mutate } = useSWR<AgCanal[]>(
    '/api/agencias/canales',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    canales: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export async function createCanal(canal: {
  tipo: string
  nombre: string
  config?: Record<string, unknown>
}) {
  const res = await fetch('/api/agencias/canales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(canal),
  })
  if (!res.ok) throw new Error('Failed to create canal')
  return res.json()
}

export async function updateCanal(canalId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/agencias/canales/${canalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update canal')
  return res.json()
}

export async function deleteCanal(canalId: string) {
  const res = await fetch(`/api/agencias/canales/${canalId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete canal')
  return res.json()
}
