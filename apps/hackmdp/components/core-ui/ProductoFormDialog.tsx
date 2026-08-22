'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { toast } from 'sonner'
import { Loader2, Check, ChevronsUpDown, Wand2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Producto } from '@/lib/types'
import { usePricing } from './pricing/use-pricing'
import { PricingSection } from './pricing/PricingSection'

interface ProductoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  producto?: Producto | null
  onSuccess: (producto?: any) => void
  /** Si se pasa, pre-rellena el nombre del producto (para el flujo "agregar desde buscador") */
  initialNombre?: string
}

const UNIDADES_MEDIDA = ['unidad', 'kg', 'lt', 'm', 'caja', 'pack'] as const

// Áreas de análisis (deben coincidir con el script de clasificación y el filtro
// de la página de productos).
const LINEAS_ANALISIS = [
  'Hematología',
  'Química clínica',
  'Iones/ISE',
  'Coagulación',
  'Inmunología/Serología',
  'Endocrino/Hormonas',
  'Uroanálisis',
  'Microbiología',
  'General',
] as const

interface DepositoOption { id: string; nombre: string }
interface MarcaOption { id: string; nombre: string }
interface ProveedorOption { id: string; nombre: string }

const jsonFetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  const data = await res.json()
  return data
}

const listFetcher = async <T,>(url: string): Promise<T[]> => {
  const res = await fetch(url)
  const data = await res.json()
  return Array.isArray(data) ? data : data?.rows || []
}

/**
 * Combobox con autocompletar y "add-new": permite elegir un string existente
 * o ingresar uno nuevo. La opción elegida vuelve como string.
 */
