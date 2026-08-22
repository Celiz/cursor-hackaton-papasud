'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
})

export interface VetCuentaResumen {
  id: string
  paciente_id: string
  cliente_id: string | null
  estado: 'abierta' | 'cerrada' | 'facturada'
  fecha_apertura: string
  fecha_cierre: string | null
  descuento_global_pct: number
  descuento_global_monto: number
  paciente_nombre?: string
  cliente_nombre?: string
  items_count?: number
  total?: number
}

export interface VetCuentaItemResumen {
  id: string
  cuenta_id: string
  tipo: string
  referencia_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento_pct: number
  sin_cargo: boolean
  subtotal: number
  origen_precio: string
  created_at: string
}

export interface VetCuentaDetalle extends VetCuentaResumen {
  items: VetCuentaItemResumen[]
}

export function useVetCuentas(filters?: { estado?: string; paciente_id?: string }) {
  const params = new URLSearchParams()
  if (filters?.estado) params.set('estado', filters.estado)
  if (filters?.paciente_id) params.set('paciente_id', filters.paciente_id)
  const qs = params.toString()

  return useSWR<VetCuentaResumen[]>(
    `/api/vet/cuentas${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
}

export function useVetCuenta(id: string | null) {
  return useSWR<VetCuentaDetalle>(
    id ? `/api/vet/cuentas/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
}

export function useVetCuentaItems(cuentaId: string | null) {
  return useSWR<VetCuentaItemResumen[]>(
    cuentaId ? `/api/vet/cuentas/${cuentaId}/items` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
}

export function useCuentaAbiertaPaciente(pacienteId: string | null) {
  return useSWR<VetCuentaResumen | null>(
    pacienteId ? `/api/vet/cuentas/paciente/${pacienteId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  )
}
