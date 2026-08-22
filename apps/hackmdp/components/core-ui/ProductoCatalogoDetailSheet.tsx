'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import { ProductoCatalogo, DivisionCatalogo, EquipoCatalogo } from '@/lib/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Package,
  Edit,
  Trash2,
  ExternalLink,
  Tag,
  Box,
  MoreVertical,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  Info,
  FileText,
  Image as ImageIcon,
  DollarSign,
  Warehouse,
  Copy,
  Check,
  Hash,
} from 'lucide-react'
import { DivisionBadges } from './DivisionMultiSelect'
import { sheetClasses } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ProductoCatalogoDetailSheetProps {
  producto: ProductoCatalogo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (data: Partial<ProductoCatalogo>) => void
  onDelete?: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const TIPO_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  insumo: {
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
  accesorio: {
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  repuesto: {
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-800',
  },
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateLong = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ProductoCatalogoDetailSheet({
  producto,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ProductoCatalogoDetailSheetProps) {
  const [copied, setCopied] = useState(false)

  // Fetch producto con equipos relacionados
  const { data: productoConEquipos } = useSWR<{
    producto: ProductoCatalogo
    equipos: EquipoCatalogo[]
  }>(
    producto && open ? `/api/catalogo-web/productos/${producto.id}` : null,
    fetcher
  )

  const equipos = productoConEquipos?.equipos || producto?.equipos || []

  const handleCopyId = async () => {
    if (!producto) return
    await navigator.clipboard.writeText(producto.id)
    setCopied(true)
    toast.success('ID copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!producto) return null

  const tipoConfig = TIPO_CONFIG[producto.tipo] || TIPO_CONFIG.insumo

  const formatPrice = (price: number | undefined, moneda: string) => {
    if (!price) return '-'
    const symbol = moneda === 'USD' ? 'USD ' : '$'
    return `${symbol}${price.toLocaleString('es-AR')}`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-emerald-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-emerald-950/10"
        side="bottom"
      >
        {/* Header compacto */}
        <SheetHeader className="px-6 pt-4 pb-3 pr-14 border-b border-emerald-200/50 dark:border-emerald-800/30 shrink-0 bg-gradient-to-r from-emerald-50/30 to-transparent dark:from-emerald-950/10 dark:to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Imagen o icon con acento */}
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="h-16 w-16 rounded-xl object-contain bg-white border border-emerald-200/30 shadow-sm"
                />
              ) : (
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 p-3 rounded-2xl border border-emerald-200/30 shadow-sm shadow-emerald-500/10">
                  <Package className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 dark:from-emerald-100 dark:to-emerald-300 bg-clip-text text-transparent">
                  {producto.nombre}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {producto.codigo && (
                    <Badge variant="outline" className="font-mono text-xs border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                      <Hash className="h-3 w-3 mr-1" />
                      {producto.codigo}
                    </Badge>
                  )}
                  <Badge className={cn(tipoConfig.bg, tipoConfig.color, tipoConfig.border)}>
                    {producto.tipo}
                  </Badge>
                  <Badge
                    className={cn(
                      producto.disponible
                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                        : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                    )}
                  >
                    {producto.disponible ? (
                      <><Eye className="h-3 w-3 mr-1" />Visible</>
                    ) : (
                      <><EyeOff className="h-3 w-3 mr-1" />Oculto</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Botones de acción compactos */}
            <div className="flex gap-2 flex-shrink-0">
              {onEdit && (
                <Button
                  type="primary"
                  size="tiny"
                  onClick={() => onEdit(producto)}
                  icon={<Edit />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                >
                  Editar
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="default"
                    size="tiny"
                    icon={<MoreVertical />}
                    className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyId}>
                    {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                    Copiar ID
                  </DropdownMenuItem>
                  {producto.imagen_url && (
                    <DropdownMenuItem onClick={() => window.open(producto.imagen_url, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver imagen original
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar producto
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetHeader>

        {/* Content con tabs */}
        <ScrollArea className="flex-1 mt-4">
          <div className="px-6 pb-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className={cn(sheetClasses.tabsList, 'grid-cols-3')}>
                <TabsTrigger value="general" className={cn(sheetClasses.tabsTrigger, 'gap-1.5')}>
                  <Info className="w-4 h-4" />
                  <span className="text-sm">General</span>
                </TabsTrigger>
                <TabsTrigger value="equipos" className={cn(sheetClasses.tabsTrigger, 'gap-1.5')}>
                  <Box className="w-4 h-4" />
                  <span className="text-sm">Equipos</span>
                  {equipos.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-emerald-200/50 text-emerald-700">
                      {equipos.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="media" className={cn(sheetClasses.tabsTrigger, 'gap-1.5')}>
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm">Media</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab General */}
              <TabsContent value="general" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Precios y Stock */}
                  <section className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2 text-gray-900 dark:text-gray-100">
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Precios y Stock
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-950/20">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Precio Lista</p>
                        <p className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100 mt-1">
                          {formatPrice(producto.precio_lista, producto.moneda)}
                        </p>
                      </div>

                      <div className="border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Precio Final</p>
                        <p className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                          {formatPrice(producto.precio_final, producto.moneda)}
                        </p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-950/20">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Moneda</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                          {producto.moneda}
                        </p>
                      </div>

                      <div className={cn(
                        'border rounded-lg p-3',
                        producto.stock > 0
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
                          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
                      )}>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Warehouse className="h-3 w-3" />
                          Stock
                        </p>
                        <p className={cn(
                          'text-lg font-bold mt-1',
                          producto.stock > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                        )}>
                          {producto.stock} unidades
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Info básica */}
                  <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-gradient-to-br from-white to-gray-50/20 dark:from-gray-900 dark:to-gray-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                      <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      Información Básica
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-950/20">
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Tipo
                        </p>
                        <p className={cn('font-semibold mt-1 capitalize', tipoConfig.color)}>
                          {producto.tipo}
                        </p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-950/20">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Categoría</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                          {producto.categoria || '-'}
                        </p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-950/20">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Marca</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                          {producto.marca || '-'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Divisiones */}
                  {producto.division && producto.division.length > 0 && (
                    <section className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-900 dark:to-blue-950/10 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-blue-200/50 dark:border-blue-800/30 pb-2 text-blue-800 dark:text-blue-200">
                        <Layers className="h-4 w-4 text-blue-600" />
                        Divisiones ({producto.division.length})
                      </h3>
                      <DivisionBadges divisions={producto.division as DivisionCatalogo[]} />
                    </section>
                  )}

                  {/* Descripción */}
                  {producto.descripcion && (
                    <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-gradient-to-br from-white to-gray-50/20 dark:from-gray-900 dark:to-gray-950/10 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                        <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        Descripción
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {producto.descripcion}
                      </p>
                    </section>
                  )}

                  {/* Metadatos */}
                  <section className="p-3 border border-gray-200/40 dark:border-gray-800/30 rounded-lg bg-gray-50/30 dark:bg-gray-950/20">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>ID: <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{producto.id.slice(0, 8)}...</code></span>
                      <span>Creado: {formatDate(producto.created_at)}</span>
                      <span>Actualizado: {formatDate(producto.updated_at)}</span>
                    </div>
                  </section>
                </motion.div>
              </TabsContent>

              {/* Tab Equipos */}
              <TabsContent value="equipos" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <section className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-purple-200/50 dark:border-purple-800/30 pb-2 text-purple-800 dark:text-purple-200">
                      <Box className="h-4 w-4 text-purple-600" />
                      Equipos Compatibles ({equipos.length})
                    </h3>

                    {equipos.length > 0 ? (
                      <div className="space-y-2">
                        <AnimatePresence>
                          {equipos.map((equipo, index) => (
                            <motion.div
                              key={equipo.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm transition-all group"
                            >
                              {equipo.imagen_url ? (
                                <img
                                  src={equipo.imagen_url}
                                  alt={`${equipo.marca} ${equipo.modelo}`}
                                  className="h-10 w-10 rounded-lg object-contain bg-gray-50"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <Box className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  {equipo.marca} {equipo.modelo}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {equipo.tipo}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {equipo.categoria || 'Sin categoría'}
                              </Badge>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Box className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No hay equipos compatibles con este producto
                        </p>
                      </div>
                    )}
                  </section>
                </motion.div>
              </TabsContent>

              {/* Tab Media */}
              <TabsContent value="media" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <section className="space-y-3 p-4 border border-pink-200/40 dark:border-pink-800/30 rounded-xl bg-gradient-to-br from-white to-pink-50/20 dark:from-gray-900 dark:to-pink-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-pink-200/50 dark:border-pink-800/30 pb-2 text-pink-800 dark:text-pink-200">
                      <ImageIcon className="h-4 w-4 text-pink-600" />
                      Imagen del Producto
                    </h3>

                    {producto.imagen_url ? (
                      <div className="space-y-3">
                        <div className="relative group">
                          <img
                            src={producto.imagen_url}
                            alt={producto.nombre}
                            className="w-full max-w-md mx-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white shadow-lg"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors flex items-center justify-center">
                            <Button
                              type="default"
                              size="small"
                              onClick={() => window.open(producto.imagen_url, '_blank')}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              icon={<ExternalLink />}
                            >
                              Ver original
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">URL de la imagen:</p>
                          <code className="text-xs text-gray-700 dark:text-gray-300 break-all block bg-gray-100 dark:bg-gray-800 p-2 rounded">
                            {producto.imagen_url}
                          </code>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ImageIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          No hay imagen configurada para este producto
                        </p>
                        {onEdit && (
                          <Button
                            type="default"
                            size="small"
                            onClick={() => onEdit(producto)}
                          >
                            Agregar imagen
                          </Button>
                        )}
                      </div>
                    )}
                  </section>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
