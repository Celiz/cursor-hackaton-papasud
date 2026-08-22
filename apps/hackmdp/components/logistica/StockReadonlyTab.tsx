'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function StockReadonlyTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [depositoFilter, setDepositoFilter] = useState('todos')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, depositoFilter])

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', '50')
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (depositoFilter !== 'todos') params.set('deposito_id', depositoFilter)
    return `/api/productos?${params.toString()}`
  }, [page, debouncedSearch, depositoFilter])

  const { data, isLoading } = useSWR(buildUrl(), fetcher, { keepPreviousData: true })
  const { data: depositos } = useSWR('/api/inventario/depositos', fetcher)

  const productos = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, totalCount: 0 }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={depositoFilter} onValueChange={setDepositoFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Deposito" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los depositos</SelectItem>
            {Array.isArray(depositos) &&
              depositos.map((d: { id: string; nombre: string }) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.nombre}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-medium">Codigo</th>
              <th className="text-left px-3 py-2 font-medium">Nombre</th>
              <th className="text-right px-3 py-2 font-medium">Stock</th>
              <th className="text-left px-3 py-2 font-medium">Unidad</th>
              <th className="text-left px-3 py-2 font-medium">Lote</th>
              <th className="text-left px-3 py-2 font-medium">Vencimiento</th>
              <th className="text-left px-3 py-2 font-medium">Deposito</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && productos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Cargando...
                </td>
              </tr>
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              productos.map((p: Record<string, unknown>) => (
                <tr key={p.id as string} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{(p.codigo as string) || '—'}</td>
                  <td className="px-3 py-2">{(p.nombre as string) || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {p.stock_actual != null ? Math.floor(p.stock_actual as number) : '—'}
                  </td>
                  <td className="px-3 py-2">{(p.unidad_medida as string) || '—'}</td>
                  <td className="px-3 py-2">{(p.lote as string) || '—'}</td>
                  <td className="px-3 py-2">{formatDate(p.fecha_vencimiento as string)}</td>
                  <td className="px-3 py-2">{(p.deposito_nombre as string) || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Pagina {pagination.page} de {pagination.totalPages} ({pagination.totalCount} productos)
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
