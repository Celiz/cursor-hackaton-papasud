'use client'

import { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Trash2, DollarSign, Loader2, Search, Pencil } from 'lucide-react'
import { BulkPriceUpdateDialog } from './BulkPriceUpdateDialog'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  rose: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
}

interface GroupDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: { id: string; nombre: string; color: string; count: number } | null
  onRefreshParent: () => void
}

export function GroupDetailSheet({ open, onOpenChange, group, onRefreshParent }: GroupDetailSheetProps) {
  const [bulkOpen, setBulkOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editingCell, setEditingCell] = useState<{ producto_id: string; field: 'precio_costo' | 'precio_venta' } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR(
    open && group ? `/api/precios/grupos/${group.id}/items` : null,
    fetcher,
    { dedupingInterval: 5000 }
  )

  useEffect(() => {
    if (!open) {
      setSearch('')
      setEditingCell(null)
    }
  }, [open])

  const items = Array.isArray(data) ? data : data?.items || []

  const itemsFiltrados = useMemo(() => {
    if (!search.trim()) return items
    const s = search.trim().toLowerCase()
    return items.filter((i: any) =>
      (i.codigo || '').toLowerCase().includes(s) ||
      (i.nombre || '').toLowerCase().includes(s)
    )
  }, [items, search])

  const handleRemove = async (productoId: string) => {
    if (!group) return
    setRemovingId(productoId)
    try {
      const res = await fetch(`/api/precios/grupos/${group.id}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: productoId }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al quitar producto')
      }
      toast.success('Producto quitado del grupo')
      mutate()
      onRefreshParent()
    } catch (err: any) {
      toast.error(err.message || 'Error al quitar producto')
    } finally {
      setRemovingId(null)
    }
  }

  const startEdit = (productoId: string, field: 'precio_costo' | 'precio_venta', currentValue: number) => {
    setEditingCell({ producto_id: productoId, field })
    setEditValue(currentValue?.toString() || '0')
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editingCell) return
    const numVal = parseFloat(editValue)
    if (isNaN(numVal) || numVal < 0) {
      toast.error('Valor invalido')
      cancelEdit()
      return
    }

    const productoId = editingCell.producto_id
    const field = editingCell.field
    setSavingId(productoId)
    try {
      const res = await fetch('/api/precios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          [field]: numVal,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error al guardar')
      toast.success('Precio actualizado')
      mutate()
      onRefreshParent()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSavingId(null)
      cancelEdit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const fmt = (n: number) => `$${(Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  const allIds = items.map((i: any) => i.id || i.producto_id)
  const badgeClass = group ? (COLOR_MAP[group.color] || COLOR_MAP.blue) : COLOR_MAP.blue

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          title={group?.nombre || 'Grupo'}
          className="h-[85vh] sm:h-[80vh] max-h-[900px] flex flex-col"
        >
          <SheetHeader className="border-b pb-4 px-6 pt-5 pr-14 flex-shrink-0">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Badge className={`${badgeClass} text-sm px-2.5 py-0.5`}>{group?.nombre}</Badge>
                <span className="text-sm text-muted-foreground">
                  {itemsFiltrados.length === items.length
                    ? `${items.length} producto(s)`
                    : `${itemsFiltrados.length} de ${items.length} producto(s)`}
                </span>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por codigo o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hace clic en costo o venta para ajustar un producto puntual sin tocar el resto del grupo. Usa el boton de abajo para aplicar un cambio masivo.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">
                No hay productos en este grupo.
              </div>
            ) : itemsFiltrados.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">
                Sin coincidencias para &quot;{search}&quot;.
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-2.5 font-medium w-32">Codigo</th>
                      <th className="text-left p-2.5 font-medium">Nombre</th>
                      <th className="text-right p-2.5 font-medium w-36">Costo</th>
                      <th className="text-right p-2.5 font-medium w-32">Margen</th>
                      <th className="text-right p-2.5 font-medium w-36">Venta</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsFiltrados.map((item: any) => {
                      const productoId = item.id || item.producto_id
                      const precioCosto = parseFloat(item.precio_costo) || 0
                      const precioVenta = parseFloat(item.precio_venta) || 0
                      const margen = item.margen_porcentaje != null
                        ? parseFloat(item.margen_porcentaje)
                        : (precioCosto > 0 ? ((precioVenta - precioCosto) / precioCosto) * 100 : 0)
                      const isSaving = savingId === productoId
                      const editingCosto = editingCell?.producto_id === productoId && editingCell.field === 'precio_costo'
                      const editingVenta = editingCell?.producto_id === productoId && editingCell.field === 'precio_venta'

                      return (
                        <tr
                          key={productoId}
                          className="border-t border-gray-100 dark:border-gray-800 hover:bg-muted/20 transition-colors"
                        >
                          <td className="p-2 text-muted-foreground font-mono text-xs">{item.codigo}</td>
                          <td className="p-2 font-medium max-w-[480px] truncate" title={item.nombre}>{item.nombre}</td>
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
                                disabled={isSaving}
                                className="h-7 w-32 text-right text-sm ml-auto"
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(productoId, 'precio_costo', precioCosto)}
                                className="text-right hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors cursor-text inline-flex items-center gap-1.5 text-muted-foreground"
                                title="Clic para editar costo"
                              >
                                {fmt(precioCosto)}
                                <Pencil className="h-3 w-3 opacity-0 hover:opacity-100" />
                              </button>
                            )}
                          </td>
                          <td className="p-2 text-right text-muted-foreground text-xs">
                            {margen.toFixed(1)}%
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
                                disabled={isSaving}
                                className="h-7 w-32 text-right text-sm ml-auto"
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(productoId, 'precio_venta', precioVenta)}
                                className="text-right hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors cursor-text inline-flex items-center gap-1.5 font-medium"
                                title="Clic para editar venta"
                              >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3 opacity-0 hover:opacity-100" />}
                                {fmt(precioVenta)}
                              </button>
                            )}
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => handleRemove(productoId)}
                              disabled={removingId === productoId}
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 disabled:opacity-50"
                              title="Quitar del grupo"
                            >
                              {removingId === productoId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t px-6 py-3 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Aplicar cambio masivo a los <strong>{items.length}</strong> productos del grupo (excepciones manuales pueden hacerse arriba haciendo clic en cada precio).
              </p>
              <Button onClick={() => setBulkOpen(true)} size="sm" className="shrink-0">
                <DollarSign className="h-4 w-4" />
                Cambiar Precios del Grupo
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <BulkPriceUpdateDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedIds={allIds}
        onSuccess={() => {
          mutate()
          onRefreshParent()
        }}
      />
    </>
  )
}