function ComboboxString({
  value,
  onChange,
  options,
  placeholder,
  emptyMessage,
  id,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  emptyMessage?: string
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options

  const showCreate =
    query.trim() && !options.some((o) => o.toLowerCase() === query.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && 'text-muted-foreground')}>
            {value || placeholder || 'Seleccionar...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar o escribir..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList
            className="max-h-[260px] overflow-y-auto overscroll-contain"
            onWheel={(e) => {
              // cmdk puede interceptar wheel events — scrolleamos manual.
              const el = e.currentTarget
              if (el.scrollHeight > el.clientHeight) {
                el.scrollTop += e.deltaY
              }
            }}
          >
            <CommandEmpty>{emptyMessage || 'Sin resultados'}</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt ? 'opacity-100' : 'opacity-0')} />
                  {opt}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  value={`__create_${query}`}
                  onSelect={() => {
                    onChange(query.trim())
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear "{query.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Combobox que devuelve el id de la opción seleccionada. Permite crear
 * nuevas entidades via POST al endpoint correspondiente.
 */
function ComboboxEntity({
  value,
  onChange,
  options,
  createEndpoint,
  placeholder,
  onOptionCreated,
  id,
}: {
  value: string
  onChange: (id: string, nombre: string) => void
  options: Array<{ id: string; nombre: string }>
  createEndpoint: string
  placeholder?: string
  onOptionCreated: () => void
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = query
    ? options.filter((o) => o.nombre?.toLowerCase().includes(query.toLowerCase()))
    : options

  const showCreate =
    query.trim() && !options.some((o) => o.nombre?.toLowerCase() === query.toLowerCase())

  const selectedNombre = options.find((o) => o.id === value)?.nombre || ''

  const handleCreate = async () => {
    const nombre = query.trim()
    if (!nombre) return
    setCreating(true)
    try {
      const res = await fetch(createEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      })
      if (!res.ok) throw new Error('Error al crear')
      const created = await res.json()
      onChange(created.id, created.nombre)
      onOptionCreated()
      setOpen(false)
      setQuery('')
    } catch (e: any) {
      toast.error(e.message || 'No se pudo crear')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && 'text-muted-foreground')}>
            {selectedNombre || placeholder || 'Seleccionar...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar o escribir nuevo..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList
            className="max-h-[260px] overflow-y-auto overscroll-contain"
            onWheel={(e) => {
              // cmdk puede interceptar wheel events — scrolleamos manual.
              const el = e.currentTarget
              if (el.scrollHeight > el.clientHeight) {
                el.scrollTop += e.deltaY
              }
            }}
          >
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none"
                onSelect={() => {
                  onChange('', '')
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="text-muted-foreground">Sin asignar</span>
              </CommandItem>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.id}
                  onSelect={() => {
                    onChange(opt.id, opt.nombre)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt.id ? 'opacity-100' : 'opacity-0')} />
                  {opt.nombre}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem value={`__create_${query}`} onSelect={handleCreate} disabled={creating}>
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Crear "{query.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ProductoFormDialog({ open, onOpenChange, producto, onSuccess, initialNombre }: ProductoFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    categoria: '',
    descripcion: '',
    unidad_medida: 'unidad',
    stock_actual: '',
    stock_minimo: '',
    ubicacion: '',
    fabricante: '',
    imagen_url: '',
    deposito_id: '',
    marca_id: '',
    proveedor_habitual_id: '',
    es_recurrente: false,
    linea_analisis: '',
  })

  const pricing = usePricing({
    precio_costo: producto?.precio_costo?.toString() ?? '',
    precio_venta: producto?.precio_venta?.toString() ?? '',
    ganancia: producto?.ganancia?.toString() ?? '',
    moneda: (producto?.moneda as 'USD' | 'ARS') ?? 'ARS',
    moneda_compra: (producto?.moneda_compra as 'USD' | 'ARS') ?? 'ARS',
    precio_venta_modo: (producto?.precio_venta_modo as 'calculado' | 'fijo') ?? 'calculado',
    iva_alicuota: producto?.iva_alicuota?.toString() ?? '21',
  }, open)

  // Data sources
  const { data: depositos = [] } = useSWR<DepositoOption[]>(
    open ? '/api/inventario/depositos' : null,
    listFetcher
  )
  const { data: categorias = [] } = useSWR<string[]>(
    open ? '/api/categorias' : null,
    listFetcher
  )
  const { data: marcas = [], mutate: mutateMarcas } = useSWR<MarcaOption[]>(
    open ? '/api/marcas' : null,
    listFetcher
  )
  const { data: proveedores = [], mutate: mutateProveedores } = useSWR<ProveedorOption[]>(
    open ? '/api/proveedores' : null,
    listFetcher
  )
  const ubicacionesUrl = formData.deposito_id
    ? `/api/productos/ubicaciones?deposito_id=${formData.deposito_id}`
    : '/api/productos/ubicaciones'
  const { data: ubicaciones = [] } = useSWR<string[]>(
    open ? ubicacionesUrl : null,
    listFetcher
  )

  // Pre-populate form when producto changes
  useEffect(() => {
    if (producto) {
      const p = producto as any
      setFormData({
        nombre: producto.nombre || '',
        codigo: producto.codigo || '',
        categoria: producto.categoria || '',
        descripcion: producto.descripcion || '',
        unidad_medida: producto.unidad_medida || 'unidad',
        stock_actual: producto.stock_actual?.toString() || '',
        stock_minimo: producto.stock_minimo?.toString() || '',
        ubicacion: producto.ubicacion || '',
        fabricante: producto.fabricante || '',
        imagen_url: producto.imagen_url || '',
        deposito_id: p.deposito_id || '',
        marca_id: p.marca_id || '',
        proveedor_habitual_id: p.proveedor_habitual_id || '',
        es_recurrente: Boolean(p.es_recurrente),
        linea_analisis: p.linea_analisis || '',
      })
      // Reset pricing state for the loaded product
      pricing.setState({
        precio_costo: producto.precio_costo?.toString() || '',
        precio_venta: producto.precio_venta?.toString() || '',
        ganancia: producto.ganancia?.toString() || '',
        moneda: (producto.moneda as 'USD' | 'ARS') || 'ARS',
        moneda_compra: (producto.moneda_compra as 'USD' | 'ARS') || 'ARS',
        precio_venta_modo: (producto.precio_venta_modo as 'calculado' | 'fijo') || 'calculado',
        iva_alicuota: producto.iva_alicuota?.toString() || '21',
      })
    } else {
      setFormData({
        nombre: initialNombre || '',
        codigo: '',
        categoria: '',
        descripcion: '',
        unidad_medida: 'unidad',
        stock_actual: '',
        stock_minimo: '',
        ubicacion: '',
        fabricante: '',
        imagen_url: '',
        deposito_id: '',
        marca_id: '',
        proveedor_habitual_id: '',
        es_recurrente: false,
        linea_analisis: '',
      })
      pricing.setState({
        precio_costo: '', moneda_compra: 'ARS', ganancia: '',
        precio_venta: '', moneda: 'ARS', precio_venta_modo: 'calculado', iva_alicuota: '21',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto, initialNombre, open])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAutoCodigo = async () => {
    try {
      const res = await fetch('/api/productos/next-codigo?prefix=UNO-')
      const data = await res.json()
      if (data.next_codigo) {
        handleChange('codigo', data.next_codigo)
        toast.success(`Código asignado: ${data.next_codigo}`)
      }
    } catch (e) {
      toast.error('Error al generar código')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: any = {
        nombre: formData.nombre,
        codigo: formData.codigo,
        categoria: formData.categoria || null,
        descripcion: formData.descripcion || null,
        unidad_medida: formData.unidad_medida,
        precio_costo: pricing.state.precio_costo ? parseFloat(pricing.state.precio_costo) : null,
        precio_venta: pricing.state.precio_venta ? parseFloat(pricing.state.precio_venta) : null,
        ganancia: pricing.state.ganancia || null,
        moneda: pricing.state.moneda,
        moneda_compra: pricing.state.moneda_compra,
        precio_venta_modo: pricing.state.precio_venta_modo,
        iva_alicuota: pricing.state.iva_alicuota || null,
        stock_actual: formData.stock_actual ? parseFloat(formData.stock_actual) : null,
        stock_minimo: formData.stock_minimo ? parseFloat(formData.stock_minimo) : null,
        ubicacion: formData.ubicacion || null,
        fabricante: formData.fabricante || null,
        imagen_url: formData.imagen_url || null,
        deposito_id: formData.deposito_id || null,
        marca_id: formData.marca_id || null,
        proveedor_habitual_id: formData.proveedor_habitual_id || null,
        es_recurrente: formData.es_recurrente,
        linea_analisis: formData.linea_analisis || null,
      }

      const isEdit = !!producto
      if (isEdit) payload.id = (producto as any).id

      const response = await fetch('/api/productos', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar el producto')
      }

      const saved = await response.json()
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
      onSuccess(saved)
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving producto:', error)
      toast.error(error.message || 'Error al guardar el producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{producto ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          <DialogDescription>
            {producto ? 'Modifica los datos del producto' : 'Completa los datos del nuevo producto'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList>
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="precios">Precios</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    required
                    placeholder="Nombre del producto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => handleChange('codigo', e.target.value)}
                      required
                      placeholder="Código o SKU"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAutoCodigo}
                      title="Generar próximo código UNO-"
                      className="shrink-0"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Podés usar el botón para auto-generar el próximo UNO-NNNNNN
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <ComboboxString
                    id="categoria"
                    value={formData.categoria}
                    onChange={(v) => handleChange('categoria', v)}
                    options={categorias}
                    placeholder="Seleccionar o escribir categoría"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidad_medida">Unidad de Medida</Label>
                  <Select
                    value={formData.unidad_medida}
                    onValueChange={(value) => handleChange('unidad_medida', value)}
                  >
                    <SelectTrigger id="unidad_medida">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDADES_MEDIDA.map((unidad) => (
                        <SelectItem key={unidad} value={unidad}>
                          {unidad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linea_analisis">Área de análisis</Label>
                  <Select
                    value={formData.linea_analisis || '__none__'}
                    onValueChange={(value) => handleChange('linea_analisis', value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger id="linea_analisis">
                      <SelectValue placeholder="Sin área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin área</SelectItem>
                      {LINEAS_ANALISIS.map((linea) => (
                        <SelectItem key={linea} value={linea}>
                          {linea}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marca_id">Fabricante / Marca</Label>
                  <ComboboxEntity
                    id="marca_id"
                    value={formData.marca_id}
                    onChange={(id, nombre) => {
                      setFormData((prev) => ({
                        ...prev,
                        marca_id: id,
                        fabricante: nombre, // mantener el campo legacy sincronizado
                      }))
                    }}
                    options={marcas}
                    createEndpoint="/api/marcas"
                    placeholder="Seleccionar marca"
                    onOptionCreated={mutateMarcas}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proveedor_habitual_id">Proveedor habitual</Label>
                  <ComboboxEntity
                    id="proveedor_habitual_id"
                    value={formData.proveedor_habitual_id}
                    onChange={(id) => handleChange('proveedor_habitual_id', id)}
                    options={proveedores}
                    createEndpoint="/api/proveedores"
                    placeholder="Seleccionar proveedor"
                    onOptionCreated={mutateProveedores}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  placeholder="Descripción del producto"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="precios" className="space-y-4 pt-4">
              <PricingSection pricing={pricing} />
            </TabsContent>

            <TabsContent value="stock" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_actual">Stock Actual</Label>
                  <Input
                    id="stock_actual"
                    type="number"
                    step="0.01"
                    value={formData.stock_actual}
                    onChange={(e) => handleChange('stock_actual', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                  <Input
                    id="stock_minimo"
                    type="number"
                    step="0.01"
                    value={formData.stock_minimo}
                    onChange={(e) => handleChange('stock_minimo', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposito_id">Depósito</Label>
                  <Select
                    value={formData.deposito_id || 'none'}
                    onValueChange={(v) => handleChange('deposito_id', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger id="deposito_id">
                      <SelectValue placeholder="Seleccionar depósito" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin depósito</SelectItem>
                      {depositos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubicacion">Ubicación dentro del depósito</Label>
                  <ComboboxString
                    id="ubicacion"
                    value={formData.ubicacion}
                    onChange={(v) => handleChange('ubicacion', v)}
                    options={ubicaciones}
                    placeholder="Ej: Estante 5, Pallet, Piso"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="avanzado" className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="es_recurrente" className="text-sm font-medium">
                    Producto recurrente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marcá si genera ingresos recurrentes (ej. membresía, suscripción, servicio mensual).
                    Se incluye en el cálculo de MRR/ARR.
                  </p>
                </div>
                <Switch
                  id="es_recurrente"
                  checked={formData.es_recurrente}
                  onCheckedChange={(v) =>
                    setFormData((prev) => ({ ...prev, es_recurrente: Boolean(v) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagen_url">URL de Imagen</Label>
                <Input
                  id="imagen_url"
                  type="url"
                  value={formData.imagen_url}
                  onChange={(e) => handleChange('imagen_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {producto ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
