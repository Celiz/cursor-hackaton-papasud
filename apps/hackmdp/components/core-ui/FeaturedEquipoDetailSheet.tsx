'use client'

import { useState } from 'react'
import { FeaturedEquipo } from '@/lib/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  Edit,
  Trash2,
  MoreVertical,
  Copy,
  Check,
  Info,
  Box,
  Building2,
  Sparkles,
  Calendar,
  Layers,
  Clock,
  Eye,
  EyeOff,
  Hash,
  Palette,
  ListChecks,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { sheetClasses } from '@/lib/design-system'

interface FeaturedEquipoDetailSheetProps {
  destacado: FeaturedEquipo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (data: Partial<FeaturedEquipo>) => void
  onDelete?: () => void
}

const BADGE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  primary: {
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
  secondary: {
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
  },
  success: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
  },
  warning: {
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  danger: {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
  },
}

export function FeaturedEquipoDetailSheet({
  destacado,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: FeaturedEquipoDetailSheetProps) {
  const [copied, setCopied] = useState(false)

  if (!destacado) return null

  const equipo = destacado.equipo

  const handleCopyId = () => {
    navigator.clipboard.writeText(destacado.id)
    setCopied(true)
    toast.success('ID copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const badgeConfig = BADGE_CONFIG[destacado.badge_color || 'primary'] || BADGE_CONFIG.primary

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-amber-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-amber-950/10"
        side="bottom"
      >
        <SheetHeader className="px-6 pt-4 pb-3 border-b border-amber-200/50 dark:border-amber-800/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {equipo?.imagen_url ? (
                <motion.img
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={equipo.imagen_url}
                  alt={`${equipo.marca} ${equipo.modelo}`}
                  className="h-16 w-16 rounded-xl object-contain bg-white border border-gray-200 shadow-sm"
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 p-3.5 rounded-2xl border border-amber-200/30 dark:border-amber-800/30"
                >
                  <Star className="h-9 w-9 text-amber-600 dark:text-amber-400" />
                </motion.div>
              )}

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-amber-900 to-amber-700 dark:from-amber-200 dark:to-amber-400 bg-clip-text text-transparent truncate">
                  {equipo ? `${equipo.marca} ${equipo.modelo}` : 'Equipo Destacado'}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-amber-100/50 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700"
                  >
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Posición {destacado.posicion}
                  </Badge>
                  {destacado.badge_text && (
                    <Badge
                      variant="outline"
                      className={cn(badgeConfig.bg, badgeConfig.color, badgeConfig.border)}
                    >
                      {destacado.badge_text}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      destacado.activo
                        ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700'
                        : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700'
                    )}
                  >
                    {destacado.activo ? (
                      <><Eye className="h-3 w-3 mr-1" />Activo</>
                    ) : (
                      <><EyeOff className="h-3 w-3 mr-1" />Inactivo</>
                    )}
                  </Badge>
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyId}
                className="text-muted-foreground hover:text-amber-600"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(destacado)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar destacado
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar destacado
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col h-[calc(90vh-100px)]">
          <div className="px-6 pt-3 border-b border-amber-100 dark:border-amber-900/30 bg-gradient-to-b from-amber-50/30 to-transparent dark:from-amber-950/10">
            <TabsList className={cn(sheetClasses.tabsList, 'grid-cols-3')}>
              <TabsTrigger value="general" className={cn(sheetClasses.tabsTrigger, 'gap-1.5')}>
                <Info className="h-3.5 w-3.5" />
                General
              </TabsTrigger>
              <TabsTrigger value="equipo" className={cn(sheetClasses.tabsTrigger, 'gap-1.5')}>
                <Box className="h-3.5 w-3.5" />
                Equipo
              </TabsTrigger>
              <TabsTrigger value="features" className={cn(sheetClasses.tabsTrigger, 'gap-1.5')}>
                <Sparkles className="h-3.5 w-3.5" />
                Features
                {destacado.custom_features && destacado.custom_features.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {destacado.custom_features.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="general" className="mt-0 space-y-6">
                {/* Posición y Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20"
                >
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-4">
                    <Star className="h-4 w-4" />
                    Configuración del Destacado
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Hash className="h-3.5 w-3.5" />
                        <span className="text-xs">Posición</span>
                      </div>
                      <p className="font-bold text-xl text-amber-600 dark:text-amber-400">
                        #{destacado.posicion}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Palette className="h-3.5 w-3.5" />
                        <span className="text-xs">Badge Color</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(badgeConfig.bg, badgeConfig.color, badgeConfig.border, 'capitalize')}
                      >
                        {destacado.badge_color || 'primary'}
                      </Badge>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800 col-span-2">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-xs">Badge Text</span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {destacado.badge_text || '-'}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* División */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 rounded-xl border border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20"
                >
                  <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4" />
                    División Destacada
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-base bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                  >
                    {destacado.featured_division || 'Todas las divisiones'}
                  </Badge>
                </motion.div>

                {/* Empresa */}
                {destacado.empresa && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20"
                  >
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4" />
                      Empresa Asociada
                    </h3>
                    <div className="flex items-center gap-3">
                      {destacado.empresa.logo_url ? (
                        <img
                          src={destacado.empresa.logo_url}
                          alt={destacado.empresa.nombre}
                          className="h-12 w-12 rounded-lg object-contain bg-white border border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {destacado.empresa.nombre}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Fechas de vigencia */}
                {(destacado.fecha_inicio || destacado.fecha_fin) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20"
                  >
                    <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4" />
                      Vigencia
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {destacado.fecha_inicio && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800">
                          <span className="text-xs text-muted-foreground">Desde</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(destacado.fecha_inicio).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                      {destacado.fecha_fin && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800">
                          <span className="text-xs text-muted-foreground">Hasta</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(destacado.fecha_fin).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Metadatos */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="p-4 rounded-xl border border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50"
                >
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4" />
                    Información del Sistema
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Creado</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(destacado.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actualizado</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(destacado.updated_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="equipo" className="mt-0 space-y-6">
                {equipo ? (
                  <>
                    {/* Imagen del equipo */}
                    {equipo.imagen_url && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex justify-center"
                      >
                        <img
                          src={equipo.imagen_url}
                          alt={`${equipo.marca} ${equipo.modelo}`}
                          className="max-h-48 rounded-xl object-contain bg-white border border-gray-200 shadow-sm p-4"
                        />
                      </motion.div>
                    )}

                    {/* Info del equipo */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl border border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20"
                    >
                      <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2 mb-4">
                        <Box className="h-4 w-4" />
                        Información del Equipo
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800">
                          <span className="text-xs text-muted-foreground">Marca</span>
                          <p className="font-bold text-gray-900 dark:text-gray-100">{equipo.marca}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800">
                          <span className="text-xs text-muted-foreground">Modelo</span>
                          <p className="font-bold text-gray-900 dark:text-gray-100">{equipo.modelo}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800">
                          <span className="text-xs text-muted-foreground">Categoría</span>
                          <p className="font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide text-sm">
                            {equipo.tipo}
                          </p>
                        </div>
                        {equipo.subtipo && (
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200/50 dark:border-gray-800">
                            <span className="text-xs text-muted-foreground">Tipo</span>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{equipo.subtipo}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Utilidad */}
                    {equipo.utilidad && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20"
                      >
                        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4" />
                          Utilidad
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {equipo.utilidad}
                        </p>
                      </motion.div>
                    )}

                    {/* Divisiones del equipo */}
                    {equipo.division && equipo.division.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20"
                      >
                        <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 mb-3">
                          <Layers className="h-4 w-4" />
                          Divisiones del Equipo
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {equipo.division.map((div) => (
                            <Badge
                              key={div}
                              variant="outline"
                              className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                            >
                              {div}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <Box className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-muted-foreground">
                      No hay equipo asociado a este destacado
                    </p>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="features" className="mt-0 space-y-6">
                {destacado.custom_features && destacado.custom_features.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20"
                  >
                    <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-4">
                      <ListChecks className="h-4 w-4" />
                      Características Personalizadas
                    </h3>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {destacado.custom_features.map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800"
                          >
                            <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {feature}
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                      <Sparkles className="h-8 w-8 text-amber-500 dark:text-amber-400" />
                    </div>
                    <p className="text-muted-foreground mb-1">
                      Sin características personalizadas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Se mostrarán las características del equipo base
                    </p>
                  </motion.div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
