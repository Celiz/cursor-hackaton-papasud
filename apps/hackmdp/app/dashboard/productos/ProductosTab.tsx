'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { GenericDataTable } from "@/components/core-ui/GenericDataTable"
import { FacturarProductosDialog } from "@/components/core-ui/FacturarProductosDialog"
import { StockAlertsDialog } from "@/components/core-ui/StockAlertsDialog"
import { columnsProductos } from "./columns"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Receipt, AlertTriangle, Package, Wrench, FlaskConical, Monitor, ShoppingBag } from 'lucide-react'
import { Producto, Cliente, Proveedor } from '@/lib/types'
import { useUserPermissions } from '@/lib/hooks/use-user-permissions'
import { ProductoDetailSheet } from '@/components/core-ui/ProductoDetailSheet'
import { ProductoFormDialog } from '@/components/core-ui/ProductoFormDialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PaginatedResponse {
  data: Producto[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos')
  return data
}

interface ProductosStats {
  stats: Record<string, number>
  categories: Array<{ name: string; count: number }>
}

// Categorías principales que se muestran como pestañas individuales
const mainCategories = [
  "Repuesto Nuevo",
  "Diagnostico In Vitro",
  "Equipo Nuevo",
  "Consumible",
  "Descartables",
  "Veterinaria",
]

// Categorías que se agrupan en "Otros"
const otherCategories = [
  "Servicio técnico",
  "General",
  "Equipo Usado",
  "Módulo",
  "Alquiler equipos",
  "Repuesto Reparado",
  "Software",
]

// Opciones fijas del filtro de estado de stock (valores que entiende la API).
const ESTADO_STOCK_OPTIONS = [
  { value: 'con_stock', label: 'Con stock' },
  { value: 'sin_stock', label: 'Sin stock' },
  { value: 'bajo_minimo', label: 'Bajo mínimo' },
]

// Tipo derivado de la categoría (la API lo resuelve con el param `tipo`).
const TIPO_OPTIONS = [
  { value: 'equipo', label: 'Equipo' },
  { value: 'insumo', label: 'Insumo' },
]

// Áreas de análisis (deben coincidir con las que setea el script de clasificación).
const LINEA_OPTIONS = [
  { value: 'Hematología', label: 'Hematología' },
  { value: 'Química clínica', label: 'Química clínica' },
  { value: 'Iones/ISE', label: 'Iones/ISE' },
  { value: 'Coagulación', label: 'Coagulación' },
  { value: 'Inmunología/Serología', label: 'Inmunología/Serología' },
  { value: 'Endocrino/Hormonas', label: 'Endocrino/Hormonas' },
  { value: 'Uroanálisis', label: 'Uroanálisis' },
  { value: 'Microbiología', label: 'Microbiología' },
  { value: 'General', label: 'General' },
]

// Map de iconos y colores por categoría
const categoryConfig: Record<string, { icon: React.ElementType; color: string; shortName: string }> = {
  "Repuesto Nuevo": {
    icon: Wrench,
    color: "amber",
    shortName: "Repuestos"
  },
  "Diagnostico In Vitro": {
    icon: FlaskConical,
    color: "purple",
    shortName: "In Vitro"
  },
  "Equipo Nuevo": {
    icon: Monitor,
    color: "blue",
    shortName: "Equipos Nuevos"
  },
  "Consumible": {
    icon: ShoppingBag,
    color: "green",
    shortName: "Consumibles"
  },
  "Descartables": {
    icon: Package,
    color: "cyan",
    shortName: "Descartables"
  },
  "Veterinaria": {
    icon: Package,
    color: "rose",
    shortName: "Veterinaria"
  },
}

