'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { GenericDataTable } from '@/components/core-ui/GenericDataTable'
import { columnsSeriales, Serial } from './columns'
import { SerialDetailSheet } from '@/components/core-ui/SerialDetailSheet'
import { CreateSerialDialog } from '@/components/core-ui/CreateSerialDialog'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Hash, Package, Shield, AlertTriangle } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos')
  return Array.isArray(data) ? data : []
}

export default function InventarioSerialesClientPage() {
  const { data: seriales, isLoading, mutate } = useSWR<Serial[]>(
    '/api/inventario/seriales',
    fetcher
  )

  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Serial | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Estadísticas
  const stats = useMemo(() => {
    if (!seriales || !Array.isArray(seriales)) {
      return { total: 0, enStock: 0, vendidos: 0, garantiaVencida: 0 }
    }

    const hoy = new Date()

    return {
      total: seriales.length,
      enStock: seriales.filter((s) => s.estado === 'stock').length,
      vendidos: seriales.filter((s) => s.estado === 'vendido').length,
      garantiaVencida: seriales.filter((s) => {
        if (!s.garantia_hasta) return false
        return new Date(s.garantia_hasta) < hoy
      }).length,
    }
  }, [seriales])

  const handleRowClick = (serial: Serial) => {
    setSelected(serial)
    setDetailOpen(true)
  }

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleSaveCreate = async (data: Partial<Serial>) => {
    try {
      const res = await fetch('/api/inventario/seriales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear')
      }

      toast.success('Serial creado correctamente')
      mutate()
      setCreateOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear serial')
    }
  }

  const handleEdit = async (data: Partial<Serial>) => {
    if (!selected) return

    try {
      const res = await fetch('/api/inventario/seriales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, ...data }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar')
      }

      toast.success('Serial actualizado correctamente')
      mutate()
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar serial')
    }
  }

  // Filtros facetados
  const facetedFilters = [
    {
      columnId: 'estado',
      title: 'Estado',
      options: [
        { label: 'En Stock', value: 'stock' },
        { label: 'Vendido', value: 'vendido' },
        { label: 'Comodato', value: 'comodato' },
        { label: 'Servicio Técnico', value: 'servicio_tecnico' },
        { label: 'En Reparación', value: 'reparacion' },
        { label: 'Baja', value: 'baja' },
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
                <Hash className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Seriales</p>
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
                <p className="text-sm text-muted-foreground">En Stock</p>
                <p className="text-2xl font-bold">{stats.enStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendidos</p>
                <p className="text-2xl font-bold">{stats.vendidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Garantía Vencida</p>
                <p className="text-2xl font-bold">{stats.garantiaVencida}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <GenericDataTable
        columns={columnsSeriales}
        data={seriales || []}
        isLoading={isLoading}
        pageTitle="Números de Serie"
        pageDescription="Gestiona el tracking de números de serie de productos."
        enableGlobalSearch
        facetedFilters={facetedFilters}
        onRowClick={handleRowClick}
        onNew={handleCreate}
        newLabel="Nuevo Serial"
        onRefresh={() => mutate()}
      />

      {selected && (
        <SerialDetailSheet
          serial={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEdit}
        />
      )}

      <CreateSerialDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleSaveCreate}
      />
    </>
  )
}
