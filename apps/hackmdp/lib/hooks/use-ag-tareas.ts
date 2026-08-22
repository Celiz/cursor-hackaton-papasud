"use client"

import useSWR from 'swr'
import type { AgTarea } from '@studio/erp-core/agencias'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch tareas')
  return res.json()
}

export interface TareasFilters {
  agencia_tipo?: string
  plan_id?: string
  estado?: string
  tipo?: string
  canal?: string
  fecha_desde?: string
  fecha_hasta?: string
}

function buildTareasUrl(filters: TareasFilters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.set(key, val)
  })
  const qs = params.toString()
  return `/api/agencias/tareas${qs ? `?${qs}` : ''}`
}

export function useTareas(filters: TareasFilters = {}) {
  const url = buildTareasUrl(filters)
  const { data, error, isLoading, mutate } = useSWR<AgTarea[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    }
  )

  return {
    tareas: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useTarea(tareaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<AgTarea>(
    tareaId ? `/api/agencias/tareas/${tareaId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    }
  )

  return {
    tarea: data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function createTarea(tarea: {
  agencia_tipo: string
  plan_id?: string
  titulo: string
  descripcion?: string
  contenido?: string
  tipo: string
  canal?: string
  canal_id?: string
  fecha_programada?: string
  etiquetas?: string[]
  metadata?: Record<string, unknown>
}) {
  const res = await fetch('/api/agencias/tareas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tarea),
  })
  if (!res.ok) throw new Error('Failed to create tarea')
  return res.json()
}

export async function updateTarea(tareaId: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/agencias/tareas/${tareaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update tarea')
  return res.json()
}

export async function deleteTarea(tareaId: string) {
  const res = await fetch(`/api/agencias/tareas/${tareaId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete tarea')
  return res.json()
}
