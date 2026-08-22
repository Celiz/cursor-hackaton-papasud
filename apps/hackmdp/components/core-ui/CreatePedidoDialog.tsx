'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from '@/lib/hooks/use-session'
import useSWR from 'swr'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { SearchableCombobox, ComboboxOption } from '@/components/ui/searchable-combobox'
import { searchClientes, ClienteComboboxOption } from '@/hooks/use-client-search'
import {
  Loader2,
  Plus,
  Trash2,
  Package,
  Search,
  ShoppingCart,
  History,
  ChevronRight,
  Copy,
  X,
  FileText,
  ArrowRight,
  Building2,
  FlaskConical,
  MapPin,
  Star,
  Boxes,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFormatCurrency } from '@/lib/hooks/use-format-currency'

interface PresupuestoParaConvertir {
  id: string
  numero: string
  cliente_id: string
  cliente_nombre?: string
  fecha_emision: string
  total: number
  items: {
    producto_id: string
    codigo?: string
    nombre: string
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }[]
}

interface CreatePedidoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  presupuestoId?: string
  presupuesto?: PresupuestoParaConvertir | null
  defaultClienteId?: string
  defaultItems?: Array<{
    producto_id?: string | null
    codigo?: string
    nombre: string
    cantidad: number
    precio_unitario: number
  }>
  sourceRef?: string // e.g. "WhatsApp: Jose Sigismondi"
}

interface ProductoCliente {
  id: string
  codigo: string
  nombre: string
  categoria: string | null
  precio_venta: number | null
  unidad_medida: string | null
  stock_actual: number | null
  veces_comprado: number
  ultima_compra: string | null
  relevancia: number
  cantidad_habitual?: number | null
  marca_preferida?: string | null
  marca_detectada?: string | null
  es_favorito?: boolean
}

type PrecioFuente = 'override_fijo' | 'override_margen' | 'lista_margen' | 'producto_default' | 'manual'

interface PedidoItem {
  id: string
  producto_id: string
  codigo: string
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  fuente?: PrecioFuente
  lista_nombre?: string | null
}

