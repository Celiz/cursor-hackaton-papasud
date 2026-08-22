'use client'

import useSWR from 'swr'
import type { Anuncio } from '@/lib/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch anuncios')
  return res.json()
}

export function useAnuncios() {
  const { data, error, isLoading, mutate } = useSWR<Anuncio[]>(
    '/api/anuncios',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  return {
    anuncios: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export async function createAnuncio(anuncio: { titulo: string; tipo: string; contenido?: string; vigencia_hasta?: string }) {
  const res = await fetch('/api/anuncios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(anuncio),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al crear anuncio')
  }
  return res.json()
}

export async function updateAnuncio(id: string, updates: Partial<Pick<Anuncio, 'titulo' | 'tipo' | 'contenido' | 'vigencia_hasta'>>) {
  const res = await fetch(`/api/anuncios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al actualizar anuncio')
  }
  return res.json()
}

export async function deleteAnuncio(id: string) {
  const res = await fetch(`/api/anuncios/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al eliminar anuncio')
  }
  return res.json()
}
