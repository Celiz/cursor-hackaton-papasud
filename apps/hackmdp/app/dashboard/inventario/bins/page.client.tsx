'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { GenericDataTable } from '@/components/core-ui/GenericDataTable'
import { columnsBins, Bin } from './columns'
import { BinDetailSheet } from '@/components/core-ui/BinDetailSheet'
import { CreateBinDialog } from '@/components/core-ui/CreateBinDialog'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Package, Lock, AlertTriangle } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos')
  return Array.isArray(data) ? data : []
}

export default function InventarioBinsClientPage() {
  const { data: bins, isLoading, mutate } = useSWR<Bin[]>(
    '/api/inventario/bins',
    fetcher
  )

  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Bin | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Estadísticas
  const stats = useMemo(() => {
    if (!bins || !Array.isArray(bins)) {
      return { total: 0, activos: 0, bloqueados: 0, altaOcupacion: 0 }
    }

    return {
      total: bins.length,
      activos: bins.filter((b) => b.activo && !b.bloqueado).length,
      bloqueados: bins.filter((b) => b.bloqueado).length,
      altaOcupacion: bins.filter((b) => b.porcentaje_ocupacion >= 80).length,
    }
  }, [bins])

  const handleRowClick = (bin: Bin) => {
    setSelected(bin)
    setDetailOpen(true)
  }

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleSaveCreate = async (data: Partial<Bin>) => {
    try {
      const res = await fetch('/api/inventario/bins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear')
      }

      toast.success('Bin creado correctamente')
      mutate()
      setCreateOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear bin')
    }
  }

  const handleEdit = async (data: Partial<Bin>) => {
    if (!selected) return

    try {
      const res = await fetch('/api/inventario/bins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, ...data }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar')
      }

      toast.success('Bin actualizado correctamente')
      mutate()
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar bin')
    }
  }

  const handleDelete = async (bin: Bin) => {
    if (!confirm(`¿Eliminar/desactivar el bin "${bin.codigo}"?`)) return

    try {
      const res = await fetch(`/api/inventario/bins?id=${bin.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }

      const result = await res.json()
      if (result.desactivado) {
        toast.success('Bin desactivado correctamente')
      } else {
        toast.success('Bin eliminado correctamente')
      }
      mutate((current: any) => Array.isArray(current) ? current.filter((item: any) => item.id !== bin.id) : current, { revalidate: true })
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar bin')
    }
  }

  // Filtros facetados
  const facetedFilters = [
    {
      columnId: 'tipo',
      title: 'Tipo',
      options: [
        { label: 'Picking', value: 'picking' },
        { label: 'Reserva', value: 'reserve' },
        { label: 'Recepción', value: 'receiving' },
        { label: 'Envío', value: 'shipping' },
        { label: 'Cuarentena', value: 'quarantine' },
        { label: 'Devoluciones', value: 'returns' },
      ],
    },
    {
      columnId: 'activo',
      title: 'Estado',
      options: [
        { label: 'Activo', value: 'activo' },
        { label: 'Bloqueado', value: 'bloqueado' },
        { label: 'Inactivo', value: 'inactivo' },
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
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bins</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{stats.activos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Lock className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bloqueados</p>
                <p className="text-2xl font-bold">{stats.bloqueados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alta Ocupación</p>
                <p className="text-2xl font-bold">{stats.altaOcupacion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <GenericDataTable
        columns={columnsBins}
        data={bins || []}
        isLoading={isLoading}
        pageTitle="Ubicaciones (Bins)"
        pageDescription="Gestiona las ubicaciones de almacenamiento dentro de los depósitos."
        enableGlobalSearch
        facetedFilters={facetedFilters}
        onRowClick={handleRowClick}
        onNew={handleCreate}
        newLabel="Nuevo Bin"
        onRefresh={() => mutate()}
      />

      {selected && (
        <BinDetailSheet
          bin={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEdit}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <CreateBinDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleSaveCreate}
      />
    </>
  )
}
