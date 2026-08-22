'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { GenericDataTable } from '@/components/core-ui/GenericDataTable'
import { columnsDepositos, Deposito } from './columns'
import { DepositoDetailSheet } from '@/components/core-ui/DepositoDetailSheet'
import { CreateDepositoDialog } from '@/components/core-ui/CreateDepositoDialog'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Warehouse, Package, Boxes, Thermometer } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos')
  return Array.isArray(data) ? data : []
}

export default function InventarioDepositosClientPage() {
  const { data: depositos, isLoading, mutate } = useSWR<Deposito[]>(
    '/api/inventario/depositos',
    fetcher
  )

  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Deposito | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Estadísticas
  const stats = useMemo(() => {
    if (!depositos || !Array.isArray(depositos)) {
      return { total: 0, activos: 0, stockTotal: 0, conTempControlada: 0 }
    }

    return {
      total: depositos.length,
      activos: depositos.filter((d) => d.activo).length,
      stockTotal: depositos.reduce((sum, d) => sum + (d.total_stock || 0), 0),
      conTempControlada: depositos.filter((d) => d.temperatura_controlada).length,
    }
  }, [depositos])

  const handleRowClick = (deposito: Deposito) => {
    setSelected(deposito)
    setDetailOpen(true)
  }

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleSaveCreate = async (data: Partial<Deposito>) => {
    try {
      const res = await fetch('/api/inventario/depositos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear')
      }

      toast.success('Depósito creado correctamente')
      mutate()
      setCreateOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear depósito')
    }
  }

  const handleEdit = async (data: Partial<Deposito>) => {
    if (!selected) return

    try {
      const res = await fetch('/api/inventario/depositos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, ...data }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar')
      }

      toast.success('Depósito actualizado correctamente')
      mutate()
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar depósito')
    }
  }

  const handleDelete = async (deposito: Deposito) => {
    if (!confirm(`¿Desactivar el depósito "${deposito.nombre}"?`)) return

    try {
      const res = await fetch(`/api/inventario/depositos?id=${deposito.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al desactivar')
      }

      toast.success('Depósito desactivado correctamente')
      mutate((current: any) => Array.isArray(current) ? current.filter((item: any) => item.id !== deposito.id) : current, { revalidate: true })
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al desactivar depósito')
    }
  }

  // Filtros facetados
  const facetedFilters = [
    {
      columnId: 'tipo',
      title: 'Tipo',
      options: [
        { label: 'Almacén', value: 'almacen' },
        { label: 'Tienda', value: 'tienda' },
        { label: 'Frigorífico', value: 'frigorifico' },
        { label: 'Tránsito', value: 'transito' },
        { label: 'Devolución', value: 'devolucion' },
        { label: 'Cuarentena', value: 'cuarentena' },
      ],
    },
    {
      columnId: 'activo',
      title: 'Estado',
      options: [
        { label: 'Activo', value: 'true' },
        { label: 'Inactivo', value: 'false' },
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
                <Warehouse className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Depósitos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Boxes className="h-6 w-6 text-green-600" />
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Total</p>
                <p className="text-2xl font-bold">{stats.stockTotal.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Thermometer className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temp. Controlada</p>
                <p className="text-2xl font-bold">{stats.conTempControlada}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <GenericDataTable
        columns={columnsDepositos}
        data={depositos || []}
        isLoading={isLoading}
        pageTitle="Depósitos"
        pageDescription="Gestiona los depósitos y almacenes de tu inventario."
        enableGlobalSearch
        facetedFilters={facetedFilters}
        onRowClick={handleRowClick}
        onNew={handleCreate}
        newLabel="Nuevo Depósito"
        onRefresh={() => mutate()}
      />

      {selected && (
        <DepositoDetailSheet
          deposito={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEdit}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <CreateDepositoDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleSaveCreate}
      />
    </>
  )
}
