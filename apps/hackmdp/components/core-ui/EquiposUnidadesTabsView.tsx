'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { EquipoUnidad } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Box,
  Microscope,
  FlaskConical,
  Thermometer,
  Printer,
  Battery,
  Scale,
  Droplets,
  Gauge,
  Zap,
  MoreHorizontal,
  Building2,
  MapPin,
  Hash,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Search,
  X,
  ChevronDown,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// Iconos por tipo de equipo (normalizados a minúsculas para matching)
const TIPO_ICONS: Record<string, React.ReactNode> = {
  'autoanalizador': <FlaskConical className="h-4 w-4" />,
  'contador hematológico': <Droplets className="h-4 w-4" />,
  'analizador de electrolitos': <Zap className="h-4 w-4" />,
  'analizador de gases en sangre': <Gauge className="h-4 w-4" />,
  'analizador de orina': <Droplets className="h-4 w-4" />,
  'microscopio': <Microscope className="h-4 w-4" />,
  'centrífuga': <Gauge className="h-4 w-4" />,
  'microcentrífuga': <Gauge className="h-4 w-4" />,
  'autoclave': <Thermometer className="h-4 w-4" />,
  'balanza de precisión': <Scale className="h-4 w-4" />,
  'baño termostático': <Thermometer className="h-4 w-4" />,
  'estufa de cultivo': <Thermometer className="h-4 w-4" />,
  'estufa de esterilización': <Thermometer className="h-4 w-4" />,
  'impresora': <Printer className="h-4 w-4" />,
  'ups': <Battery className="h-4 w-4" />,
  'espectrofotómetro': <Zap className="h-4 w-4" />,
  'coagulómetro': <Droplets className="h-4 w-4" />,
  'agitador': <Gauge className="h-4 w-4" />,
  'agitador de plaquetas': <Gauge className="h-4 w-4" />,
  'pipeta automática': <FlaskConical className="h-4 w-4" />,
  'equipamiento general': <Box className="h-4 w-4" />,
  'destilador': <Droplets className="h-4 w-4" />,
  'lector de placas': <FlaskConical className="h-4 w-4" />,
  'lavador de placas': <FlaskConical className="h-4 w-4" />,
  'hematología': <Droplets className="h-4 w-4" />,
  'electrocardiográfo': <Zap className="h-4 w-4" />,
  'desfibrilador': <Zap className="h-4 w-4" />,
  'electrobisturí': <Zap className="h-4 w-4" />,
  'monitor multiparamétrico': <Gauge className="h-4 w-4" />,
  'quimioluminiscencia': <FlaskConical className="h-4 w-4" />,
}

// Colores por tipo
const TIPO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'autoanalizador': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'contador hematológico': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'analizador de electrolitos': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'analizador de gases en sangre': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'analizador de orina': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'microscopio': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'centrífuga': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'microcentrífuga': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'autoclave': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'balanza de precisión': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'baño termostático': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'estufa de cultivo': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'estufa de esterilización': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'impresora': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'ups': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'espectrofotómetro': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  'coagulómetro': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'agitador': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  'agitador de plaquetas': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  'pipeta automática': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'equipamiento general': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  'destilador': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'lector de placas': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  'lavador de placas': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  'hematología': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'electrocardiográfo': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'desfibrilador': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'electrobisturí': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'monitor multiparamétrico': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'quimioluminiscencia': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
}

const DEFAULT_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }

interface EquiposUnidadesTabsViewProps {
  equipos: EquipoUnidad[]
  onRowClick: (equipo: EquipoUnidad) => void
  onEdit?: (equipo: EquipoUnidad) => void
  onDelete?: (equipo: EquipoUnidad) => void
  categoriaFiltro?: string
}

