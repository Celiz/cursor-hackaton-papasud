'use client'

import { useState, useMemo } from 'react'
import { FeaturedEquipo, EquipoCatalogo } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Box,
  GripVertical,
  Home,
  FlaskConical,
  Stethoscope,
  Microscope,
  Sparkles,
  Heart,
  Activity,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SLOTS_PER_DIVISION = 3

// Divisiones disponibles para featured (solo las que realmente usamos)
const FEATURED_DIVISIONS = ['Laboratorios', 'Veterinaria'] as const

// Iconos y colores por división
const DIVISION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  Home: {
    icon: <Home className="h-5 w-5" />,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  Laboratorios: {
    icon: <FlaskConical className="h-5 w-5" />,
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  Veterinaria: {
    icon: <Stethoscope className="h-5 w-5" />,
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
  },
}

const BADGE_COLORS: Record<string, string> = {
  primary: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-amber-500',
  danger: 'bg-red-600',
  secondary: 'bg-gray-500',
}

interface FeaturedSlotsViewProps {
  destacados: FeaturedEquipo[]
  equipos: EquipoCatalogo[]
  onAddToSlot: (division: string, posicion: number) => void
  onEdit: (destacado: FeaturedEquipo) => void
  onDelete: (destacado: FeaturedEquipo) => void
  onToggleActive: (destacado: FeaturedEquipo) => void
  onReorder: (destacado: FeaturedEquipo, newPosition: number) => void
}

export function FeaturedSlotsView({
  destacados,
  equipos,
  onAddToSlot,
  onEdit,
  onDelete,
  onToggleActive,
  onReorder,
}: FeaturedSlotsViewProps) {
  // Agrupar destacados por división
  const destacadosPorDivision = useMemo(() => {
    const grouped: Record<string, FeaturedEquipo[]> = {}

    // Inicializar las divisiones featured
    FEATURED_DIVISIONS.forEach(div => {
      grouped[div] = []
    })

    // Agrupar los destacados
    // Usar featured_division si existe, sino division (la API puede enviar cualquiera de los dos)
    destacados.forEach(d => {
      const division = d.featured_division || (d as any).division || 'Laboratorios'
      if (!grouped[division]) {
        grouped[division] = []
      }
      grouped[division].push(d)
    })

    // Ordenar por posición dentro de cada división
    Object.keys(grouped).forEach(div => {
      grouped[div].sort((a, b) => a.posicion - b.posicion)
    })

    return grouped
  }, [destacados])

  // Divisiones a mostrar (solo Laboratorios y Veterinaria)
  const divisiones = [...FEATURED_DIVISIONS]

  return (
    <div className="space-y-6">
      {divisiones.map(division => {
        const config = DIVISION_CONFIG[division] || DIVISION_CONFIG.Home
        const slots = destacadosPorDivision[division] || []
        const hasContent = slots.length > 0

        return (
          <motion.div
            key={division}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-xl border-2 overflow-hidden transition-all',
              config.border,
              hasContent ? config.bg : 'bg-gray-50/50 dark:bg-gray-900/50'
            )}
          >
            {/* Header de la división */}
            <div className={cn(
              'px-4 py-3 flex items-center justify-between',
              config.bg,
              'border-b',
              config.border
            )}>
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', config.bg, config.color)}>
                  {config.icon}
                </div>
                <div>
                  <h3 className={cn('font-bold text-lg', config.color)}>
                    {division}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {slots.length} de {SLOTS_PER_DIVISION} slots ocupados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {slots.filter(s => s.activo).length > 0 && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    <Eye className="h-3 w-3 mr-1" />
                    {slots.filter(s => s.activo).length} activos
                  </Badge>
                )}
                {slots.filter(s => !s.activo).length > 0 && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                    <EyeOff className="h-3 w-3 mr-1" />
                    {slots.filter(s => !s.activo).length} inactivos
                  </Badge>
                )}
              </div>
            </div>

            {/* Slots */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(posicion => {
                  const destacado = slots.find(s => s.posicion === posicion)

                  if (destacado) {
                    return (
                      <SlotCard
                        key={destacado.id}
                        destacado={destacado}
                        config={config}
                        onEdit={() => onEdit(destacado)}
                        onDelete={() => onDelete(destacado)}
                        onToggleActive={() => onToggleActive(destacado)}
                        onMoveUp={() => onReorder(destacado, posicion - 1)}
                        onMoveDown={() => onReorder(destacado, posicion + 1)}
                        canMoveUp={posicion > 1}
                        canMoveDown={posicion < SLOTS_PER_DIVISION}
                      />
                    )
                  }

                  return (
                    <EmptySlot
                      key={`${division}-${posicion}`}
                      posicion={posicion}
                      config={config}
                      onClick={() => onAddToSlot(division, posicion)}
                    />
                  )
                })}
              </div>

              {/* Mostrar destacados extra si hay más de 3 */}
              {slots.filter(s => s.posicion > SLOTS_PER_DIVISION).length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700">
                  <p className="text-xs text-muted-foreground mb-3">
                    Posiciones adicionales (no visibles en frontend):
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {slots.filter(s => s.posicion > SLOTS_PER_DIVISION).map(destacado => (
                      <SlotCard
                        key={destacado.id}
                        destacado={destacado}
                        config={config}
                        onEdit={() => onEdit(destacado)}
                        onDelete={() => onDelete(destacado)}
                        onToggleActive={() => onToggleActive(destacado)}
                        onMoveUp={() => onReorder(destacado, destacado.posicion - 1)}
                        onMoveDown={() => onReorder(destacado, destacado.posicion + 1)}
                        canMoveUp={true}
                        canMoveDown={true}
                        isExtra
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

interface SlotCardProps {
  destacado: FeaturedEquipo
  config: typeof DIVISION_CONFIG[string]
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  isExtra?: boolean
}

function SlotCard({
  destacado,
  config,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isExtra,
}: SlotCardProps) {
  const equipo = destacado.equipo

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative rounded-xl border-2 bg-white dark:bg-gray-900 overflow-hidden transition-all group',
        destacado.activo
          ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg'
          : 'border-dashed border-gray-300 dark:border-gray-700 opacity-60',
        isExtra && 'border-orange-300 dark:border-orange-800'
      )}
    >
      {/* Posición badge */}
      <div className="absolute top-2 left-2 z-10">
        <div className={cn(
          'h-7 w-7 rounded-full flex items-center justify-center font-bold text-sm shadow-md',
          destacado.activo
            ? 'bg-amber-500 text-white'
            : 'bg-gray-400 text-white'
        )}>
          {destacado.posicion}
        </div>
      </div>

      {/* Badge del producto */}
      {destacado.badge_text && (
        <div className="absolute top-2 right-2 z-10">
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-bold text-white shadow-md',
            BADGE_COLORS[destacado.badge_color] || BADGE_COLORS.primary
          )}>
            {destacado.badge_text}
          </span>
        </div>
      )}

      {/* Imagen */}
      <div className="h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-4">
        {equipo?.imagen_url ? (
          <img
            src={equipo.imagen_url}
            alt={`${equipo.marca} ${equipo.modelo}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Box className="h-12 w-12 text-gray-400" />
        )}
      </div>

      {/* Contenido */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
              {equipo?.marca || 'Sin marca'}
            </p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">
              {equipo?.modelo || 'Sin modelo'}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {equipo?.tipo}
            </p>
          </div>

          {/* Menú de acciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {destacado.activo ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Desactivar
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Activar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canMoveUp && (
                <DropdownMenuItem onClick={onMoveUp}>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Mover arriba
                </DropdownMenuItem>
              )}
              {canMoveDown && (
                <DropdownMenuItem onClick={onMoveDown}>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Mover abajo
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Features */}
        {destacado.custom_features && destacado.custom_features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {destacado.custom_features.slice(0, 2).map((feature, i) => (
              <span
                key={i}
                className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded"
              >
                {feature}
              </span>
            ))}
            {destacado.custom_features.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{destacado.custom_features.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Estado */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className={cn(
            'h-2 w-2 rounded-full',
            destacado.activo ? 'bg-green-500' : 'bg-gray-400'
          )} />
          <span className="text-[10px] text-muted-foreground">
            {destacado.activo ? 'Visible en web' : 'No visible'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

interface EmptySlotProps {
  posicion: number
  config: typeof DIVISION_CONFIG[string]
  onClick: () => void
}

function EmptySlot({ posicion, config, onClick }: EmptySlotProps) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={cn(
        'relative rounded-xl border-2 border-dashed h-[200px] flex flex-col items-center justify-center gap-3 transition-all group',
        'border-gray-300 dark:border-gray-700',
        'hover:border-gray-400 dark:hover:border-gray-600',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        'cursor-pointer'
      )}
    >
      {/* Posición */}
      <div className="absolute top-2 left-2">
        <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-sm text-gray-500">
          {posicion}
        </div>
      </div>

      <div className={cn(
        'h-12 w-12 rounded-full flex items-center justify-center transition-colors',
        'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
      )}>
        <Plus className="h-6 w-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
          Agregar destacado
        </p>
        <p className="text-xs text-muted-foreground">
          Posición {posicion}
        </p>
      </div>
    </motion.button>
  )
}
