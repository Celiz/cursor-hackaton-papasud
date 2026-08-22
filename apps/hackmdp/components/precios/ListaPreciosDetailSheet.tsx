'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Plus, Loader2, Tag, Users, Search, X, Package } from 'lucide-react'
import { ListaProductosTab } from './ListaProductosTab'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ListaPreciosDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lista: { id: string; nombre: string; margen_porcentaje: number } | null
  onRefreshParent: () => void
}

export function ListaPreciosDetailSheet({ open, onOpenChange, lista, onRefreshParent }: ListaPreciosDetailSheetProps) {
  const [tab, setTab] = useState<'productos' | 'excepciones' | 'clientes'>('productos')

  // Excepciones state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addProductoSearch, setAddProductoSearch] = useState('')
  const [addTipo, setAddTipo] = useState<'fijo' | 'margen'>('fijo')
  const [addValor, setAddValor] = useState('')
  const [addProductoId, setAddProductoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Clientes state
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSearchDebounced, setClienteSearchDebounced] = useState('')
  const [showAddCliente, setShowAddCliente] = useState(false)
  const [addingClienteId, setAddingClienteId] = useState<string | null>(null)
  const [removingClienteId, setRemovingClienteId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setClienteSearchDebounced(clienteSearch), 250)
    return () => clearTimeout(t)
  }, [clienteSearch])

  useEffect(() => {
    if (!open) {
      setShowAddForm(false)
      setShowAddCliente(false)
      setClienteSearch('')
      setAddProductoSearch('')
      setAddProductoId('')
      setAddValor('')
    }
  }, [open])

  const { data, isLoading, mutate } = useSWR(
    open && lista ? `/api/precios/listas/${lista.id}/items` : null,
    fetcher,
    { dedupingInterval: 5000 }
  )

  const { data: clientesData, mutate: mutateClientes } = useSWR(
    open && lista && tab === 'clientes' ? `/api/listas-precios/${lista.id}/clientes` : null,
    fetcher,
    { dedupingInterval: 5000 }
  )

  const { data: searchResults } = useSWR(
    showAddForm && addProductoSearch.length >= 2
      ? `/api/precios?page=1&pageSize=10&search=${encodeURIComponent(addProductoSearch)}`
      : null,
    fetcher,
    { dedupingInterval: 300 }
  )

  const { data: clienteSearchResults } = useSWR(
    showAddCliente && clienteSearchDebounced.length >= 2
      ? `/api/clientes?search=${encodeURIComponent(clienteSearchDebounced)}&limit=10`
      : null,
    fetcher,
    { dedupingInterval: 300 }
  )

  const items = Array.isArray(data) ? data : data?.items || []
  const productOptions = searchResults?.items || []
  const clientes = Array.isArray(clientesData) ? clientesData : []
  const clienteOptions = (Array.isArray(clienteSearchResults) ? clienteSearchResults : clienteSearchResults?.items || [])
    .filter((c: any) => !clientes.find((x: any) => x.id === c.id))

  const fmt = (n: number) => `$${(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

  const handleAddOverride = async () => {
    if (!addProductoId) {
      toast.error('Selecciona un producto')
      return
    }
    const numVal = parseFloat(addValor)
    if (isNaN(numVal) || numVal <= 0) {
      toast.error('Ingresa un valor valido')
      return
    }
    if (!lista) return

    setSaving(true)
    try {
      const res = await fetch(`/api/precios/listas/${lista.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: addProductoId,
          precio_fijo: addTipo === 'fijo' ? numVal : null,
          margen_override: addTipo === 'margen' ? numVal : null,
        }),
      })

      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error al agregar excepción')

      toast.success('Excepción agregada')
      mutate()
      onRefreshParent()
      setShowAddForm(false)
      setAddProductoSearch('')
      setAddProductoId('')
      setAddValor('')
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar excepción')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOverride = async (productoId: string) => {
    if (!lista) return
    setDeletingId(productoId)
    try {
      const res = await fetch(`/api/precios/listas/${lista.id}/items?producto_id=${productoId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al eliminar excepción')
      }
      toast.success('Excepción eliminada')
      mutate()
      onRefreshParent()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar excepción')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddCliente = async (clienteId: string) => {
    if (!lista) return
    setAddingClienteId(clienteId)
    try {
      const res = await fetch(`/api/listas-precios/${lista.id}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error al asignar cliente')
      toast.success('Cliente asignado')
      mutateClientes()
      onRefreshParent()
      setClienteSearch('')
    } catch (err: any) {
      toast.error(err.message || 'Error al asignar cliente')
    } finally {
      setAddingClienteId(null)
    }
  }

  const handleRemoveCliente = async (clienteId: string) => {
    if (!lista) return
    if (!confirm('¿Quitar este cliente de la lista?')) return
    setRemovingClienteId(clienteId)
    try {
      const res = await fetch(`/api/listas-precios/${lista.id}/clientes?cliente_id=${clienteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al quitar cliente')
      }
      toast.success('Cliente quitado de la lista')
      mutateClientes()
      onRefreshParent()
    } catch (err: any) {
      toast.error(err.message || 'Error al quitar cliente')
    } finally {
      setRemovingClienteId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" title={lista?.nombre || 'Lista de Precios'} className="sm:max-w-3xl w-full overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <div>
            <h3 className="font-semibold text-lg">{lista?.nombre}</h3>
            <p className="text-sm text-muted-foreground">
              Margen global: {parseFloat(String(lista?.margen_porcentaje ?? 0)).toFixed(1)}%
            </p>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'productos' | 'excepciones' | 'clientes')} className="px-4 pt-4">
          <TabsList>
            <TabsTrigger value="productos">
              <Package className="h-4 w-4" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="excepciones">
              <Tag className="h-4 w-4" />
              Excepciones
              {items.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {items.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clientes">
              <Users className="h-4 w-4" />
              Clientes
              {clientes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {clientes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="productos" className="mt-4">
            {lista && <ListaProductosTab lista={lista} onRefreshParent={onRefreshParent} />}
          </TabsContent>

          <TabsContent value="excepciones" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 && !showAddForm ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm mb-4">
                  No hay excepciones de precio. Se aplica el margen global a todos los productos.
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4" />
                  Agregar excepción
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Producto</th>
                        <th className="text-center p-2 font-medium">Tipo</th>
                        <th className="text-right p-2 font-medium">Valor</th>
                        <th className="text-right p-2 font-medium">Precio Calc.</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any) => {
                        const isFijo = item.precio_fijo != null
                        const valor = isFijo ? parseFloat(item.precio_fijo) : parseFloat(item.margen_override ?? 0)
                        const precioCalc = parseFloat(item.precio_calculado) || 0

                        return (
                          <tr key={item.producto_id} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="p-2">
                              <div className="font-medium">{item.nombre}</div>
                              <div className="text-xs text-muted-foreground">{item.codigo}</div>
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant={isFijo ? 'info' : 'success'}>
                                {isFijo ? 'Precio Fijo' : 'Margen %'}
                              </Badge>
                            </td>
                            <td className="p-2 text-right font-mono">
                              {isFijo ? fmt(valor) : `${valor.toFixed(1)}%`}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {fmt(precioCalc)}
                            </td>
                            <td className="p-2">
                              <button
                                onClick={() => handleDeleteOverride(item.producto_id)}
                                disabled={deletingId === item.producto_id}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 disabled:opacity-50"
                                title="Eliminar excepción"
                              >
                                {deletingId === item.producto_id ? (
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

                {!showAddForm && (
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4" />
                    Agregar excepción
                  </Button>
                )}
              </div>
            )}

            {showAddForm && (
              <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Agregar excepción</h4>

                <div className="space-y-2">
                  <Input
                    placeholder="Buscar producto..."
                    value={addProductoSearch}
                    onChange={(e) => {
                      setAddProductoSearch(e.target.value)
                      setAddProductoId('')
                    }}
                  />
                  {productOptions.length > 0 && !addProductoId && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-32 overflow-y-auto">
                      {productOptions.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setAddProductoId(p.id)
                            setAddProductoSearch(p.nombre)
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium">{p.nombre}</span>
                          <span className="text-muted-foreground ml-2">{p.codigo}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Select value={addTipo} onValueChange={(v) => setAddTipo(v as 'fijo' | 'margen')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fijo">Precio Fijo</SelectItem>
                      <SelectItem value="margen">Margen %</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={addTipo === 'fijo' ? 'Precio $' : 'Margen %'}
                    value={addValor}
                    onChange={(e) => setAddValor(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddOverride} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setShowAddForm(false)
                    setAddProductoSearch('')
                    setAddProductoId('')
                    setAddValor('')
                  }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clientes" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showAddCliente ? 'secondary' : 'default'}
                onClick={() => setShowAddCliente(v => !v)}
              >
                {showAddCliente ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showAddCliente ? 'Cerrar' : 'Asignar cliente'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {clientes.length === 0
                  ? 'Sin clientes asignados'
                  : `${clientes.length} cliente${clientes.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {showAddCliente && (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente por nombre o CUIT..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                {clienteSearchDebounced.length >= 2 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                    {clienteOptions.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                        Sin resultados (los ya asignados no aparecen).
                      </p>
                    ) : (
                      clienteOptions.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() => handleAddCliente(c.id)}
                          disabled={addingClienteId === c.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.nombre}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {c.cuit || c.localidad || '—'}
                            </div>
                          </div>
                          {addingClienteId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Asignar a esta lista sobreescribe la lista previa del cliente, si tenia una.
                </p>
              </div>
            )}

            {clientes.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aun no hay clientes asignados a esta lista.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Cliente</th>
                      <th className="text-left p-2 font-medium">CUIT</th>
                      <th className="text-left p-2 font-medium">Localidad</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c: any) => (
                      <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="p-2 font-medium">{c.nombre}</td>
                        <td className="p-2 font-mono text-xs text-muted-foreground">{c.cuit || '—'}</td>
                        <td className="p-2 text-muted-foreground text-xs">{c.localidad || '—'}</td>
                        <td className="p-2">
                          <button
                            onClick={() => handleRemoveCliente(c.id)}
                            disabled={removingClienteId === c.id}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 disabled:opacity-50"
                            title="Quitar de la lista"
                          >
                            {removingClienteId === c.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
