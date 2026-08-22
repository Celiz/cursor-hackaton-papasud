'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { GenericDataTable } from '@/components/core-ui/GenericDataTable'
import { columnsTransferencias, Transferencia } from './columns'
import { TransferenciaDetailSheet } from '@/components/core-ui/TransferenciaDetailSheet'
import { CreateTransferenciaDialog } from '@/components/core-ui/CreateTransferenciaDialog'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeftRight, Clock, Truck, CheckCircle } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos')
  return Array.isArray(data) ? data : []
}

export default function InventarioTransferenciasClientPage() {
  const { data: transferencias, isLoading, mutate } = useSWR<Transferencia[]>(
    '/api/inventario/transferencias',
    fetcher
  )

  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Transferencia | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Estadísticas
  const stats = useMemo(() => {
    if (!transferencias || !Array.isArray(transferencias)) {
      return { total: 0, pendientes: 0, enTransito: 0, completadas: 0 }
    }

    return {
      total: transferencias.length,
      pendientes: transferencias.filter((t) => t.estado === 'pendiente' || t.estado === 'borrador').length,
      enTransito: transferencias.filter((t) => t.estado === 'en_transito').length,
      completadas: transferencias.filter((t) => t.estado === 'completada').length,
    }
  }, [transferencias])

  const handleRowClick = (transferencia: Transferencia) => {
    setSelected(transferencia)
    setDetailOpen(true)
  }

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleSaveCreate = async (data: any) => {
    try {
      const res = await fetch('/api/inventario/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear')
      }

      toast.success('Transferencia creada correctamente')
      mutate()
      setCreateOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear transferencia')
    }
  }

  const handleEdit = async (data: Partial<Transferencia>) => {
    if (!selected) return

    try {
      const res = await fetch('/api/inventario/transferencias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, ...data }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar')
      }

      toast.success('Transferencia actualizada correctamente')
      mutate()
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar transferencia')
    }
  }

  const handleConfirm = async (transferencia: Transferencia) => {
    try {
      const res = await fetch(`/api/inventario/transferencias/${transferencia.id}/confirmar`, {
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al confirmar')
      }

      toast.success('Transferencia confirmada correctamente')
      mutate()
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al confirmar transferencia')
    }
  }

  const handleDelete = async (transferencia: Transferencia) => {
    if (transferencia.estado !== 'borrador') {
      toast.error('Solo se pueden eliminar transferencias en estado borrador')
      return
    }

    if (!confirm(`¿Eliminar la transferencia "${transferencia.numero}"?`)) return

    try {
      const res = await fetch(`/api/inventario/transferencias?id=${transferencia.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }

      toast.success('Transferencia eliminada correctamente')
      mutate((current: any) => Array.isArray(current) ? current.filter((item: any) => item.id !== transferencia.id) : current, { revalidate: true })
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar transferencia')
    }
  }

  // Filtros facetados
  const facetedFilters = [
    {
      columnId: 'estado',
      title: 'Estado',
      options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'En Tránsito', value: 'en_transito' },
        { label: 'Completada', value: 'completada' },
        { label: 'Cancelada', value: 'cancelada' },
      ],
    },
  ]

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowLeftRight className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transferencias</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{stats.pendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Tránsito</p>
                <p className="text-2xl font-bold">{stats.enTransito}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold">{stats.completadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <GenericDataTable
        columns={columnsTransferencias}
        data={transferencias || []}
        isLoading={isLoading}
        pageTitle="Transferencias"
        pageDescription="Gestiona las transferencias de inventario entre depósitos."
        enableGlobalSearch
        facetedFilters={facetedFilters}
        onRowClick={handleRowClick}
        onNew={handleCreate}
        newLabel="Nueva Transferencia"
        onRefresh={() => mutate()}
      />

      {selected && (
        <TransferenciaDetailSheet
          transferencia={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEdit}
          onConfirm={() => handleConfirm(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <CreateTransferenciaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleSaveCreate}
      />
    </>
  )
}
