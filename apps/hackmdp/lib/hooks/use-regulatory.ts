"use client"

import useSWR from 'swr'
import type { RegRegistro, RegDocumento, RegTecnovigilancia, RegAlerta, RegDashboard, RegTrazabilidadEquipo, RegTrazabilidadReactivo } from '@locus/db/schema/regulatory'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar datos regulatorios')
  return res.json()
}

export function useRegDashboard() {
  const { data, error, isLoading, mutate } = useSWR<RegDashboard>(
    '/api/regulatorio/dashboard', fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
  return { dashboard: data ?? null, isLoading, error, mutate }
}

export function useRegRegistros(filters?: { estado?: string; entidad?: string; q?: string }) {
  const params = new URLSearchParams()
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.entidad) params.set('entidad', filters.entidad)
  if (filters?.q) params.set('q', filters.q)
  const qs = params.toString()

  const { data, error, isLoading, mutate } = useSWR<RegRegistro[]>(
    `/api/regulatorio/registros${qs ? `?${qs}` : ''}`, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return { registros: data ?? [], isLoading, error, mutate }
}

export function useRegDocumentos(filters?: { tipo?: string; vencidos?: boolean }) {
  const params = new URLSearchParams()
  if (filters?.tipo) params.set('tipo', filters.tipo)
  if (filters?.vencidos) params.set('vencidos', 'true')
  const qs = params.toString()

  const { data, error, isLoading, mutate } = useSWR<RegDocumento[]>(
    `/api/regulatorio/documentos${qs ? `?${qs}` : ''}`, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return { documentos: data ?? [], isLoading, error, mutate }
}

export function useRegTecnovigilancia(filters?: { estado?: string; gravedad?: string }) {
  const params = new URLSearchParams()
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.gravedad) params.set('gravedad', filters.gravedad)
  const qs = params.toString()

  const { data, error, isLoading, mutate } = useSWR<RegTecnovigilancia[]>(
    `/api/regulatorio/tecnovigilancia${qs ? `?${qs}` : ''}`, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return { eventos: data ?? [], isLoading, error, mutate }
}

export function useRegAlertas() {
  const { data, error, isLoading, mutate } = useSWR<RegAlerta[]>(
    '/api/regulatorio/alertas', fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
  return { alertas: data ?? [], isLoading, error, mutate }
}

export function useRegAlertasCount() {
  const { data, error, mutate } = useSWR<{ count: number }>(
    '/api/regulatorio/alertas?count=true', fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000, refreshInterval: 300000 }
  )
  return { count: data?.count ?? 0, error, mutate }
}

export function useRegTrazabilidadEquipo(instanciaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RegTrazabilidadEquipo[]>(
    instanciaId ? `/api/regulatorio/trazabilidad/equipos/${instanciaId}` : null, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return { eventos: data ?? [], isLoading, error, mutate }
}

// Equipment list for trazabilidad page (paginated)
export function useRegEquiposList(filters?: { search?: string; tipo?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.tipo) params.set('tipo', filters.tipo)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/regulatorio/trazabilidad/equipos${qs ? `?${qs}` : ''}`, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return {
    equipos: (data?.items ?? []) as any[],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 1,
    isLoading, error, mutate,
  }
}

// Unified timeline for a specific equipo (equipo info + timeline from multiple sources)
export function useRegEquipoTimeline(instanciaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    instanciaId ? `/api/regulatorio/trazabilidad/equipos/${instanciaId}` : null, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return {
    equipo: data?.equipo ?? null,
    timeline: (data?.timeline ?? []) as any[],
    isLoading, error, mutate,
  }
}

// Insumos list (paginated)
export function useRegInsumosList(filters?: { search?: string; categoria?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.categoria) params.set('categoria', filters.categoria)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/regulatorio/trazabilidad/insumos${qs ? `?${qs}` : ''}`, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return {
    insumos: (data?.items ?? []) as any[],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 1,
    isLoading, error, mutate,
  }
}

// Insumo detail (producto + lotes + consumo)
export function useRegInsumoDetail(productoId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    productoId ? `/api/regulatorio/trazabilidad/insumos/${productoId}` : null, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return {
    producto: data?.producto ?? null,
    lotes: (data?.lotes ?? []) as any[],
    consumo: (data?.consumo ?? []) as any[],
    isLoading, error, mutate,
  }
}

// Repuestos list (paginated)
export function useRegRepuestosList(filters?: { search?: string; categoria?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.categoria) params.set('categoria', filters.categoria)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR(
    `/api/regulatorio/trazabilidad/repuestos${qs ? `?${qs}` : ''}`, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return {
    repuestos: (data?.items ?? []) as any[],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 1,
    isLoading, error, mutate,
  }
}

// Repuesto detail (producto + lotes + movimientos)
export function useRegRepuestoDetail(productoId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    productoId ? `/api/regulatorio/trazabilidad/repuestos/${productoId}` : null, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return {
    producto: data?.producto ?? null,
    lotes: (data?.lotes ?? []) as any[],
    movimientos: (data?.movimientos ?? []) as any[],
    isLoading, error, mutate,
  }
}

export function useRegTrazabilidadReactivo(reactivoId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RegTrazabilidadReactivo[]>(
    reactivoId ? `/api/regulatorio/trazabilidad/reactivos/${reactivoId}` : null, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return { eventos: data ?? [], isLoading, error, mutate }
}

// ============================================================================
// Vencimientos unificados
// ============================================================================

export function useVencimientos(filters?: {
  tipo?: string
  severidad?: string
  estado?: string
  asignado_a?: string
  q?: string
}) {
  const params = new URLSearchParams()
  if (filters?.tipo) params.set('tipo', filters.tipo)
  if (filters?.severidad) params.set('severidad', filters.severidad)
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.asignado_a) params.set('asignado_a', filters.asignado_a)
  if (filters?.q) params.set('q', filters.q)
  const qs = params.toString()

  const { data, error, isLoading, mutate } = useSWR(
    `/api/regulatorio/vencimientos${qs ? `?${qs}` : ''}`, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
  return { vencimientos: (data ?? []) as any[], isLoading, error, mutate }
}

export function useVencimientoConsumo(id: string | null, tipo: string | null) {
  const { data, error, isLoading } = useSWR(
    id && tipo ? `/api/regulatorio/vencimientos/${id}/consumo?tipo=${tipo}` : null, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  )
  return { consumo: (data ?? []) as any[], isLoading, error }
}

export function useProductoConsumo(productoId: string | null) {
  const { data, error, isLoading } = useSWR(
    productoId ? `/api/productos/${productoId}/consumo` : null, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  )
  return { consumo: data as any, isLoading, error }
}

export function useVencimientosCriticosCount() {
  const { data, error } = useSWR<{ count: number }>(
    '/api/regulatorio/vencimientos/count', fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000, refreshInterval: 300000 }
  )
  return { count: data?.count ?? 0, error }
}