// Función para obtener estilos de color
const getColorStyles = (color: string, isActive: boolean) => {
  const colors: Record<string, { active: string; inactive: string; badge: string }> = {
    amber: {
      active: "bg-amber-500 text-white border-amber-500",
      inactive: "bg-white text-amber-700 border-amber-300 hover:border-amber-400 hover:bg-amber-50 dark:bg-gray-800 dark:text-amber-400 dark:border-amber-700",
      badge: isActive ? "bg-white/20" : "bg-amber-100 dark:bg-amber-900/30"
    },
    purple: {
      active: "bg-purple-500 text-white border-purple-500",
      inactive: "bg-white text-purple-700 border-purple-300 hover:border-purple-400 hover:bg-purple-50 dark:bg-gray-800 dark:text-purple-400 dark:border-purple-700",
      badge: isActive ? "bg-white/20" : "bg-purple-100 dark:bg-purple-900/30"
    },
    blue: {
      active: "bg-blue-500 text-white border-blue-500",
      inactive: "bg-white text-blue-700 border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-700",
      badge: isActive ? "bg-white/20" : "bg-blue-100 dark:bg-blue-900/30"
    },
    green: {
      active: "bg-green-500 text-white border-green-500",
      inactive: "bg-white text-green-700 border-green-300 hover:border-green-400 hover:bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-700",
      badge: isActive ? "bg-white/20" : "bg-green-100 dark:bg-green-900/30"
    },
    cyan: {
      active: "bg-cyan-500 text-white border-cyan-500",
      inactive: "bg-white text-cyan-700 border-cyan-300 hover:border-cyan-400 hover:bg-cyan-50 dark:bg-gray-800 dark:text-cyan-400 dark:border-cyan-700",
      badge: isActive ? "bg-white/20" : "bg-cyan-100 dark:bg-cyan-900/30"
    },
    rose: {
      active: "bg-rose-500 text-white border-rose-500",
      inactive: "bg-white text-rose-700 border-rose-300 hover:border-rose-400 hover:bg-rose-50 dark:bg-gray-800 dark:text-rose-400 dark:border-rose-700",
      badge: isActive ? "bg-white/20" : "bg-rose-100 dark:bg-rose-900/30"
    },
    indigo: {
      active: "bg-indigo-500 text-white border-indigo-500",
      inactive: "bg-white text-indigo-700 border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50 dark:bg-gray-800 dark:text-indigo-400 dark:border-indigo-700",
      badge: isActive ? "bg-white/20" : "bg-indigo-100 dark:bg-indigo-900/30"
    },
    slate: {
      active: "bg-slate-500 text-white border-slate-500",
      inactive: "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:bg-gray-800 dark:text-slate-400 dark:border-slate-700",
      badge: isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-900/30"
    },
    teal: {
      active: "bg-teal-500 text-white border-teal-500",
      inactive: "bg-white text-teal-700 border-teal-300 hover:border-teal-400 hover:bg-teal-50 dark:bg-gray-800 dark:text-teal-400 dark:border-teal-700",
      badge: isActive ? "bg-white/20" : "bg-teal-100 dark:bg-teal-900/30"
    },
    orange: {
      active: "bg-orange-500 text-white border-orange-500",
      inactive: "bg-white text-orange-700 border-orange-300 hover:border-orange-400 hover:bg-orange-50 dark:bg-gray-800 dark:text-orange-400 dark:border-orange-700",
      badge: isActive ? "bg-white/20" : "bg-orange-100 dark:bg-orange-900/30"
    },
    yellow: {
      active: "bg-yellow-500 text-white border-yellow-500",
      inactive: "bg-white text-yellow-700 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50 dark:bg-gray-800 dark:text-yellow-400 dark:border-yellow-700",
      badge: isActive ? "bg-white/20" : "bg-yellow-100 dark:bg-yellow-900/30"
    },
    violet: {
      active: "bg-violet-500 text-white border-violet-500",
      inactive: "bg-white text-violet-700 border-violet-300 hover:border-violet-400 hover:bg-violet-50 dark:bg-gray-800 dark:text-violet-400 dark:border-violet-700",
      badge: isActive ? "bg-white/20" : "bg-violet-100 dark:bg-violet-900/30"
    },
    gray: {
      active: "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white",
      inactive: "bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
      badge: isActive ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700"
    }
  }
  return colors[color] || colors.gray
}