export function EquiposUnidadesTabsView({
  equipos,
  onRowClick,
  onEdit,
  onDelete,
  categoriaFiltro,
}: EquiposUnidadesTabsViewProps) {
  // En stock: no mostrar cliente/laboratorio (siempre vacíos), mostrar depósito y fecha compra
  const isStockView = categoriaFiltro === 'en_stock'
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null)
  const [tipoSearchOpen, setTipoSearchOpen] = useState(false)
  const [equipoSearch, setEquipoSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  // Agrupar equipos por tipo
  const equiposPorTipo = useMemo(() => {
    const grouped: Record<string, EquipoUnidad[]> = {}

    equipos.forEach(equipo => {
      const tipo = equipo.equipos?.tipo || 'Sin tipo'
      if (!grouped[tipo]) {
        grouped[tipo] = []
      }
      grouped[tipo].push(equipo)
    })

    // Ordenar por cantidad descendente
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)
    return sorted
  }, [equipos])

  // null = todos, string = tipo específico
  const activeTipo = selectedTipo

  // Si activeTipo es null, mostrar todos los equipos
  const activeEquiposBase = useMemo(() => {
    if (activeTipo === null) return equipos
    return equiposPorTipo.find(([tipo]) => tipo === activeTipo)?.[1] || []
  }, [activeTipo, equipos, equiposPorTipo])

  // Filtrar y ordenar equipos por marca+modelo para agrupar mismos modelos juntos
  const activeEquipos = useMemo(() => {
    let filtered = activeEquiposBase
    if (equipoSearch.trim()) {
      const search = equipoSearch.toLowerCase()
      filtered = filtered.filter(e =>
        e.numero_serie?.toLowerCase().includes(search) ||
        e.equipos?.marca?.toLowerCase().includes(search) ||
        e.equipos?.modelo?.toLowerCase().includes(search) ||
        e.clientes?.nombre?.toLowerCase().includes(search) ||
        e.laboratorios?.nombre?.toLowerCase().includes(search)
      )
    }
    // Ordenar por marca+modelo+serie para agrupar mismos modelos
    return [...filtered].sort((a, b) => {
      const marcaA = (a.equipos?.marca || '').toLowerCase()
      const marcaB = (b.equipos?.marca || '').toLowerCase()
      if (marcaA !== marcaB) return marcaA.localeCompare(marcaB)
      const modeloA = (a.equipos?.modelo || '').toLowerCase()
      const modeloB = (b.equipos?.modelo || '').toLowerCase()
      if (modeloA !== modeloB) return modeloA.localeCompare(modeloB)
      return (a.numero_serie || '').localeCompare(b.numero_serie || '')
    })
  }, [activeEquiposBase, equipoSearch])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [selectedTipo, equipoSearch, pageSize])

  // Paginated slice
  const totalCount = activeEquipos.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pagedEquipos = useMemo(() => {
    const start = safePage * pageSize
    return activeEquipos.slice(start, start + pageSize)
  }, [activeEquipos, safePage, pageSize])

  const getIcon = (tipo: string) => {
    const normalizedTipo = tipo.toLowerCase()
    return TIPO_ICONS[normalizedTipo] || <Box className="h-4 w-4" />
  }

  const getColor = (tipo: string) => {
    const normalizedTipo = tipo.toLowerCase()
    return TIPO_COLORS[normalizedTipo] || DEFAULT_COLOR
  }

  // Virtualizer setup
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: pagedEquipos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // Row height
    overscan: 10,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Buscadores de tipo y equipo */}
      <div className="border-b bg-white dark:bg-gray-950 sticky top-0 z-10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de tipo con búsqueda */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Tipo:</span>
            <Popover open={tipoSearchOpen} onOpenChange={setTipoSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tipoSearchOpen}
                  className={cn(
                    "w-[280px] justify-between font-normal",
                    activeTipo && getColor(activeTipo).text
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {activeTipo ? (
                      <span className={getColor(activeTipo).text}>
                        {getIcon(activeTipo)}
                      </span>
                    ) : (
                      <Box className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{activeTipo || 'Todos los tipos'}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Badge variant="secondary" className="text-xs px-1.5">
                      {activeEquiposBase.length}
                    </Badge>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar tipo de equipo..." />
                  <CommandList>
                    <CommandEmpty>No se encontró ningún tipo.</CommandEmpty>
                    <CommandGroup>
                      {/* Opción "Todos" */}
                      <CommandItem
                        value="__todos__"
                        onSelect={() => {
                          setSelectedTipo(null)
                          setTipoSearchOpen(false)
                          setEquipoSearch('')
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Todos los tipos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {equipos.length}
                          </Badge>
                          {activeTipo === null && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </CommandItem>
                      {equiposPorTipo.map(([tipo, items]) => {
                        const color = getColor(tipo)
                        return (
                          <CommandItem
                            key={tipo}
                            value={tipo}
                            onSelect={() => {
                              setSelectedTipo(tipo)
                              setTipoSearchOpen(false)
                              setEquipoSearch('')
                            }}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className={color.text}>{getIcon(tipo)}</span>
                              <span>{tipo}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {items.length}
                              </Badge>
                              {tipo === activeTipo && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {/* Botón para limpiar filtro de tipo */}
            {activeTipo !== null && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setSelectedTipo(null)
                  setEquipoSearch('')
                }}
                title="Ver todos los tipos"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Separador */}
          <div className="h-8 w-px bg-border" />

          {/* Buscador de equipo específico */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-sm text-muted-foreground font-medium">Buscar:</span>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Serie, marca, modelo, cliente..."
                value={equipoSearch}
                onChange={(e) => setEquipoSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {equipoSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setEquipoSearch('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {equipoSearch && (
              <span className="text-xs text-muted-foreground">
                {activeEquipos.length} de {activeEquiposBase.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTipo ?? '__all__'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* Info del tipo - compacto */}
            <div className="px-3 py-1.5 flex items-center gap-2 border-b bg-gray-50/50 dark:from-gray-900/50 shrink-0">
              <span className={activeTipo ? getColor(activeTipo).text : 'text-gray-500'}>
                {activeTipo ? getIcon(activeTipo) : <Box className="h-3.5 w-3.5" />}
              </span>
              <span className="text-sm font-semibold truncate">{activeTipo || 'Todas las unidades'}</span>
              <span className="text-xs text-muted-foreground">
                {activeEquipos.length} unidades
              </span>
            </div>

              {/* Virtualized table */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Table header - fixed */}
                <div className="flex items-center border-b bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm shrink-0">
                  {isStockView ? (
                    <div className="flex-1 grid grid-cols-[120px_1fr_150px_120px_80px_40px] gap-1 px-3 py-1.5">
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Serie</span>
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Equipo</span>
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Depósito</span>
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Fecha compra</span>
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Estado</span>
                      <span></span>
                    </div>
                  ) : (
                    <div className="flex-1 grid grid-cols-[100px_1fr_1fr_1fr_80px_40px] gap-1 px-3 py-1.5">
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Serie</span>
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Equipo</span>
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Cliente</span>
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Laboratorio</span>
                      <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">Estado</span>
                      <span></span>
                    </div>
                  )}
                </div>

                {/* Virtualized rows */}
                <div
                  ref={parentRef}
                  className="flex-1 overflow-auto"
                >
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const equipo = pagedEquipos[virtualRow.index]
                      return (
                        <div
                          key={equipo.id}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors border-b border-gray-50 dark:border-gray-800/50"
                          onClick={() => onRowClick(equipo)}
                        >
                          <div className={cn(
                            "flex-1 grid gap-1 px-3 items-center",
                            isStockView
                              ? "grid-cols-[120px_1fr_150px_120px_80px_40px]"
                              : "grid-cols-[100px_1fr_1fr_1fr_80px_40px]"
                          )}>
                            {/* N° Serie */}
                            <span className="font-mono text-xs font-medium truncate text-muted-foreground">
                              {equipo.numero_serie}
                            </span>

                            {/* Equipo - una línea */}
                            <span className="text-xs font-medium truncate">
                              {equipo.equipos?.marca} {equipo.equipos?.modelo}
                            </span>

                            {isStockView ? (
                              <>
                                {/* Depósito */}
                                <span className="text-xs truncate">
                                  {(equipo as any).deposito?.nombre || <span className="text-muted-foreground">—</span>}
                                </span>

                                {/* Fecha compra */}
                                <span className="text-xs text-muted-foreground">
                                  {equipo.fecha_compra
                                    ? new Date(equipo.fecha_compra).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                    : '—'}
                                </span>
                              </>
                            ) : (
                              <>
                                {/* Cliente */}
                                <span className="text-xs truncate">
                                  {equipo.clientes?.nombre || <span className="text-muted-foreground">—</span>}
                                </span>

                                {/* Laboratorio */}
                                <span className="text-xs truncate">
                                  {equipo.laboratorios?.nombre || <span className="text-muted-foreground">—</span>}
                                </span>
                              </>
                            )}

                            {/* Estado */}
                            <Badge
                              variant={
                                equipo.estado_general === 'en uso' ? 'default' :
                                equipo.estado_general === 'reparacion' ? 'destructive' :
                                equipo.estado_general === 'Activo' ? 'default' :
                                'secondary'
                              }
                              className={cn(
                                'capitalize text-[10px] px-1.5 py-0',
                                equipo.estado_general === 'Activo' && 'bg-green-100 text-green-700 border-green-200'
                              )}
                            >
                              {equipo.estado_general || 'stock'}
                            </Badge>

                            {/* Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRowClick(equipo); }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                {onEdit && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(equipo); }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                {onDelete && (
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onDelete(equipo); }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pagination footer */}
                <div className="flex items-center justify-between gap-4 px-4 py-2 border-t bg-white dark:bg-gray-950 shrink-0">
                  <div className="text-xs text-muted-foreground">
                    {totalCount === 0 ? (
                      'Sin resultados'
                    ) : (
                      <>
                        Mostrando{' '}
                        <span className="font-medium text-foreground">
                          {safePage * pageSize + 1}
                        </span>
                        {'–'}
                        <span className="font-medium text-foreground">
                          {Math.min((safePage + 1) * pageSize, totalCount)}
                        </span>{' '}
                        de{' '}
                        <span className="font-medium text-foreground">{totalCount}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Filas por página</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => setPageSize(Number(v))}
                      >
                        <SelectTrigger className="h-8 w-[72px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent side="top">
                          {[10, 25, 50, 100, 200].map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Página {safePage + 1} de {totalPages}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(0)}
                        disabled={safePage === 0}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={safePage >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(totalPages - 1)}
                        disabled={safePage >= totalPages - 1}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
