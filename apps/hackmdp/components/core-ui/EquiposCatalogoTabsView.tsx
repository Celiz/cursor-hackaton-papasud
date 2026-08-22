'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { EquipoCatalogo } from '@/lib/types'
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  MoreVertical,
  Building2,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Image,
  ImageOff,
  Tag,
  Search,
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

// Iconos por categoría de equipo (normalizados a minúsculas para matching)
const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  'autoanalizador': <FlaskConical className="h-4 w-4" />,
  'analizador de química clínica': <FlaskConical className="h-4 w-4" />,
  'contador hematologico': <Droplets className="h-4 w-4" />,
  'contador hematológico': <Droplets className="h-4 w-4" />,
  'hematología': <Droplets className="h-4 w-4" />,
  'microscopio': <Microscope className="h-4 w-4" />,
  'microscopía': <Microscope className="h-4 w-4" />,
  'centrifuga': <Gauge className="h-4 w-4" />,
  'centrífuga': <Gauge className="h-4 w-4" />,
  'centrífugas': <Gauge className="h-4 w-4" />,
  'autoclave': <Thermometer className="h-4 w-4" />,
  'esterilización': <Thermometer className="h-4 w-4" />,
  'balanza': <Scale className="h-4 w-4" />,
  'balanzas': <Scale className="h-4 w-4" />,
  'baño termico': <Thermometer className="h-4 w-4" />,
  'baño térmico': <Thermometer className="h-4 w-4" />,
  'baños térmicos': <Thermometer className="h-4 w-4" />,
  'estufa': <Thermometer className="h-4 w-4" />,
  'estufas': <Thermometer className="h-4 w-4" />,
  'impresora': <Printer className="h-4 w-4" />,
  'ups': <Battery className="h-4 w-4" />,
  'espectrofotómetro': <Zap className="h-4 w-4" />,
  'espectrofotometría': <Zap className="h-4 w-4" />,
  'coagulometro': <Droplets className="h-4 w-4" />,
  'coagulómetro': <Droplets className="h-4 w-4" />,
  'coagulación': <Droplets className="h-4 w-4" />,
  'agitador': <Gauge className="h-4 w-4" />,
  'agitadores': <Gauge className="h-4 w-4" />,
  'gases en sangre': <Gauge className="h-4 w-4" />,
  'pipetas': <FlaskConical className="h-4 w-4" />,
  'reactivos': <FlaskConical className="h-4 w-4" />,
}

// Colores por categoría
const CATEGORIA_COLORS: Record<string, { bg: string; text: string; border: string; darkBg: string }> = {
  'autoanalizador': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', darkBg: 'dark:bg-blue-950/30' },
  'analizador de química clínica': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', darkBg: 'dark:bg-blue-950/30' },
  'hematología': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', darkBg: 'dark:bg-red-950/30' },
  'microscopía': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', darkBg: 'dark:bg-purple-950/30' },
  'centrífugas': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', darkBg: 'dark:bg-orange-950/30' },
  'esterilización': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', darkBg: 'dark:bg-cyan-950/30' },
  'balanzas': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', darkBg: 'dark:bg-emerald-950/30' },
  'baños térmicos': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', darkBg: 'dark:bg-amber-950/30' },
  'estufas': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', darkBg: 'dark:bg-rose-950/30' },
  'ups': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', darkBg: 'dark:bg-green-950/30' },
  'coagulación': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', darkBg: 'dark:bg-pink-950/30' },
  'pipetas': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', darkBg: 'dark:bg-indigo-950/30' },
  'reactivos': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', darkBg: 'dark:bg-teal-950/30' },
}

const DEFAULT_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', darkBg: 'dark:bg-gray-900/50' }

interface EquiposCatalogoTabsViewProps {
  equipos: EquipoCatalogo[]
  onRowClick: (equipo: EquipoCatalogo) => void
  onEdit?: (equipo: EquipoCatalogo) => void
  onDelete?: (equipo: EquipoCatalogo) => void
}

