'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Search,
  CheckCircle2,
  ClipboardCheck,
  ThumbsUp,
  PackageCheck,
  Loader2,
} from 'lucide-react'
import { ControlRemitDialog } from './ControlRemitDialog'

interface RecepcionesTabProps {
  onStatsChange: () => void
}

interface RemitoItem {
  id: string
  producto_id: string | null
  descripcion: string | null
  cantidad: number
  precio_unitario: number
  marca: string | null
  rubro: string | null
}

interface Remito {
  id: string
  numero: string
  fecha: string
  estado: 'pendiente' | 'controlado' | 'aprobado' | 'ingresado'
  proveedor_nombre: string | null
  items: RemitoItem[] | null
  notas_control: string | null
  controlado_at: string | null
  aprobado_at: string | null
  ingresado_at: string | null
  total: number
}

type EstadoFilter = 'pendiente' | 'controlado' | 'aprobado' | 'ingresado' | 'todos'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  controlado: { label: 'Controlado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  aprobado: { label: 'Aprobado', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  ingresado: { label: 'Ingresado', className: 'bg-green-100 text-green-700 border-green-200' },
}

const FILTERS: { value: EstadoFilter; label: string }[] = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'controlado', label: 'Controlados' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'ingresado', label: 'Ingresados' },
  { value: 'todos', label: 'Todos' },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function RecepcionesTab({ onStatsChange }: RecepcionesTabProps) {
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('pendiente')
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [controlDialogOpen, setControlDialogOpen] = useState(false)
  const [selectedRemito, setSelectedRemito] = useState<any>(null)

  const { data: remitos, error, isLoading, mutate } = useSWR<Remito[]>(
    '/api/remitos-compra',
    fetcher,
    { dedupingInterval: 3000 }
  )

  const filtered = useMemo(() => {
    if (!remitos || !Array.isArray(remitos)) return []
    let list = remitos
    if (estadoFilter !== 'todos') {
      list = list.filter(r => r.estado === estadoFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.numero?.toLowerCase().includes(q) ||
        r.proveedor_nombre?.toLowerCase().includes(q)
      )
    }
    return list
  }, [remitos, estadoFilter, search])

  async function handleAccion(id: string, accion: 'controlar' | 'aprobar' | 'ingresar') {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/remitos-compra/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar estado')
      }
      const labels: Record<string, string> = {
        controlar: 'Remito controlado',
        aprobar: 'Remito aprobado',
        ingresar: 'Stock ingresado',
      }
      toast.success(labels[accion])
      mutate()
      onStatsChange()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar estado')
    } finally {
      setLoadingId(null)
    }
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
            placeholder="Buscar por numero o proveedor..."
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
          Cargando recepciones...
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">
          Error al cargar recepciones
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay remitos {estadoFilter !== 'todos' ? `en estado "${estadoFilter}"` : ''} para mostrar
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fecha</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">N Remito</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Proveedor</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Items</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(remito => {
                const badge = ESTADO_BADGE[remito.estado] || ESTADO_BADGE.pendiente
                const itemCount = Array.isArray(remito.items) ? remito.items.length : 0
                const isProcessing = loadingId === remito.id

                return (
                  <tr key={remito.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatDate(remito.fecha)}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium">
                      {remito.numero}
                    </td>
                    <td className="px-3 py-2">
                      {remito.proveedor_nombre || '-'}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {itemCount}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-xs ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {remito.estado === 'pendiente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            setSelectedRemito(remito)
                            setControlDialogOpen(true)
                          }}
                        >
                          <ClipboardCheck className="h-3 w-3" />
                          Controlar
                        </Button>
                      )}
                      {remito.estado === 'controlado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={isProcessing}
                          onClick={() => handleAccion(remito.id, 'aprobar')}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-3 w-3" />
                          )}
                          Aprobar
                        </Button>
                      )}
                      {remito.estado === 'aprobado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={isProcessing}
                          onClick={() => handleAccion(remito.id, 'ingresar')}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <PackageCheck className="h-3 w-3" />
                          )}
                          Ingresar al stock
                        </Button>
                      )}
                      {remito.estado === 'ingresado' && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ingresado
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

      <ControlRemitDialog
        open={controlDialogOpen}
        onOpenChange={setControlDialogOpen}
        remito={selectedRemito}
        onSuccess={() => {
          mutate()
          onStatsChange()
        }}
      />
    </div>
  )
}
