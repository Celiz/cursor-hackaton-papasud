'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { GenericDataTable } from '@/components/core-ui/GenericDataTable'
import { columnsConteos, Conteo } from './columns'
import { ConteoDetailSheet } from '@/components/core-ui/ConteoDetailSheet'
import { CreateConteoDialog } from '@/components/core-ui/CreateConteoDialog'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList, Clock, Play, CheckCircle } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos')
  return Array.isArray(data) ? data : []
}

export default function InventarioConteosClientPage() {
  const { data: conteos, isLoading, mutate } = useSWR<Conteo[]>(
    '/api/inventario/conteos',
    fetcher
  )

  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Conteo | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Estadísticas
  const stats = useMemo(() => {
    if (!conteos || !Array.isArray(conteos)) {
      return { total: 0, planificados: 0, enCurso: 0, completados: 0 }
    }

    return {
      total: conteos.length,
      planificados: conteos.filter((c) => c.estado === 'planificado').length,
      enCurso: conteos.filter((c) => c.estado === 'en_curso').length,
      completados: conteos.filter((c) => c.estado === 'completado').length,
    }
  }, [conteos])

  const handleRowClick = (conteo: Conteo) => {
    setSelected(conteo)
    setDetailOpen(true)
  }

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleSaveCreate = async (data: any) => {
    try {
      const res = await fetch('/api/inventario/conteos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear')
      }

      toast.success('Conteo creado correctamente')
      mutate()
      setCreateOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear conteo')
    }
  }

  const handleEdit = async (data: Partial<Conteo>) => {
    if (!selected) return

    try {
      const res = await fetch('/api/inventario/conteos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, ...data }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar')
      }

      toast.success('Conteo actualizado correctamente')
      mutate()
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar conteo')
    }
  }

  const handleStart = async (conteo: Conteo) => {
    try {
      const res = await fetch('/api/inventario/conteos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conteo.id,
          estado: 'en_curso',
          fecha_inicio: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al iniciar')
      }

      toast.success('Conteo iniciado')
      mutate()
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar conteo')
    }
  }

  const handleDelete = async (conteo: Conteo) => {
    const action = conteo.estado === 'planificado' ? 'eliminar' : 'cancelar'
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} el conteo "${conteo.nombre}"?`)) return

    try {
      const res = await fetch(`/api/inventario/conteos?id=${conteo.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Error al ${action}`)
      }

      const result = await res.json()
      if (result.eliminado) {
        toast.success('Conteo eliminado correctamente')
      } else {
        toast.success('Conteo cancelado correctamente')
      }
      mutate((current: any) => Array.isArray(current) ? current.filter((item: any) => item.id !== conteo.id) : current, { revalidate: true })
      setDetailOpen(false)
    } catch (error: any) {
      toast.error(error.message || `Error al ${action} conteo`)
    }
  }

  // Filtros facetados
  const facetedFilters = [
    {
      columnId: 'estado',
      title: 'Estado',
      options: [
        { label: 'Planificado', value: 'planificado' },
        { label: 'En Curso', value: 'en_curso' },
        { label: 'Completado', value: 'completado' },
        { label: 'Cancelado', value: 'cancelado' },
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
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Conteos</p>
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
                <p className="text-sm text-muted-foreground">Planificados</p>
                <p className="text-2xl font-bold">{stats.planificados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Play className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Curso</p>
                <p className="text-2xl font-bold">{stats.enCurso}</p>
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
                <p className="text-sm text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold">{stats.completados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <GenericDataTable
        columns={columnsConteos}
        data={conteos || []}
        isLoading={isLoading}
        pageTitle="Conteos Cíclicos"
        pageDescription="Gestiona los conteos de inventario y auditorías de stock."
        enableGlobalSearch
        facetedFilters={facetedFilters}
        onRowClick={handleRowClick}
        onNew={handleCreate}
        newLabel="Nuevo Conteo"
        onRefresh={() => mutate()}
      />

      {selected && (
        <ConteoDetailSheet
          conteo={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEdit}
          onStart={() => handleStart(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      <CreateConteoDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleSaveCreate}
      />
    </>
  )
}