export function EquiposCatalogoTabsView({
  equipos,
  onRowClick,
  onEdit,
  onDelete,
}: EquiposCatalogoTabsViewProps) {
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null)
  const [tipoSearchOpen, setTipoSearchOpen] = useState(false)
  const [equipoSearch, setEquipoSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Agrupar equipos por tipo (no por categoría, ya que tipo es más relevante)
  const equiposPorTipo = useMemo(() => {
    const grouped: Record<string, EquipoCatalogo[]> = {}

    equipos.forEach(equipo => {
      const tipo = equipo.tipo || 'Sin tipo'
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

  // Filtrar equipos por búsqueda
  const activeEquipos = useMemo(() => {
    if (!equipoSearch.trim()) return activeEquiposBase
    const search = equipoSearch.toLowerCase()
    return activeEquiposBase.filter(e =>
      e.marca?.toLowerCase().includes(search) ||
      e.modelo?.toLowerCase().includes(search)
    )
  }, [activeEquiposBase, equipoSearch])

  const getIcon = (tipo: string) => {
    const normalizedTipo = tipo.toLowerCase()
    return CATEGORIA_ICONS[normalizedTipo] || <Box className="h-4 w-4" />
  }

  const getColor = (tipo: string) => {
    const normalizedTipo = tipo.toLowerCase()
    return CATEGORIA_COLORS[normalizedTipo] || DEFAULT_COLOR
  }

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

  // Agrupar equipos activos por marca
  const equiposPorMarca = useMemo(() => {
    const grouped: Record<string, EquipoCatalogo[]> = {}
    activeEquipos.forEach(equipo => {
      const marca = equipo.marca || 'Sin marca'
      if (!grouped[marca]) {
        grouped[marca] = []
      }
      grouped[marca].push(equipo)
    })
    // Ordenar marcas alfabéticamente
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
  }, [activeEquipos])

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
                              {activeTipo === tipo && (
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
          </div>

          {/* Búsqueda de equipos */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-sm text-muted-foreground font-medium">Buscar:</span>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Marca o modelo..."
                value={equipoSearch}
                onChange={(e) => setEquipoSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTipo || 'todos'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* Info del tipo seleccionado */}
            <div className="px-4 py-3 flex items-center gap-3 border-b bg-gradient-to-r from-gray-50/80 to-transparent dark:from-gray-900/50 dark:to-transparent shrink-0">
              <div className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center shadow-sm border',
                activeTipo
                  ? `${getColor(activeTipo).bg} ${getColor(activeTipo).darkBg} ${getColor(activeTipo).border}`
                  : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200'
              )}>
                <span className={activeTipo ? getColor(activeTipo).text : 'text-purple-600'}>
                  {activeTipo ? getIcon(activeTipo) : <Box className="h-4 w-4" />}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold truncate">{activeTipo || 'Todos los equipos'}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeEquipos.length} equipos en catálogo
                  {equipoSearch && ` (filtrado por "${equipoSearch}")`}
                </p>
              </div>
            </div>

              {/* Tabla de equipos con scroll */}
              <div className="flex-1 overflow-auto min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b">
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground w-[80px]">Imagen</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Marca / Modelo</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Empresa</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">División</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Estado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedEquipos.map((equipo) => (
                      <TableRow
                        key={equipo.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                        onClick={() => onRowClick(equipo)}
                      >
                        <TableCell className="py-2">
                          {equipo.imagen_url ? (
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border">
                              <img
                                src={equipo.imagen_url}
                                alt={`${equipo.marca} ${equipo.modelo}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 border flex items-center justify-center">
                              <ImageOff className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm truncate max-w-[200px]">
                              {equipo.marca}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {equipo.modelo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {equipo.empresa ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate max-w-[150px]">{equipo.empresa.nombre}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Sin empresa</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {equipo.division && Array.isArray(equipo.division) && equipo.division.length > 0 ? (
                              equipo.division.slice(0, 2).map((div) => (
                                <Badge
                                  key={div}
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {div}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                            {equipo.division && equipo.division.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{equipo.division.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={equipo.disponible ? 'default' : 'secondary'}
                            className={cn(
                              'text-xs',
                              equipo.disponible
                                ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800'
                            )}
                          >
                            {equipo.disponible ? (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Visible
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Oculto
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
