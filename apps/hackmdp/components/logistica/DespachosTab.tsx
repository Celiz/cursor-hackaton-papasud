'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Search,
  Truck,
  Package,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

interface DespachosTabProps {
  onStatsChange: () => void
}

interface PrepItem {
  tipo_equipo: string | null
  marca: string | null
  modelo: string | null
  estado: string | null
}

interface PrepEntrega {
  id: string
  numero: string
  estado: 'pendiente' | 'en_preparacion' | 'parcial' | 'listo' | 'despachado'
  cliente_nombre: string | null
  responsable_nombre: string | null
  total_items: number
  items: PrepItem[] | null
  fecha_creacion: string
  fecha_requerida: string | null
  notas: string | null
  transporte_id: string | null
  transporte_nombre: string | null
}

interface Transporte {
  id: string
  nombre: string
  telefono: string | null
  whatsapp: string | null
}

type EstadoFilter = 'pendiente' | 'en_preparacion' | 'listo' | 'despachado' | 'todos'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  en_preparacion: { label: 'En preparación', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  parcial: { label: 'Parcial', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  listo: { label: 'Listo', className: 'bg-green-100 text-green-700 border-green-200' },
  despachado: { label: 'Despachado', className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const FILTERS: { value: EstadoFilter; label: string }[] = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'listo', label: 'Listos' },
  { value: 'despachado', label: 'Despachados' },
  { value: 'todos', label: 'Todos' },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function DespachosTab({ onStatsChange }: DespachosTabProps) {
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('pendiente')
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [despachando, setDespachando] = useState<string | null>(null)

  const { data: ordenes, error, isLoading, mutate } = useSWR<PrepEntrega[]>(
    '/api/preparacion-entregas',
    fetcher,
    { dedupingInterval: 3000 }
  )

  const { data: transportes } = useSWR<Transporte[]>(
    despachando ? '/api/transportes' : null,
    fetcher,
    { dedupingInterval: 30000 }
  )

  const filtered = useMemo(() => {
    if (!ordenes || !Array.isArray(ordenes)) return []
    let list = ordenes
    if (estadoFilter !== 'todos') {
      list = list.filter(o => o.estado === estadoFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.numero?.toLowerCase().includes(q) ||
        o.cliente_nombre?.toLowerCase().includes(q)
      )
    }
    return list
  }, [ordenes, estadoFilter, search])

  async function handleCambiarEstado(id: string, estado: string, extra?: Record<string, string>) {
    setLoadingId(id)
    try {
      const res = await fetch('/api/preparacion-entregas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado, ...extra }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar estado')
      }
      const labels: Record<string, string> = {
        en_preparacion: 'Orden en preparación',
        listo: 'Orden lista para despacho',
        despachado: 'Orden despachada',
      }
      toast.success(labels[estado] || 'Estado actualizado')
      mutate()
      onStatsChange()
      setDespachando(null)
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar estado')
    } finally {
      setLoadingId(null)
    }
  }

  function handleDespachar(id: string, transporteId: string) {
    const t = transportes?.find(tr => tr.id === transporteId)
    if (!t) return
    handleCambiarEstado(id, 'despachado', {
      transporte_id: t.id,
      transporte_nombre: t.nombre,
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setEstadoFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                estadoFilter === f.value
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Cargando despachos...
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">
          Error al cargar despachos
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay ordenes {estadoFilter !== 'todos' ? `en estado "${ESTADO_BADGE[estadoFilter]?.label || estadoFilter}"` : ''} para mostrar
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fecha</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">N°</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Solicitado por</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Cliente</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Items</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Transporte</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(orden => {
                const badge = ESTADO_BADGE[orden.estado] || ESTADO_BADGE.pendiente
                const isProcessing = loadingId === orden.id
                const isSelectingTransporte = despachando === orden.id

                return (
                  <tr key={orden.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatDate(orden.fecha_creacion)}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium">
                      {orden.numero}
                    </td>
                    <td className="px-3 py-2">
                      {orden.responsable_nombre || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {orden.cliente_nombre || '—'}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {orden.total_items}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-xs ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {orden.transporte_nombre || '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {orden.estado === 'pendiente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={isProcessing}
                          onClick={() => handleCambiarEstado(orden.id, 'en_preparacion')}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Package className="h-3 w-3" />
                          )}
                          Preparar
                        </Button>
                      )}
                      {orden.estado === 'en_preparacion' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={isProcessing}
                          onClick={() => handleCambiarEstado(orden.id, 'listo')}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Marcar listo
                        </Button>
                      )}
                      {orden.estado === 'listo' && (
                        isSelectingTransporte ? (
                          <div className="flex items-center gap-1.5">
                            <Select
                              onValueChange={(val) => handleDespachar(orden.id, val)}
                            >
                              <SelectTrigger className="h-7 text-xs w-[160px]">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {transportes?.map(t => (
                                  <SelectItem key={t.id} value={t.id} className="text-xs">
                                    {t.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => setDespachando(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={isProcessing}
                            onClick={() => setDespachando(orden.id)}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Truck className="h-3 w-3" />
                            )}
                            Despachar
                          </Button>
                        )
                      )}
                      {orden.estado === 'despachado' && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Truck className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