export default function ProductosPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Solo-lectura: si el usuario no puede 'editar' productos (modulos_solo_lectura),
  // se ocultan crear/editar/eliminar/facturar y queda solo vista.
  const { hasPermission } = useUserPermissions()
  const canEditProductos = hasPermission('productos', 'editar')
  const [categoria, setCategoria] = useState<string>("todos")

  // Paginación state
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedProveedores, setSelectedProveedores] = useState<string[]>([])
  const [selectedDepositos, setSelectedDepositos] = useState<string[]>([])
  const [selectedEstadoStock, setSelectedEstadoStock] = useState<string[]>([])
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([])
  const [selectedTipo, setSelectedTipo] = useState<string[]>([])
  const [selectedLineas, setSelectedLineas] = useState<string[]>([])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [categoria, debouncedSearch, selectedProveedores, selectedDepositos, selectedEstadoStock, selectedCategorias, selectedTipo, selectedLineas])

  // Click en un tab de categoría: limpia el embudo de categoría del header
  // (los tabs y el embudo comparten la misma fuente de verdad).
  const onTabCategoria = (c: string) => {
    setCategoria(c)
    setSelectedCategorias([])
  }

  // Fetch stats for filter counts
  const { data: statsData, mutate: mutateStats } = useSWR<ProductosStats>('/api/productos/stats', fetcher)

  // Detectar si es org con categorías propias (no electromedicina)
  const isDynamicCategories = useMemo(() => {
    if (!statsData?.categories || statsData.categories.length === 0) return false
    // Si ninguna categoría matchea las de electromedicina, usar modo dinámico
    return !statsData.categories.some(cat =>
      mainCategories.includes(cat.name) || otherCategories.includes(cat.name)
    )
  }, [statsData])

  // Colores rotativos para categorías dinámicas
  const dynamicColors = ['amber', 'purple', 'blue', 'green', 'cyan', 'rose', 'teal', 'orange', 'indigo', 'violet']

  // Calcular stats de "Otros" sumando las categorías agrupadas
  const otrosCount = useMemo(() => {
    if (!statsData?.categories) return 0
    return statsData.categories
      .filter(cat => otherCategories.includes(cat.name))
      .reduce((sum, cat) => sum + cat.count, 0)
  }, [statsData])

  // Build API URL with pagination and filters
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    }
    // Filtros server-side (multi-select). Van antes del branching de categoría
    // para que apliquen en todas las ramas.
    selectedProveedores.forEach(nombre => params.append('proveedor', nombre))
    selectedDepositos.forEach(id => params.append('deposito_id', id))
    selectedEstadoStock.forEach(v => params.append('estado_stock', v))
    selectedLineas.forEach(l => params.append('linea_analisis', l))
    // tipo (equipo|insumo): la API toma uno solo; con 0 o 2 no filtra.
    if (selectedTipo.length === 1) params.set('tipo', selectedTipo[0])

    // Categoría: el embudo del header (multi-select) tiene precedencia sobre
    // los tabs de arriba. Una sola fuente de verdad.
    if (selectedCategorias.length > 0) {
      selectedCategorias.forEach(c => params.append('categoria', c))
      return `/api/productos?${params.toString()}`
    }

    if (categoria === "todos") {
      return `/api/productos?${params.toString()}`
    }
    if (categoria === "otros" && !isDynamicCategories) {
      // Para "otros", usamos múltiples categorías (solo electromedicina)
      const catParams = otherCategories.map(c => `categoria=${encodeURIComponent(c)}`).join('&')
      return `/api/productos?${params.toString()}&${catParams}`
    }
    params.set('categoria', categoria)
    return `/api/productos?${params.toString()}`
  }, [page, pageSize, categoria, debouncedSearch, isDynamicCategories, selectedProveedores, selectedDepositos, selectedEstadoStock, selectedCategorias, selectedTipo, selectedLineas])

  const { data: response, error, isLoading, mutate } = useSWR<PaginatedResponse>(
    buildApiUrl(),
    fetcher,
    { keepPreviousData: true }
  )
  const { data: clientes } = useSWR<Cliente[]>('/api/clientes?view=principal', fetcher)
  const { data: proveedores } = useSWR<Proveedor[]>('/api/proveedores', fetcher)

  const productos = response?.data || []
  const pagination = response?.pagination

  // Obtener proveedores únicos para el filtro facetado
  const proveedorOptions = useMemo(() => {
    if (!proveedores || proveedores.length === 0) return []
    return proveedores
      .filter(p => p.nombre)
      .map(p => ({ value: p.nombre, label: p.nombre }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [proveedores])

  // Opciones de depósito (value = id, label = nombre) para el filtro del header.
  const { data: depositosRaw } = useSWR<any>('/api/inventario/depositos', fetcher)
  const depositoOptions = useMemo(() => {
    const list = Array.isArray(depositosRaw) ? depositosRaw : (depositosRaw?.data ?? [])
    return list
      .filter((d: any) => d?.id && d?.nombre)
      .map((d: any) => ({ value: String(d.id), label: d.nombre }))
  }, [depositosRaw])

  // Opciones de categoría para el embudo del header (las 14 categorías con stats).
  const categoriaOptions = useMemo(() => {
    const cats = statsData?.categories ?? []
    return cats
      .filter(c => c.name)
      .map(c => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [statsData])

  // Config de los filtros que se muestran en el header de cada columna.
  // Memoizado para no recomputar las columnas de la tabla en cada render.
  const headerFilters = useMemo(() => [
    {
      columnId: 'categoria',
      title: 'Categoría',
      options: categoriaOptions,
      selectedValues: selectedCategorias,
      // El embudo de categoría manda sobre los tabs: al elegir, pone tabs en "Todos".
      onChange: (vals: string[]) => {
        setSelectedCategorias(vals)
        if (vals.length > 0) setCategoria('todos')
      },
    },
    {
      columnId: 'proveedor_nombre',
      title: 'Proveedor',
      options: proveedorOptions,
      selectedValues: selectedProveedores,
      onChange: setSelectedProveedores,
    },
    {
      columnId: 'deposito_nombre',
      title: 'Depósito',
      options: depositoOptions,
      selectedValues: selectedDepositos,
      onChange: setSelectedDepositos,
    },
    {
      columnId: 'stock_actual',
      title: 'Stock',
      options: ESTADO_STOCK_OPTIONS,
      selectedValues: selectedEstadoStock,
      onChange: setSelectedEstadoStock,
    },
    {
      columnId: 'tipo_derivado',
      title: 'Tipo',
      options: TIPO_OPTIONS,
      selectedValues: selectedTipo,
      onChange: setSelectedTipo,
    },
    {
      columnId: 'linea_analisis',
      title: 'Área',
      options: LINEA_OPTIONS,
      selectedValues: selectedLineas,
      onChange: setSelectedLineas,
    },
  ], [categoriaOptions, selectedCategorias, proveedorOptions, selectedProveedores, depositoOptions, selectedDepositos, selectedEstadoStock, selectedTipo, selectedLineas])

  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [facturarDialogOpen, setFacturarDialogOpen] = useState(false)
  const [stockAlertsOpen, setStockAlertsOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const previousIdRef = useRef<string | null>(null)

  // Handle URL parameter to open specific producto or action
  useEffect(() => {
    const productoId = searchParams.get('id')
    const action = searchParams.get('action')

    // Handle ?action=new to open create dialog
    if (action === 'new') {
      handleCreate()
      router.replace('?', { scroll: false })
      return
    }

    if (productoId && productoId !== previousIdRef.current && productos.length > 0) {
      const producto = productos.find((p: Producto) => p.id.toString() === productoId)
      if (producto) {
        setSelectedProducto(producto)
        setDetailSheetOpen(true)
        previousIdRef.current = productoId
      }
    } else if (!productoId && previousIdRef.current) {
      previousIdRef.current = null
    }
  }, [searchParams, productos, router])

  // Refresh both data and stats
  const handleRefresh = useCallback(() => {
    mutate()
    mutateStats()
  }, [mutate, mutateStats])

  const handleRowClick = (producto: Producto) => {
    setSelectedProducto(producto)
    setDetailSheetOpen(true)
    router.push(`?id=${producto.id}`)
  }

  const handleCreate = () => {
    setEditingProducto(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (product: Producto) => {
    setEditingProducto(product)
    setFormDialogOpen(true)
  }

  const handleDelete = async (product: Producto) => {
    if (!confirm(`¿Eliminar "${product.nombre}"?`)) return
    try {
      const res = await fetch(`/api/productos?id=${product.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar')
      toast.success('Producto eliminado')
      handleRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar producto')
    }
  }

  // Calcular alertas de stock (de la página actual)
  const stockAlerts = useMemo(() => {
    if (!productos || productos.length === 0) {
      return { total: 0, sinStock: 0, stockBajo: 0 }
    }

    const sinStock = productos.filter((p: Producto) => (p.stock_actual ?? 0) <= 0).length
    const stockBajo = productos.filter(
      (p: Producto) => p.stock_minimo && (p.stock_actual ?? 0) > 0 && (p.stock_actual ?? 0) <= p.stock_minimo
    ).length

    return { total: sinStock + stockBajo, sinStock, stockBajo }
  }, [productos])

  // Get description based on category
  const getPageDescription = () => {
    if (categoria === "todos") {
      return "Gestiona los productos de tu empresa."
    }
    if (categoria === "otros") {
      return "Otros productos: servicio técnico, equipos usados, módulos, alquiler, etc."
    }
    const config = categoryConfig[categoria]
    return config ? `Productos de la categoría ${config.shortName}.` : `Productos de la categoría ${categoria}.`
  }

  if (error) return <div>Failed to load</div>

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-hidden">
        {/* Filtros de categorías */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">Filtrar por:</span>

            {/* Todos */}
            <button
              onClick={() => onTabCategoria("todos")}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                categoria === "todos"
                  ? getColorStyles("gray", true).active
                  : getColorStyles("gray", false).inactive
              )}
            >
              <Package className="h-4 w-4" />
              Todos
              {statsData && (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  getColorStyles("gray", categoria === "todos").badge
                )}>
                  {statsData.stats.total || 0}
                </span>
              )}
            </button>

            {isDynamicCategories ? (
              /* Categorías dinámicas */
              <>
                {statsData?.categories.filter(c => c.count > 0).map((cat, idx) => {
                  const color = dynamicColors[idx % dynamicColors.length]
                  const isActive = categoria === cat.name
                  const styles = getColorStyles(color, isActive)

                  return (
                    <button
                      key={cat.name}
                      onClick={() => onTabCategoria(cat.name)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                        isActive ? styles.active : styles.inactive
                      )}
                    >
                      <Package className="h-4 w-4" />
                      {cat.name}
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        styles.badge
                      )}>
                        {cat.count}
                      </span>
                    </button>
                  )
                })}
              </>
            ) : (
              /* Categorías hardcodeadas (electromedicina) */
              <>
                {mainCategories.map((catName) => {
                  const config = categoryConfig[catName]
                  if (!config) return null
                  const catStats = statsData?.categories.find(c => c.name === catName)
                  if (!catStats) return null

                  const Icon = config.icon
                  const isActive = categoria === catName
                  const styles = getColorStyles(config.color, isActive)

                  return (
                    <button
                      key={catName}
                      onClick={() => onTabCategoria(catName)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                        isActive ? styles.active : styles.inactive
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {config.shortName}
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        styles.badge
                      )}>
                        {catStats.count}
                      </span>
                    </button>
                  )
                })}

                {/* Otros button */}
                {otrosCount > 0 && (
                  <button
                    onClick={() => onTabCategoria("otros")}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                      categoria === "otros"
                        ? getColorStyles("slate", true).active
                        : getColorStyles("slate", false).inactive
                    )}
                  >
                    <Package className="h-4 w-4" />
                    Otros
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      getColorStyles("slate", categoria === "otros").badge
                    )}>
                      {otrosCount}
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <GenericDataTable
          columns={columnsProductos}
          data={productos}
          isLoading={isLoading}
          pageTitle="Productos"
          pageDescription={getPageDescription()}
          searchPlaceholder="Buscar por nombre o código..."
          enableGlobalSearch={false}
          columnHeaderFilters={headerFilters}
          additionalActions={
            <>
              {stockAlerts.total > 0 && (
                <Button
                  onClick={() => setStockAlertsOpen(true)}
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                  iconLeft={<AlertTriangle className="h-4 w-4" />}
                >
                  <span className="flex items-center gap-2">
                    Alertas de Stock
                    <Badge className="bg-orange-600 text-white">{stockAlerts.total}</Badge>
                  </span>
                </Button>
              )}
              {canEditProductos && (
                <Button onClick={() => setFacturarDialogOpen(true)} variant="outline" iconLeft={<Receipt className="h-4 w-4" />}>
                  Facturar Productos
                </Button>
              )}
            </>
          }
          onNew={canEditProductos ? handleCreate : undefined}
          newLabel="Nuevo Producto"
          onRowClick={handleRowClick}
          onEdit={canEditProductos ? handleEdit : undefined}
          onDelete={canEditProductos ? handleDelete : undefined}
          onRefresh={handleRefresh}
          // Paginación server-side
          serverSidePagination={{
            page,
            pageSize,
            totalCount: pagination?.totalCount || 0,
            totalPages: pagination?.totalPages || 1,
            onPageChange: setPage,
          }}
          // Search server-side
          onServerSearch={setSearchTerm}
          serverSearchValue={searchTerm}
        />
      </div>

      {selectedProducto && (
        <ProductoDetailSheet
          producto={selectedProducto}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          onEdit={canEditProductos ? handleEdit : undefined}
          onDelete={canEditProductos ? handleDelete : undefined}
        />
      )}

      <FacturarProductosDialog
        open={facturarDialogOpen}
        onOpenChange={setFacturarDialogOpen}
        productos={productos || []}
        clientes={clientes || []}
        onSuccess={() => {
          toast.success('Factura generada exitosamente')
          handleRefresh()
        }}
      />

      <StockAlertsDialog
        open={stockAlertsOpen}
        onOpenChange={setStockAlertsOpen}
        productos={productos || []}
        onViewProduct={(producto) => {
          setSelectedProducto(producto)
          setDetailSheetOpen(true)
          router.push(`?id=${producto.id}`)
        }}
      />

      <ProductoFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        producto={editingProducto}
        onSuccess={handleRefresh}
      />
    </>
  )
}
