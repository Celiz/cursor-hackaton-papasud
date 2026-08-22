'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { GenericDataTable } from '@/components/core-ui/GenericDataTable'
import { columnsLotes, Lote } from './columns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Clock, XCircle, CheckCircle } from 'lucide-react'
import { LoteDetailSheet } from '@/components/core-ui/LoteDetailSheet'
import { CreateLoteDialog } from '@/components/core-ui/CreateLoteDialog'
import { toast } from 'sonner'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos')
  return Array.isArray(data) ? data : []
}

export default function InventarioLotesClientPage() {
  const { data: lotes = [], isLoading, mutate } = useSWR<Lote[]>('/api/inventario/lotes', fetcher)

  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  // Calcular estadísticas
  const totalLotes = lotes.length
  const lotesActivos = lotes.filter(l => l.estado === 'activo').length
  const lotesVencidos = lotes.filter(l => l.vencido).length
  const lotesPorVencer = lotes.filter(l => l.proximo_a_vencer && !l.vencido).length

  const stats = [
    {
      title: 'Total Lotes',
      value: totalLotes,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Lotes Activos',
      value: lotesActivos,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Por Vencer (90d)',
      value: lotesPorVencer,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Vencidos',
      value: lotesVencidos,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ]

  const handleRowClick = (lote: Lote) => {
    setSelectedLote(lote)
    setDetailOpen(true)
  }

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleSaveCreate = async (data: Partial<Lote>) => {
    try {
      const res = await fetch('/api/inventario/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear lote')
      }

      toast.success('Lote creado correctamente')
      mutate()
      setCreateOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear lote')
    }
  }

  const handleEdit = async (data: Partial<Lote>) => {
    if (!selectedLote) return

    try {
      const res = await fetch('/api/inventario/lotes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedLote.id, ...data }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar lote')
      }

      toast.success('Lote actualizado correctamente')
      mutate()
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar lote')
    }
  }

  const handleDelete = async (lote: Lote) => {
    if (!confirm(`¿Eliminar el lote "${lote.numero_lote}"?`)) return

    try {
      const res = await fetch(`/api/inventario/lotes?id=${lote.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar lote')
      }

      toast.success('Lote eliminado correctamente')
      mutate((current: any) => Array.isArray(current) ? current.filter((item: any) => item.id !== lote.id) : current, { revalidate: true })
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar lote')
    }
  }

  // Filtros facetados
  const facetedFilters = [
    {
      columnId: 'estado',
      title: 'Estado',
      options: [
        { label: 'Activo', value: 'activo' },
        { label: 'Cuarentena', value: 'cuarentena' },
        { label: 'Vencido', value: 'vencido' },
        { label: 'Recall', value: 'recall' },
        { label: 'Agotado', value: 'agotado' },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Lotes</h1>
          <p className="text-muted-foreground">
            Control de lotes, trazabilidad y vencimientos
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabla */}
      <GenericDataTable
        columns={columnsLotes}
        data={lotes}
        isLoading={isLoading}
        pageTitle="Lotes"
        pageDescription="Gestiona los lotes de productos con control de vencimiento"
        enableGlobalSearch
        facetedFilters={facetedFilters}
        onRowClick={handleRowClick}
        onNew={handleCreate}
        newLabel="Nuevo Lote"
        onRefresh={() => mutate()}
      />

      {/* Detail Sheet */}
      {selectedLote && (
        <LoteDetailSheet
          lote={selectedLote}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEdit}
          onDelete={() => handleDelete(selectedLote)}
        />
      )}

      {/* Create Dialog */}
      <CreateLoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleSaveCreate}
      />
    </div>
  )
}
