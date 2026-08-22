'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  Loader2,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react'
import { clasificarPrecioLista, type ClasificacionPrecioLista } from '@/lib/precios/precio-lista'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const PAGE_SIZE = 20
const fmt = (n: number) =>
  `$${(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

interface ProductoRow {
  id: string
  codigo: string
  nombre: string
  precio_costo: number | string | null
  precio_calculado: number | string | null
  lista_precio_fijo: number | string | null
  lista_margen_override: number | string | null
}

interface ListaProductosTabProps {
  lista: { id: string; nombre: string; margen_porcentaje: number }
  onRefreshParent: () => void
}

export function ListaProductosTab({ lista, onRefreshParent }: ListaProductosTabProps) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const margenLista = parseFloat(String(lista.margen_porcentaje)) || 0

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, mutate } = useSWR(
    `/api/precios?lista_id=${lista.id}&page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(debounced)}`,
    fetcher,
    { dedupingInterval: 2000 },
  )

  const items: ProductoRow[] = data?.items ?? []
  const total: number = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleRefresh = () => {
    mutate()
    onRefreshParent()
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar producto por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          No se encontraron productos.
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium">Producto</th>
                <th className="text-right p-2 font-medium">Costo</th>
                <th className="text-center p-2 font-medium">Margen</th>
                <th className="text-right p-2 font-medium">Precio</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const clasif = clasificarPrecioLista(p, margenLista)
                const costo = parseFloat(String(p.precio_costo)) || 0
                const precio = parseFloat(String(p.precio_calculado)) || 0
                return (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-2">
                      <div className="font-medium flex items-center gap-1">
                        {p.nombre}
                        {clasif.esExcepcion && (
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.codigo}</div>
                    </td>
                    <td className="p-2 text-right font-mono text-muted-foreground">{fmt(costo)}</td>
                    <td className="p-2 text-center">
                      <Badge variant={clasif.tipo === 'fijo' ? 'info' : clasif.esExcepcion ? 'success' : 'outline'}>
                        {clasif.tipo === 'fijo' ? 'FIJO' : `+${clasif.margenEfectivo}%`}
                      </Badge>
                    </td>
                    <td className="p-2 text-right font-medium">{fmt(precio)}</td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1">
                        <ExcepcionPopover lista={lista} producto={p} clasif={clasif} onSaved={handleRefresh} />
                        {clasif.esExcepcion && (
                          <QuitarExcepcionButton lista={lista} productoId={p.id} onDeleted={handleRefresh} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} producto{total === 1 ? '' : 's'} · página {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)} title="Página anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((x) => x + 1)} title="Página siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExcepcionPopover({
  lista,
  producto,
  clasif,
  onSaved,
}: {
  lista: { id: string }
  producto: { id: string; lista_precio_fijo: number | string | null; lista_margen_override: number | string | null }
  clasif: ClasificacionPrecioLista
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<'fijo' | 'margen'>(clasif.tipo === 'margen' ? 'margen' : 'fijo')
  const [valor, setValor] = useState(
    clasif.tipo === 'fijo'
      ? String(producto.lista_precio_fijo ?? '')
      : clasif.tipo === 'margen'
        ? String(producto.lista_margen_override ?? '')
        : '',
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTipo(clasif.tipo === 'margen' ? 'margen' : 'fijo')
    setValor(
      clasif.tipo === 'fijo'
        ? String(producto.lista_precio_fijo ?? '')
        : clasif.tipo === 'margen'
          ? String(producto.lista_margen_override ?? '')
          : '',
    )
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    const num = parseFloat(valor)
    if (isNaN(num) || num <= 0) {
      toast.error('Ingresá un valor válido')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/precios/listas/${lista.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: producto.id,
          precio_fijo: tipo === 'fijo' ? num : null,
          margen_override: tipo === 'margen' ? num : null,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error al guardar excepción')
      toast.success('Excepción guardada')
      setOpen(false)
      onSaved()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar excepción')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-1 rounded hover:bg-muted text-muted-foreground"
          title={clasif.esExcepcion ? 'Editar excepción' : 'Fijar precio especial'}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <p className="text-sm font-medium">Precio especial para esta lista</p>
        <Select value={tipo} onValueChange={(v) => setTipo(v as 'fijo' | 'margen')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fijo">Precio fijo</SelectItem>
            <SelectItem value="margen">Margen %</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder={tipo === 'fijo' ? 'Precio $' : 'Margen %'}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function QuitarExcepcionButton({
  lista,
  productoId,
  onDeleted,
}: {
  lista: { id: string }
  productoId: string
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/precios/listas/${lista.id}/items?producto_id=${productoId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al quitar excepción')
      }
      toast.success('Excepción quitada')
      onDeleted()
    } catch (err: any) {
      toast.error(err.message || 'Error al quitar excepción')
    } finally {
      setDeleting(false)
    }
  }
  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 disabled:opacity-50"
      title="Quitar excepción (volver al margen de la lista)"
    >
      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  )
}