interface PedidoHistorial {
  id: string
  numero: string
  fecha_pedido: string
  total: number
  items: {
    producto_id: string
    codigo: string
    nombre: string
    cantidad: number
    precio_unitario: number
  }[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error')
  return data
}

export function CreatePedidoDialog({
  open,
  onOpenChange,
  onSuccess,
  presupuestoId,
  presupuesto,
  defaultClienteId,
  defaultItems,
  sourceRef,
}: CreatePedidoDialogProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [items, setItems] = useState<PedidoItem[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [showPresupuestos, setShowPresupuestos] = useState(false)
  const [fromPresupuesto, setFromPresupuesto] = useState<string | null>(null)
  const [marcaFiltro, setMarcaFiltro] = useState<string | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)
  const [tabActiva, setTabActiva] = useState<'todos' | 'insumos'>('todos')
  const [historialExpandido, setHistorialExpandido] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fecha_requerida: '',
    tipo_entrega: 'retiro',
    direccion_entrega: '',
    observaciones: '',
    sin_cargo: false,
    motivo_sin_cargo: '',
  })

  // Cargar presupuestos aprobados del cliente para convertir
  const { data: presupuestosCliente } = useSWR(
    clienteId ? `/api/presupuestos?cliente_id=${clienteId}&estado=aprobado` : null,
    fetcher
  )

  // Función para sanitizar valores numéricos (definida aquí para el useEffect)
  const safeNum = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0
    const num = typeof value === 'string' ? parseFloat(value) : Number(value)
    return isNaN(num) ? 0 : num
  }

  // Función para normalizar categorías (quita "Venta Productos - " y acorta nombres)
  const normalizarCategoria = (categoria: string | null): string | null => {
    if (!categoria) return null
    // Quitar prefijo común
    let cat = categoria.replace(/^Venta Productos\s*-?\s*/i, '').trim()
    // Abreviar nombres largos
    const abreviaturas: Record<string, string> = {
      'Diagnostico In Vitro': 'Reactivo',
      'Repuesto Nuevo': 'Repuesto',
      'Repuesto Reparado': 'Rep. Reparado',
      'Equipo Nuevo': 'Equipo',
      'Equipo Usado': 'Equipo Usado',
      'Consumible': 'Consumible',
      'Descartables': 'Descartable',
      'Veterinaria': 'Veterinaria',
      'Software': 'Software',
      'Módulo': 'Módulo',
      'Varios TRANSPORTES': 'Transporte',
    }
    return abreviaturas[cat] || cat || null
  }

  // Pre-cargar datos del presupuesto si viene uno
  useEffect(() => {
    if (presupuesto && open) {
      setClienteId(presupuesto.cliente_id)
      setFromPresupuesto(presupuesto.id)

      // Convertir items del presupuesto a items del pedido
      const pedidoItems: PedidoItem[] = presupuesto.items.map(item => {
        const cantidad = safeNum(item.cantidad) || 1
        const precio = safeNum(item.precio_unitario)
        return {
          id: crypto.randomUUID(),
          producto_id: item.producto_id,
          codigo: item.codigo || '',
          nombre: item.nombre || item.descripcion,
          cantidad,
          precio_unitario: precio,
          subtotal: safeNum(item.subtotal) || cantidad * precio,
        }
      })
      setItems(pedidoItems)

      setFormData(prev => ({
        ...prev,
        observaciones: `Generado desde presupuesto ${presupuesto.numero}`,
      }))
    }
  }, [presupuesto, open])

  // Pre-cargar items desde defaultItems (ej: extraídos de WhatsApp)
  useEffect(() => {
    if (defaultItems && defaultItems.length > 0 && open && !presupuesto) {
      const pedidoItems: PedidoItem[] = defaultItems.map(item => ({
        id: crypto.randomUUID(),
        producto_id: item.producto_id || '',
        codigo: item.codigo || '',
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario,
      }))
      setItems(pedidoItems)

      if (sourceRef) {
        setFormData(prev => ({
          ...prev,
          observaciones: `Generado desde ${sourceRef}`,
        }))
      }
    }
  }, [defaultItems, open])

  // Pre-set client from defaultClienteId prop
  useEffect(() => {
    if (defaultClienteId && open && !presupuesto) {
      setClienteId(defaultClienteId)
    }
  }, [defaultClienteId, open, presupuesto])

  // Obtener productos cuando hay búsqueda (tab "Todos")
  // Aumentamos el límite a 200 para tener mejor representación de categorías/marcas
  const { data: productosData, isLoading: loadingProductos } = useSWR(
    clienteId && tabActiva === 'todos' && busquedaProducto.length >= 2
      ? `/api/clientes/${clienteId}/productos?busqueda=${busquedaProducto}&incluir_todos=true&limite=200`
      : null,
    fetcher
  )

  // Obtener insumos preferidos del cliente (tab "Insumos")
  const { data: insumosData, isLoading: loadingInsumos } = useSWR(
    clienteId && tabActiva === 'insumos'
      ? `/api/clientes/${clienteId}/productos`
      : null,
    fetcher
  )

  // Obtener historial de pedidos del cliente
  const { data: historialData } = useSWR(
    clienteId ? `/api/pedidos-ventas?cliente_id=${clienteId}&limit=5` : null,
    fetcher
  )

  // Productos según la tab activa
  const productos: ProductoCliente[] = tabActiva === 'todos'
    ? (productosData?.productos || [])
    : (insumosData?.productos || [])
  const historialPedidos: PedidoHistorial[] = historialData || []
  const insumosCount = insumosData?.total || 0

  // Extraer marcas únicas de los productos (usa marca_detectada si existe)
  const marcasDisponibles = useMemo(() => {
    const marcas = new Map<string, number>()
    productos.forEach(p => {
      const marca = p.marca_detectada
      if (marca) {
        marcas.set(marca, (marcas.get(marca) || 0) + 1)
      }
    })
    // Ordenar por cantidad de productos (más frecuentes primero)
    return Array.from(marcas.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([marca, count]) => ({ marca, count }))
  }, [productos])

  // Extraer categorías únicas de los productos (normalizadas)
  const categoriasDisponibles = useMemo(() => {
    const categorias = new Map<string, number>()
    productos.forEach(p => {
      const cat = normalizarCategoria(p.categoria)
      if (cat) {
        categorias.set(cat, (categorias.get(cat) || 0) + 1)
      }
    })
    // Ordenar por cantidad de productos (más frecuentes primero)
    return Array.from(categorias.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, count]) => ({ categoria, count }))
  }, [productos])

  // Filtrar productos por marca y categoría seleccionada
  const productosFiltrados = useMemo(() => {
    let filtrados = productos
    if (marcaFiltro) {
      filtrados = filtrados.filter(p => p.marca_detectada === marcaFiltro)
    }
    if (categoriaFiltro) {
      filtrados = filtrados.filter(p => normalizarCategoria(p.categoria) === categoriaFiltro)
    }
    return filtrados
  }, [productos, marcaFiltro, categoriaFiltro])

  // Calcular totales
  const totales = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + safeNum(item.subtotal), 0)
    const iva = subtotal * 0.21
    const total = subtotal + iva
    return { subtotal, iva, total }
  }, [items])

  const resolvePrecio = useCallback(async (productoId: string): Promise<{
    precio: number
    fuente: PrecioFuente
    lista_nombre: string | null
  } | null> => {
    try {
      const params = new URLSearchParams()
      params.set('producto_ids', productoId)
      if (clienteId) params.set('cliente_id', clienteId)
      const res = await fetch(`/api/precios/resolver?${params.toString()}`)
      if (!res.ok) return null
      const data = await res.json()
      const r = (data.results || [])[0]
      if (!r) return null
      return {
        precio: Number(r.precio_venta) || 0,
        fuente: r.fuente as PrecioFuente,
        lista_nombre: r.lista_nombre || null,
      }
    } catch {
      return null
    }
  }, [clienteId])

  const handleAddItem = useCallback(async (producto: ProductoCliente) => {
    // Fast path: if it's already in the list, just bump quantity.
    const existing = items.find(i => i.producto_id === producto.id)
    if (existing) {
      setItems(prev => prev.map(i =>
        i.producto_id === producto.id
          ? { ...i, cantidad: (i.cantidad || 0) + 1, subtotal: ((i.cantidad || 0) + 1) * safeNum(i.precio_unitario) }
          : i
      ))
      return
    }

    // Optimistic insert with default price; will be replaced by resolver result.
    const fallback = safeNum(producto.precio_venta)
    const tempId = crypto.randomUUID()
    setItems(prev => [...prev, {
      id: tempId,
      producto_id: producto.id,
      codigo: producto.codigo || '',
      nombre: producto.nombre,
      cantidad: 1,
      precio_unitario: fallback,
      subtotal: fallback,
      fuente: 'producto_default',
      lista_nombre: null,
    }])

    const resolved = await resolvePrecio(producto.id)
    if (!resolved) return
    setItems(prev => prev.map(i =>
      i.id === tempId
        ? {
            ...i,
            precio_unitario: resolved.precio,
            subtotal: i.cantidad * resolved.precio,
            fuente: resolved.fuente,
            lista_nombre: resolved.lista_nombre,
          }
        : i
    ))
  }, [items, resolvePrecio])

  const handleAddFromHistorial = useCallback((pedido: PedidoHistorial) => {
    const newItems = pedido.items.map(item => {
      const cantidad = safeNum(item.cantidad) || 1
      const precio = safeNum(item.precio_unitario)
      return {
        id: crypto.randomUUID(),
        producto_id: item.producto_id,
        codigo: item.codigo,
        nombre: item.nombre,
        cantidad,
        precio_unitario: precio,
        subtotal: cantidad * precio,
      }
    })

    setItems(prev => {
      // Merge: si ya existe, suma cantidad
      const merged = [...prev]
      newItems.forEach(newItem => {
        const existing = merged.find(i => i.producto_id === newItem.producto_id)
        if (existing) {
          existing.cantidad = (existing.cantidad || 0) + (newItem.cantidad || 0)
          existing.subtotal = existing.cantidad * safeNum(existing.precio_unitario)
        } else {
          merged.push(newItem)
        }
      })
      return merged
    })

    setShowHistorial(false)
    toast.success(`${newItems.length} items agregados del pedido ${pedido.numero}`)
  }, [])

  const handleLoadFromPresupuesto = useCallback(async (pres: any) => {
    try {
      // Obtener presupuesto con items
      const res = await fetch(`/api/presupuestos?id=${pres.id}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al cargar presupuesto')

      const presItems = data.presupuestos_items || []

      // Convertir items con valores sanitizados
      const pedidoItems: PedidoItem[] = presItems.map((item: any) => {
        const cantidad = safeNum(item.cantidad) || 1
        const precio = safeNum(item.precio_unitario)
        return {
          id: crypto.randomUUID(),
          producto_id: item.producto_id || '',
          codigo: item.productos?.codigo || '',
          nombre: item.productos?.nombre || item.descripcion,
          cantidad,
          precio_unitario: precio,
          subtotal: safeNum(item.subtotal) || cantidad * precio,
        }
      })

      // Reemplazar items actuales
      setItems(pedidoItems)
      setFromPresupuesto(pres.id)
      setShowPresupuestos(false)
      setFormData(prev => ({
        ...prev,
        observaciones: `Generado desde presupuesto ${pres.numero}`,
      }))

      toast.success(`${pedidoItems.length} items cargados desde presupuesto ${pres.numero}`)
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar presupuesto')
    }
  }, [])

  const handleUpdateItem = useCallback((id: string, field: 'cantidad' | 'precio_unitario', value: number) => {
    // Asegurar que el valor sea un número válido y no negativo
    const safeValue = Math.max(0, safeNum(value))
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: safeValue }
      updated.subtotal = safeNum(updated.cantidad) * safeNum(updated.precio_unitario)
      if (field === 'precio_unitario') updated.fuente = 'manual'
      return updated
    }))
  }, [])

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleSubmit = async () => {
    if (!clienteId || items.length === 0) return

    setLoading(true)
    try {
      // Sanitizar todos los valores numéricos antes de enviar
      const sanitizedItems = items.map(i => {
        const cantidad = safeNum(i.cantidad) || 1
        const precio = safeNum(i.precio_unitario)
        return {
          producto_id: i.producto_id,
          descripcion: i.nombre,
          cantidad,
          precio_unitario: precio,
          subtotal: cantidad * precio,
        }
      })

      const subtotalCalc = sanitizedItems.reduce((sum, item) => sum + item.subtotal, 0)
      const ivaCalc = subtotalCalc * 0.21
      const totalCalc = subtotalCalc + ivaCalc

      // Validar: si el pedido es sin_cargo, el motivo es obligatorio.
      // El backend también lo valida por constraint chk_pedidos_sin_cargo_motivo (migración 887).
      if (formData.sin_cargo && !formData.motivo_sin_cargo.trim()) {
        toast.error('Si el pedido es sin cargo, el motivo es obligatorio')
        setLoading(false)
        return
      }

      const payload = {
        cliente_id: clienteId,
        presupuesto_id: presupuestoId || fromPresupuesto || null,
        fecha_requerida: formData.fecha_requerida || null,
        tipo_entrega: formData.tipo_entrega,
        direccion_entrega: formData.direccion_entrega || null,
        observaciones: formData.observaciones || null,
        // sin_cargo: cuando está en true, el pedido no se factura a AFIP.
        // Se genera un "Remito Interno Sin Cargo" trazable. Stock se descarga
        // igual y no afecta cuenta corriente del cliente.
        sin_cargo: formData.sin_cargo,
        motivo_sin_cargo: formData.sin_cargo ? formData.motivo_sin_cargo.trim() : null,
        subtotal: subtotalCalc,
        iva: ivaCalc,
        total: totalCalc,
        items: sanitizedItems,
        creado_por: session?.user?.email || null,
      }

      const res = await fetch('/api/pedidos-ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || 'Error al crear pedido')

      toast.success('Pedido creado correctamente')
      onSuccess()
      handleClose()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setClienteId('')
    setBusquedaProducto('')
    setItems([])
    setShowHistorial(false)
    setShowPresupuestos(false)
    setFromPresupuesto(null)
    setMarcaFiltro(null)
    setCategoriaFiltro(null)
    setTabActiva('todos')
    setHistorialExpandido(null)
    setFormData({
      fecha_requerida: '',
      tipo_entrega: 'retiro',
      direccion_entrega: '',
      observaciones: '',
      sin_cargo: false,
      motivo_sin_cargo: '',
    })
    onOpenChange(false)
  }

  const formatCurrency = useFormatCurrency()

  // Render personalizado para opciones de cliente
  const renderClienteOption = (option: ComboboxOption, isSelected: boolean) => {
    const data = (option as ClienteComboboxOption).data
    const esLaboratorio = data?.tipo_entidad === 'laboratorio' ||
                          option.label.toLowerCase().includes('laboratorio') ||
                          option.label.toLowerCase().includes('lab ')

    return (
      <div className="flex items-start gap-3 flex-1 min-w-0 py-0.5">
        {/* Badge ID */}
        <span className="flex-shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-mono font-medium rounded">
          {option.badge}
        </span>
        {/* Info principal */}
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          {/* Nombre principal */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 truncate">{option.label}</span>
            {esLaboratorio && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded shrink-0">
                <FlaskConical className="h-3 w-3" />
                Lab
              </span>
            )}
          </div>
          {/* Info secundaria */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {data?.nombre && data.nombre !== option.label && (
              <span className="truncate">{data.nombre}</span>
            )}
            {data?.localidad && (
              <span className="flex items-center gap-0.5 shrink-0">
                <MapPin className="h-3 w-3" />
                {data.localidad}
              </span>
            )}
            {data?.cuit && !data?.nombre && (
              <span>CUIT: {data.cuit}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl p-0 gap-0",
        "sm:max-w-[1400px] w-[95vw] h-[90vh] flex flex-col overflow-hidden"
      )}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Nuevo Pedido
                  {fromPresupuesto && (
                    <Badge className="text-xs font-medium bg-blue-600 text-white border-0 px-2 py-0.5">
                      Desde presupuesto
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                  {items.length > 0 ? (
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{items.length} items</span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totales.total)}</span>
                    </span>
                  ) : (
                    'Selecciona cliente y agrega productos'
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Cliente selector en header */}
            <div className="flex items-center gap-2">
              {clienteId && presupuestosCliente && presupuestosCliente.length > 0 && (
                <Button
                  variant={showPresupuestos ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowPresupuestos(!showPresupuestos)
                    setShowHistorial(false)
                  }}
                  className="h-9 gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  Presupuestos ({presupuestosCliente.length})
                </Button>
              )}

              {clienteId && historialPedidos.length > 0 && (
                <Button
                  variant={showHistorial ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowHistorial(!showHistorial)
                    setShowPresupuestos(false)
                  }}
                  className="h-9 gap-1.5"
                >
                  <History className="h-4 w-4" />
                  Historial
                </Button>
              )}

              <div className="w-80">
                <SearchableCombobox
                  value={clienteId}
                  onValueChange={(value) => {
                    setClienteId(value)
                    setItems([])
                    setShowHistorial(false)
                    setShowPresupuestos(false)
                    setFromPresupuesto(null)
                    setMarcaFiltro(null)
                    setCategoriaFiltro(null)
                    setBusquedaProducto('')
                    setTabActiva('todos')
                  }}
                  searchFn={searchClientes}
                  placeholder="Buscar cliente por nombre, ID o CUIT..."
                  emptyMessage="No se encontraron clientes"
                  renderOption={renderClienteOption}
                />
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido principal */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Panel izquierdo: Búsqueda, Historial o Presupuestos */}
          <div className="w-[480px] border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden flex-shrink-0">
            {showPresupuestos ? (
              // Panel de presupuestos aprobados
              <>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Presupuestos Aprobados</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setShowPresupuestos(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    {presupuestosCliente?.map((pres: any) => (
                      <div
                        key={pres.id}
                        className={cn(
                          "p-4 border rounded-xl cursor-pointer transition-all",
                          fromPresupuesto === pres.id
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-800"
                            : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                        )}
                        onClick={() => handleLoadFromPresupuesto(pres)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{pres.numero}</span>
                          <Badge className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-0">aprobado</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(pres.fecha_emision).toLocaleDateString('es-AR')}
                          </span>
                          <span className="text-base font-bold text-blue-600 dark:text-blue-400">{formatCurrency(pres.total || 0)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 py-1.5 rounded-lg">
                          <ArrowRight className="h-3.5 w-3.5" />
                          Convertir a pedido
                        </div>
                      </div>
                    ))}
                    {(!presupuestosCliente || presupuestosCliente.length === 0) && (
                      <div className="text-center py-12 text-gray-400">
                        <div className="h-16 w-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-sm font-medium">Sin presupuestos aprobados</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : showHistorial ? (
              // Panel de historial con items expandibles
              <>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <History className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Últimos pedidos</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setShowHistorial(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    {historialPedidos.map(pedido => {
                      const isExpanded = historialExpandido === pedido.id
                      return (
                        <div
                          key={pedido.id}
                          className={cn(
                            "border rounded-xl transition-all",
                            isExpanded
                              ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700"
                          )}
                        >
                          {/* Header del pedido - clickeable para expandir */}
                          <div
                            className="p-3 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/20 rounded-t-xl"
                            onClick={() => setHistorialExpandido(isExpanded ? null : pedido.id)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <ChevronRight className={cn(
                                  "h-4 w-4 text-gray-400 transition-transform",
                                  isExpanded && "rotate-90"
                                )} />
                                <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">{pedido.numero}</span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {pedido.fecha_pedido ? new Date(pedido.fecha_pedido).toLocaleDateString('es-AR') : '-'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pl-6">
                              <Badge variant="outline" className="text-[11px] border-gray-200 dark:border-gray-700">
                                {pedido.items?.length || 0} items
                              </Badge>
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(pedido.total)}</span>
                            </div>
                          </div>

                          {/* Items expandidos */}
                          {isExpanded && pedido.items && pedido.items.length > 0 && (
                            <div className="border-t border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 rounded-b-xl">
                              <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                                {pedido.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 bg-white dark:bg-gray-900 rounded">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="font-mono text-gray-400 dark:text-gray-500 shrink-0">{item.codigo}</span>
                                      <span className="truncate text-gray-700 dark:text-gray-300">{item.nombre}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="text-gray-500">x{item.cantidad}</span>
                                      <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(item.precio_unitario)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="p-2 border-t border-amber-200 dark:border-amber-800">
                                <Button
                                  size="sm"
                                  className="w-full h-8 bg-amber-600 hover:bg-amber-700 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAddFromHistorial(pedido)
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5 mr-2" />
                                  Copiar todos al pedido
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </>
            ) : (
              // Panel de búsqueda con tabs
              <>
                {/* Tabs de selección */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <Tabs value={tabActiva} onValueChange={(v) => {
                    setTabActiva(v as 'todos' | 'insumos')
                    setBusquedaProducto('')
                    setMarcaFiltro(null)
                    setCategoriaFiltro(null)
                  }}>
                    <TabsList className="w-full h-10 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <TabsTrigger
                        value="todos"
                        className="flex-1 h-8 text-sm font-medium gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm"
                      >
                        <Search className="h-4 w-4" />
                        Buscar todos
                      </TabsTrigger>
                      <TabsTrigger
                        value="insumos"
                        className="flex-1 h-8 text-sm font-medium gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm"
                        disabled={!clienteId}
                      >
                        <Star className="h-4 w-4" />
                        Insumos
                        {insumosCount > 0 && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">
                            {insumosCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Barra de búsqueda solo para tab "Todos" */}
                {tabActiva === 'todos' && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        placeholder="Buscar por nombre o código..."
                        className="pl-11 h-11 text-base bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                        disabled={!clienteId}
                        autoFocus={!!clienteId}
                      />
                    </div>

                    {/* Filtros por categoría - siempre visibles cuando hay productos */}
                    {productos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-gray-400 font-medium self-center mr-1">Categoría:</span>
                        {categoriaFiltro && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-gray-500"
                            onClick={() => setCategoriaFiltro(null)}
                          >
                            Limpiar
                          </Button>
                        )}
                        {categoriasDisponibles.length > 0 ? (
                          categoriasDisponibles.slice(0, 5).map(({ categoria, count }) => (
                            <Button
                              key={categoria}
                              variant={categoriaFiltro === categoria ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "h-6 px-2 text-[10px] font-medium rounded-lg",
                                categoriaFiltro === categoria && "bg-emerald-600 hover:bg-emerald-700"
                              )}
                              onClick={() => setCategoriaFiltro(categoriaFiltro === categoria ? null : categoria)}
                            >
                              {categoria}
                              <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">
                                {count}
                              </Badge>
                            </Button>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-300 self-center">Sin categorías</span>
                        )}
                      </div>
                    )}

                    {/* Filtros por marca - siempre visibles cuando hay productos */}
                    {productos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-gray-400 font-medium self-center mr-1">Marca:</span>
                        {marcaFiltro && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-gray-500"
                            onClick={() => setMarcaFiltro(null)}
                          >
                            Limpiar
                          </Button>
                        )}
                        {marcasDisponibles.length > 0 ? (
                          marcasDisponibles.slice(0, 5).map(({ marca, count }) => (
                            <Button
                              key={marca}
                              variant={marcaFiltro === marca ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "h-6 px-2 text-[10px] font-medium rounded-lg",
                                marcaFiltro === marca && "bg-emerald-600 hover:bg-emerald-700"
                              )}
                              onClick={() => setMarcaFiltro(marcaFiltro === marca ? null : marca)}
                            >
                              {marca}
                              <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">
                                {count}
                              </Badge>
                            </Button>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-300 self-center">Sin marcas detectadas</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Filtros para tab "Insumos" */}
                {tabActiva === 'insumos' && productos.length > 0 && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2">
                    {/* Filtros por categoría */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-gray-400 font-medium self-center mr-1">Categoría:</span>
                      {categoriaFiltro && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-gray-500"
                          onClick={() => setCategoriaFiltro(null)}
                        >
                          Limpiar
                        </Button>
                      )}
                      {categoriasDisponibles.length > 0 ? (
                        categoriasDisponibles.slice(0, 5).map(({ categoria, count }) => (
                          <Button
                            key={categoria}
                            variant={categoriaFiltro === categoria ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-6 px-2 text-[10px] font-medium rounded-lg",
                              categoriaFiltro === categoria && "bg-emerald-600 hover:bg-emerald-700"
                            )}
                            onClick={() => setCategoriaFiltro(categoriaFiltro === categoria ? null : categoria)}
                          >
                            {categoria}
                            <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">
                              {count}
                            </Badge>
                          </Button>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-300 self-center">Sin categorías</span>
                      )}
                    </div>

                    {/* Filtros por marca */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-gray-400 font-medium self-center mr-1">Marca:</span>
                      {marcaFiltro && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-gray-500"
                          onClick={() => setMarcaFiltro(null)}
                        >
                          Limpiar
                        </Button>
                      )}
                      {marcasDisponibles.length > 0 ? (
                        marcasDisponibles.slice(0, 5).map(({ marca, count }) => (
                          <Button
                            key={marca}
                            variant={marcaFiltro === marca ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-6 px-2 text-[10px] font-medium rounded-lg",
                              marcaFiltro === marca && "bg-emerald-600 hover:bg-emerald-700"
                            )}
                            onClick={() => setMarcaFiltro(marcaFiltro === marca ? null : marca)}
                          >
                            {marca}
                            <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">
                              {count}
                            </Badge>
                          </Button>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-300 self-center">Sin marcas detectadas</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Indicador de filtros activos */}
                {(marcaFiltro || categoriaFiltro) && productos.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">
                      Mostrando {productosFiltrados.length} de {productos.length} productos
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-[10px] text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setMarcaFiltro(null)
                        setCategoriaFiltro(null)
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}

                <ScrollArea className="flex-1 h-0">
                  {!clienteId ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Selecciona un cliente</p>
                      <p className="text-xs text-gray-400 mt-1">para buscar productos</p>
                    </div>
                  ) : (loadingProductos || loadingInsumos) ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                    </div>
                  ) : tabActiva === 'todos' && busquedaProducto.length < 2 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Escribe para buscar</p>
                      <p className="text-xs text-gray-400 mt-1">Mínimo 2 caracteres</p>
                    </div>
                  ) : tabActiva === 'insumos' && productos.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <Star className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Sin insumos configurados</p>
                      <p className="text-xs text-gray-400 mt-1">Este cliente no tiene productos preferidos</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 text-emerald-600"
                        onClick={() => setTabActiva('todos')}
                      >
                        Buscar en todos los productos
                      </Button>
                    </div>
                  ) : productosFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Sin resultados</p>
                      {(marcaFiltro || categoriaFiltro) && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 text-emerald-600"
                          onClick={() => {
                            setMarcaFiltro(null)
                            setCategoriaFiltro(null)
                          }}
                        >
                          Quitar filtros
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {productosFiltrados.map(producto => {
                        const isAdded = items.some(i => i.producto_id === producto.id)
                        const cantidadEnPedido = items.find(i => i.producto_id === producto.id)?.cantidad || 0
                        const stockBajo = (producto.stock_actual || 0) < 10
                        const sinStock = (producto.stock_actual || 0) <= 0
                        const esFavorito = producto.es_favorito
                        return (
                          <div
                            key={producto.id}
                            className={cn(
                              "px-4 py-3 cursor-pointer transition-all group",
                              isAdded
                                ? "bg-emerald-50/80 dark:bg-emerald-900/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30 border-l-2 border-emerald-500"
                                : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent"
                            )}
                            onClick={() => handleAddItem(producto)}
                          >
                            {/* Fila superior: Nombre completo + Precio */}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-start gap-1.5 min-w-0">
                                {esFavorito && (
                                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                                )}
                                <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-snug">
                                  {producto.nombre}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isAdded && (
                                  <Badge className="text-[10px] h-5 px-1.5 bg-emerald-600 text-white border-0">
                                    {cantidadEnPedido}x
                                  </Badge>
                                )}
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(producto.precio_venta || 0)}
                                </span>
                              </div>
                            </div>
                            {/* Fila inferior: Código + Categoría badge + Marca + Stock */}
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                {producto.codigo}
                              </span>
                              {normalizarCategoria(producto.categoria) && (
                                <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-medium">
                                  {normalizarCategoria(producto.categoria)}
                                </span>
                              )}
                              {producto.marca_detectada && (
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{producto.marca_detectada}</span>
                              )}
                              {tabActiva === 'insumos' && producto.cantidad_habitual && (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Hab: {producto.cantidad_habitual}
                                </span>
                              )}
                              <span className="flex-1" />
                              <span className={cn(
                                "font-medium",
                                sinStock
                                  ? "text-red-500"
                                  : stockBajo
                                    ? "text-amber-600"
                                    : "text-gray-400"
                              )}>
                                {sinStock ? 'Sin stock' : producto.stock_actual}
                              </span>
                              {!isAdded && (
                                <Plus className="h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>

          {/* Panel derecho: Items del pedido */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-gray-900">
            {/* Header de tabla */}
            <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 grid grid-cols-[1fr_90px_110px_120px_44px] gap-3 text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
              <div>Producto / Descripción</div>
              <div className="text-center">Cant.</div>
              <div className="text-right">Precio</div>
              <div className="text-right">Subtotal</div>
              <div></div>
            </div>

            {/* Lista de items */}
            <ScrollArea className="flex-1 min-h-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <ShoppingCart className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-400">Pedido vacío</p>
                  <p className="text-sm mt-1 text-gray-300 dark:text-gray-500">Busca productos a la izquierda</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "px-6 py-3 grid grid-cols-[1fr_90px_110px_120px_44px] gap-3 items-center group transition-colors",
                        index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/20"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.nombre}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="font-mono">{item.codigo}</span>
                              {item.fuente && item.fuente !== 'producto_default' && (
                                <span
                                  className={cn(
                                    'inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium',
                                    item.fuente === 'override_fijo' && 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                                    item.fuente === 'override_margen' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                                    item.fuente === 'lista_margen' && 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
                                    item.fuente === 'manual' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                                  )}
                                  title={item.lista_nombre ? `Lista: ${item.lista_nombre}` : undefined}
                                >
                                  {item.fuente === 'override_fijo' && 'precio fijo'}
                                  {item.fuente === 'override_margen' && 'override %'}
                                  {item.fuente === 'lista_margen' && (item.lista_nombre || 'lista')}
                                  {item.fuente === 'manual' && 'manual'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => handleUpdateItem(item.id, 'cantidad', parseInt(e.target.value) || 0)}
                        className="h-9 text-center text-sm font-medium"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        value={item.precio_unitario}
                        onChange={(e) => handleUpdateItem(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        className="h-9 text-right text-sm font-medium"
                      />
                      <span className="text-sm font-semibold text-right text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.subtotal)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Totales */}
            <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 min-w-[240px] border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(totales.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>IVA 21%</span>
                  <span className="font-medium">{formatCurrency(totales.iva)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totales.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sin Cargo banner: visible cuando se activa. Explica el comportamiento.
            Aparece arriba del footer para que el operador no lo confunda con una
            configuración menor. */}
        {formData.sin_cargo && (
          <div className="px-6 py-3 border-t border-amber-200 bg-amber-50 dark:bg-amber-950/30 flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase mt-1">
                Sin cargo
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Motivo (obligatorio) — ej: Reposición por error, Garantía equipo #X, Cortesía"
                  value={formData.motivo_sin_cargo}
                  onChange={(e) => setFormData({ ...formData, motivo_sin_cargo: e.target.value })}
                  className="h-9 text-sm bg-white dark:bg-gray-900"
                  autoFocus
                />
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  No se facturará a AFIP. Genera remito interno sin cargo. El stock se descarga normalmente y no afecta cuenta corriente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {items.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-gray-500">Entrega:</Label>
                  <Select
                    value={formData.tipo_entrega}
                    onValueChange={(value) => setFormData({ ...formData, tipo_entrega: value })}
                  >
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retiro">Retiro en local</SelectItem>
                      <SelectItem value="envio">Envío</SelectItem>
                      <SelectItem value="transporte">Transporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-gray-500">Fecha:</Label>
                  <Input
                    type="date"
                    value={formData.fecha_requerida}
                    onChange={(e) => setFormData({ ...formData, fecha_requerida: e.target.value })}
                    className="w-36 h-9 text-sm"
                  />
                </div>
                {/* Sin cargo toggle — reemplaza el hack histórico de facturar a
                    "X SIN CARGO" cliente fantasma. Motivo obligatorio por constraint
                    chk_pedidos_sin_cargo_motivo (migración 887). */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.sin_cargo}
                    onChange={(e) => setFormData({
                      ...formData,
                      sin_cargo: e.target.checked,
                      motivo_sin_cargo: e.target.checked ? formData.motivo_sin_cargo : '',
                    })}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <Label className="text-xs font-medium text-gray-600 cursor-pointer">
                    Sin cargo
                  </Label>
                </label>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !clienteId || items.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!clienteId ? "Selecciona un cliente" : items.length === 0 ? "Agrega productos" : "Crear Pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
