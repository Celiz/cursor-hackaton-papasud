'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  Tag,
  Layers,
  List,
  History,
  Package,
  Loader2,
  ChevronDown,
  LayoutGrid,
  Rows3,
} from 'lucide-react'
import { BulkPriceUpdateDialog } from '@/components/precios/BulkPriceUpdateDialog'
import { GroupFormDialog } from '@/components/precios/GroupFormDialog'
import { GroupDetailSheet } from '@/components/precios/GroupDetailSheet'
import { useRouter } from 'next/navigation'
import { useUserPermissions } from '@/lib/hooks/use-user-permissions'
import { ListaPreciosDetailSheet } from '@/components/precios/ListaPreciosDetailSheet'
import { CorridasTab } from '@/components/precios/CorridasTab'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const COLOR_DOT: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
}

const COLOR_BADGE: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  rose: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
}

const fmt = (n: number) => `$${(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
const fmtPct = (n: number | string) => `${(parseFloat(String(n)) || 0).toFixed(1)}%`

// ============================================================================
// Tab 1: Productos
// ============================================================================
function ProductosTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [marcaFilter, setMarcaFilter] = useState('')
  const [grupoFilter, setGrupoFilter] = useState('')
  const [sort, setSort] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'precio_costo' | 'precio_venta' } | null>(null)
  const [editValue, setEditValue] = useState('')

  // Bulk actions
  const [bulkOpen, setBulkOpen] = useState(false)
  const [groupFormOpen, setGroupFormOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, categoriaFilter, marcaFilter, grupoFilter])

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', '50')
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (categoriaFilter && categoriaFilter !== 'all') params.set('categoria_nombre', categoriaFilter)
    if (marcaFilter && marcaFilter !== 'all') params.set('marca_id', marcaFilter)
    if (grupoFilter && grupoFilter !== 'all') params.set('grupo_id', grupoFilter)
    if (sort) params.set('sort', sort)
    return `/api/precios?${params.toString()}`
  }, [page, debouncedSearch, categoriaFilter, marcaFilter, grupoFilter, sort])

  const { data, isLoading, mutate } = useSWR(buildUrl(), fetcher, { keepPreviousData: true, dedupingInterval: 2000 })
  const { data: grupos } = useSWR('/api/precios/grupos', fetcher, { dedupingInterval: 10000 })
  const { data: categoriasData } = useSWR<string[]>('/api/categorias', fetcher, { dedupingInterval: 60000 })
  const { data: marcasData } = useSWR<{ id: string; nombre: string }[]>('/api/marcas', fetcher, { dedupingInterval: 60000 })
  const categoriasList = Array.isArray(categoriasData) ? categoriasData.filter((s): s is string => typeof s === 'string' && s.length > 0) : []
  const marcasList = Array.isArray(marcasData) ? marcasData : []

  const items = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 50) || 1

  // Stats
  const stats = useMemo(() => {
    if (!items.length) return { count: total, avgMargin: 0, totalStock: 0 }
    const margins = items.filter((i: any) => i.margen_porcentaje != null).map((i: any) => parseFloat(i.margen_porcentaje))
    const avgMargin = margins.length ? margins.reduce((s: number, m: number) => s + m, 0) / margins.length : 0
    const totalStock = items.reduce((s: number, i: any) => s + ((parseFloat(i.precio_venta) || 0) * (parseInt(i.stock_actual) || 0)), 0)
    return { count: total, avgMargin, totalStock }
  }, [items, total])

  const allChecked = items.length > 0 && items.every((i: any) => selectedIds.has(i.id))
  const someChecked = items.some((i: any) => selectedIds.has(i.id))

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i: any) => i.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSort = (col: string) => {
    setSort(prev => {
      if (prev === `${col}:asc`) return `${col}:desc`
      return `${col}:asc`
    })
  }

  const startEdit = (id: string, field: 'precio_costo' | 'precio_venta', currentValue: number) => {
    setEditingCell({ id, field })
    setEditValue(currentValue?.toString() || '0')
  }

  const saveEdit = async () => {
    if (!editingCell) return
    const numVal = parseFloat(editValue)
    if (isNaN(numVal) || numVal < 0) {
      toast.error('Valor invalido')
      setEditingCell(null)
      return
    }

    try {
      const res = await fetch('/api/precios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: editingCell.id,
          [editingCell.field]: numVal,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error al guardar')
      toast.success('Precio actualizado')
      mutate()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    }
    setEditingCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') setEditingCell(null)
  }

  const selectedArr = Array.from(selectedIds)
  const gruposList = Array.isArray(grupos) ? grupos : grupos?.items || []

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <th
      className="p-2 font-medium cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoriaFilter || 'all'} onValueChange={(v) => setCategoriaFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todas las categorias</SelectItem>
            {categoriasList.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={marcaFilter || 'all'} onValueChange={(v) => setMarcaFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todas las marcas</SelectItem>
            {marcasList.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={grupoFilter} onValueChange={setGrupoFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {gruposList.map((g: any) => (
              <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-muted-foreground">Total Productos</div>
          <div className="text-xl font-bold">{stats.count.toLocaleString('es-AR')}</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-muted-foreground">Promedio Margen</div>
          <div className="text-xl font-bold">{fmtPct(stats.avgMargin)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-muted-foreground">Valor Stock (venta)</div>
          <div className="text-xl font-bold">{fmt(stats.totalStock)}</div>
        </div>
      </div>

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} seleccionados</span>
          <Button size="sm" onClick={() => setBulkOpen(true)}>
            <DollarSign className="h-4 w-4" />
            Cambiar Precios
          </Button>
          <Button size="sm" variant="outline" onClick={() => setGroupFormOpen(true)}>
            <Tag className="h-4 w-4" />
            Crear Grupo
          </Button>
          {gruposList.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                  Agregar a Grupo
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {gruposList.map((g: any) => (
                  <DropdownMenuItem
                    key={g.id}
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/precios/grupos/${g.id}/items`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ producto_ids: selectedArr }),
                        })
                        const d = await res.json()
                        if (!res.ok) throw new Error(d.error || 'Error')
                        toast.success(`Agregados a "${g.nombre}"`)
                        mutate()
                        setSelectedIds(new Set())
                      } catch (err: any) {
                        toast.error(err.message)
                      }
                    }}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${COLOR_DOT[g.color] || 'bg-gray-400'}`} />
                    {g.nombre}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="ml-auto text-muted-foreground">
            Limpiar seleccion
          </Button>
        </div>
      )}

      {/* Data table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No se encontraron productos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 w-10">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={toggleAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <SortHeader col="codigo" label="Codigo" />
                  <SortHeader col="nombre" label="Nombre" />
                  <th className="p-2 font-medium text-left">Categoria</th>
                  <th className="p-2 font-medium text-right">Costo</th>
                  <th className="p-2 font-medium text-right">Margen %</th>
                  <th className="p-2 font-medium text-right">Precio Venta</th>
                  <th className="p-2 font-medium text-left">Grupos</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const isSelected = selectedIds.has(item.id)
                  const editingCosto = editingCell?.id === item.id && editingCell?.field === 'precio_costo'
                  const editingVenta = editingCell?.id === item.id && editingCell?.field === 'precio_venta'
                  const precioCosto = parseFloat(item.precio_costo) || 0
                  const precioVenta = parseFloat(item.precio_venta) || 0
                  const margen = item.margen_porcentaje != null ? parseFloat(item.margen_porcentaje) : (precioCosto > 0 ? ((precioVenta - precioCosto) / precioCosto) * 100 : 0)

                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
                        isSelected ? 'bg-purple-500/5' : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="p-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(item.id)}
                          aria-label={`Seleccionar ${item.nombre}`}
                        />
                      </td>
                      <td className="p-2 font-mono text-xs text-muted-foreground">{item.codigo}</td>
                      <td className="p-2 font-medium max-w-[250px] truncate">{item.nombre}</td>
                      <td className="p-2 text-muted-foreground text-xs">{item.categoria_nombre || '-'}</td>
                      <td className="p-2 text-right">
                        {editingCosto ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="h-7 w-28 text-right text-sm ml-auto"
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(item.id, 'precio_costo', precioCosto)}
                            className="text-right hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors cursor-text"
                            title="Clic para editar"
                          >
                            {fmt(precioCosto)}
                          </button>
                        )}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {fmtPct(margen)}
                      </td>
                      <td className="p-2 text-right">
                        {editingVenta ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="h-7 w-28 text-right text-sm ml-auto"
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(item.id, 'precio_venta', precioVenta)}
                            className="text-right hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors font-medium cursor-text"
                            title="Clic para editar"
                          >
                            {fmt(precioVenta)}
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          {item.grupos && item.grupos.map((g: any) => (
                            <Badge
                              key={g.id}
                              className={`text-[10px] px-1.5 py-0 ${COLOR_BADGE[g.color] || 'bg-gray-500/10 text-gray-700 border-gray-500/20'}`}
                            >
                              {g.nombre}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages} ({total.toLocaleString('es-AR')} productos)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <BulkPriceUpdateDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedIds={selectedArr}
        onSuccess={() => {
          mutate()
          setSelectedIds(new Set())
        }}
      />

      <GroupFormDialog
        open={groupFormOpen}
        onOpenChange={setGroupFormOpen}
        productoIds={selectedArr}
        onSuccess={() => {
          mutate()
          setSelectedIds(new Set())
        }}
      />
    </div>
  )
}

// ============================================================================
// Tab 2: Grupos
// ============================================================================
function GruposTab() {
  const { data, isLoading, mutate } = useSWR('/api/precios/grupos', fetcher, { dedupingInterval: 5000 })
  const [formOpen, setFormOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<any>(null)
  const [detailGroup, setDetailGroup] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [grupoSearch, setGrupoSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid'
    return (localStorage.getItem('precios.grupos.view') as 'grid' | 'list') || 'grid'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('precios.grupos.view', view)
  }, [view])

  const gruposAll = Array.isArray(data) ? data : data?.items || []
  const gruposList = grupoSearch.trim()
    ? gruposAll.filter((g: any) => g.nombre?.toLowerCase().includes(grupoSearch.toLowerCase()))
    : gruposAll

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este grupo? Los productos no seran afectados.')) return
    try {
      const res = await fetch(`/api/precios/grupos?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al eliminar')
      }
      toast.success('Grupo eliminado')
      mutate()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar grupo')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar grupo o proveedor..."
            value={grupoSearch}
            onChange={(e) => setGrupoSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{gruposList.length} de {gruposAll.length} grupos</span>
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
          <Button
            size="sm"
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            onClick={() => setView('grid')}
            className="h-7 px-2"
            aria-label="Vista cuadricula"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={view === 'list' ? 'secondary' : 'ghost'}
            onClick={() => setView('list')}
            className="h-7 px-2"
            aria-label="Vista lista"
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => { setEditGroup(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : gruposList.length === 0 ? (
        <div className="text-center py-20">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No hay grupos</p>
          <p className="text-sm text-muted-foreground mb-4">
            Crea tu primer grupo para organizar productos.
          </p>
          <Button size="sm" onClick={() => { setEditGroup(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" />
            Nuevo Grupo
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gruposList.map((g: any) => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${COLOR_DOT[g.color] || 'bg-gray-400'}`} />
                    <CardTitle>{g.nombre}</CardTitle>
                  </div>
                  <Badge variant="secondary">{g.count || g.producto_count || 0} productos</Badge>
                </div>
                {g.descripcion && <CardDescription>{g.descripcion}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setDetailGroup(g); setDetailOpen(true) }}
                  >
                    <Eye className="h-4 w-4" />
                    Ver productos
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditGroup(g); setFormOpen(true) }}>
                        <Edit className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(g.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 font-medium text-left">Grupo</th>
                <th className="p-2 font-medium text-left">Descripcion</th>
                <th className="p-2 font-medium text-right">Productos</th>
                <th className="p-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {gruposList.map((g: any) => (
                <tr
                  key={g.id}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => { setDetailGroup(g); setDetailOpen(true) }}
                >
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${COLOR_DOT[g.color] || 'bg-gray-400'}`} />
                      <span className="font-medium">{g.nombre}</span>
                    </div>
                  </td>
                  <td className="p-2 text-muted-foreground text-xs max-w-[400px] truncate">
                    {g.descripcion || '—'}
                  </td>
                  <td className="p-2 text-right">
                    <Badge variant="secondary">{g.count || g.producto_count || 0}</Badge>
                  </td>
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => { setDetailGroup(g); setDetailOpen(true) }}
                        title="Ver productos"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => { setEditGroup(g); setFormOpen(true) }}
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(g.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editGroup}
        onSuccess={() => mutate()}
      />

      <GroupDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        group={detailGroup}
        onRefreshParent={() => mutate()}
      />
    </div>
  )
}

// ============================================================================
// Tab 3: Listas de Precios
// ============================================================================
function ListasPreciosTab() {
  const { data, isLoading, mutate } = useSWR('/api/listas-precios', fetcher, { dedupingInterval: 5000 })
  const [detailLista, setDetailLista] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const listas = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Listas con margen global y excepciones por producto.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : listas.length === 0 ? (
        <div className="text-center py-20">
          <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No hay listas de precios</p>
          <p className="text-sm text-muted-foreground">
            Las listas se crean desde la configuracion del sistema.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listas.map((l: any) => (
            <Card key={l.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setDetailLista(l); setDetailOpen(true) }}>
              <CardHeader>
                <CardTitle>{l.nombre}</CardTitle>
                <CardDescription>
                  {l.codigo && <span className="font-mono">{l.codigo}</span>}
                  {l.descripcion && ` - ${l.descripcion}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-2xl font-bold">{fmtPct(l.margen_porcentaje)}</span>
                    <span className="text-sm text-muted-foreground ml-1">margen</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {l.clientes_count != null && (
                      <Badge variant="outline" className="gap-1">
                        <Package className="h-3 w-3" />
                        {l.clientes_count} clientes
                      </Badge>
                    )}
                    {l.override_count != null && l.override_count > 0 && (
                      <Badge variant="secondary">{l.override_count} excepciones</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListaPreciosDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        lista={detailLista}
        onRefreshParent={() => mutate()}
      />
    </div>
  )
}

// ============================================================================
// Tab 4: Historial
// ============================================================================
function HistorialTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, tipoFilter, fechaDesde, fechaHasta])

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', '50')
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (tipoFilter && tipoFilter !== 'all') params.set('tipo', tipoFilter)
    if (fechaDesde) params.set('fecha_desde', fechaDesde)
    if (fechaHasta) params.set('fecha_hasta', fechaHasta)
    return `/api/precios/historial?${params.toString()}`
  }, [page, debouncedSearch, tipoFilter, fechaDesde, fechaHasta])

  const { data, isLoading } = useSWR(buildUrl(), fetcher, { keepPreviousData: true, dedupingInterval: 2000 })

  const items = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 50) || 1

  const fmtDate = (d: string) => {
    try {
      const date = new Date(d)
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return d
    }
  }

  const campoColor = (tipoPrecio: string) => {
    if (tipoPrecio?.includes('costo')) return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
    if (tipoPrecio?.includes('venta')) return 'bg-green-500/10 text-green-700 border-green-500/20'
    return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
  }

  const tipoColor = (tipo: string) => {
    switch (tipo) {
      case 'manual': return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      case 'bulk': return 'bg-purple-500/10 text-purple-700 border-purple-500/20'
      case 'lista_proveedor': return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="bulk">Masivo</SelectItem>
            <SelectItem value="lista_proveedor">Lista Proveedor</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="w-[150px]"
          placeholder="Desde"
        />
        <Input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="w-[150px]"
          placeholder="Hasta"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No hay registros de historial.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 font-medium text-left">Fecha</th>
                  <th className="p-2 font-medium text-left">Producto</th>
                  <th className="p-2 font-medium text-left">Precio</th>
                  <th className="p-2 font-medium text-right">Anterior</th>
                  <th className="p-2 font-medium text-center"></th>
                  <th className="p-2 font-medium text-right">Nuevo</th>
                  <th className="p-2 font-medium text-left">Tipo</th>
                  <th className="p-2 font-medium text-left">Usuario</th>
                  <th className="p-2 font-medium text-left">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(item.created_at || item.fecha)}
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{item.producto_nombre || item.nombre}</div>
                      <div className="text-xs text-muted-foreground">{item.producto_codigo || item.codigo}</div>
                    </td>
                    <td className="p-2">
                      <Badge className={campoColor(item.tipo_precio)}>
                        {item.tipo_precio === 'precio_costo' ? 'Costo' : item.tipo_precio === 'precio_venta' ? 'Venta' : item.tipo_precio || '-'}
                      </Badge>
                    </td>
                    <td className="p-2 text-right font-mono text-muted-foreground">
                      {fmt(parseFloat(item.precio_anterior) || 0)}
                    </td>
                    <td className="p-2 text-center text-muted-foreground">
                      →
                    </td>
                    <td className="p-2 text-right font-mono font-medium">
                      {fmt(parseFloat(item.precio_nuevo) || 0)}
                    </td>
                    <td className="p-2">
                      <Badge className={tipoColor(item.tipo)}>
                        {item.tipo === 'manual' ? 'Manual' : item.tipo === 'bulk' ? 'Masivo' : item.tipo === 'lista_proveedor' ? 'Lista Prov.' : item.tipo || '-'}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs truncate max-w-[150px]">
                      {item.usuario_nombre || '-'}
                    </td>
                    <td className="p-2 text-muted-foreground text-xs max-w-[200px] truncate" title={item.motivo_cambio || ''}>
                      {item.motivo_cambio || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages} ({total.toLocaleString('es-AR')} registros)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Hub
// ============================================================================
export default function PreciosHubClient() {
  // Guard de ruta: si el módulo 'precios' está oculto para el usuario, no entra
  // ni por URL directa (el sidebar ya lo esconde).
  const { canAccess, loading, isAdmin } = useUserPermissions()
  const router = useRouter()
  useEffect(() => {
    if (!loading && !canAccess('precios')) {
      router.replace('/dashboard')
    }
  }, [loading, canAccess, router])

  if (!loading && !canAccess('precios')) {
    return null
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Precios</h1>
            <p className="text-sm text-muted-foreground">
              Gestion de precios, margenes y listas
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="grupos">
            <Layers className="h-4 w-4" />
            Grupos
          </TabsTrigger>
          <TabsTrigger value="listas">
            <List className="h-4 w-4" />
            Listas de Precios
          </TabsTrigger>
          <TabsTrigger value="historial">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="corridas">
            <History className="h-4 w-4" />
            Corridas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <ProductosTab />
        </TabsContent>

        <TabsContent value="grupos">
          <GruposTab />
        </TabsContent>

        <TabsContent value="listas">
          <ListasPreciosTab />
        </TabsContent>

        <TabsContent value="historial">
          <HistorialTab />
        </TabsContent>

        <TabsContent value="corridas">
          <CorridasTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
