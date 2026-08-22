'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, Sparkles, ChevronDown, ChevronUp, List, Grid3X3, FolderOpen, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type EspecificacionesValue = Record<string, unknown> | string[]

interface EspecificacionesEditorProps {
  value: EspecificacionesValue
  onChange: (value: EspecificacionesValue) => void
  disabled?: boolean
  className?: string
  categoria?: string // Categoría del equipo para sugerencias contextuales
  compact?: boolean // Modo compacto sin preview JSON
}

// Helper para convertir valor simple a string
function simpleValueToString(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  return String(val)
}

// Helper para convertir cualquier valor a string legible (para modo lista/aplanado)
function valueToString(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    // Si es un objeto, mostrar solo los valores que no son null/undefined
    const entries = Object.entries(val as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
    if (entries.length === 0) return ''
    return entries
      .map(([k, v]) => {
        if (typeof v === 'object') {
          const nestedStr = valueToString(v)
          return nestedStr ? `${k}: ${nestedStr}` : ''
        }
        return `${k}: ${v}`
      })
      .filter(Boolean)
      .join(', ')
  }
  return String(val)
}

// Detectar si el valor tiene estructura jerárquica (objetos anidados como categorías)
function hasNestedCategories(value: EspecificacionesValue): boolean {
  if (Array.isArray(value)) return false
  return Object.values(value).some(v =>
    v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0
  )
}

// Parsear especificaciones a estructura jerárquica
function parseHierarchicalSpecs(value: EspecificacionesValue): {
  categories: Record<string, Record<string, string>>,
  flatItems: Record<string, string>
} {
  const categories: Record<string, Record<string, string>> = {}
  const flatItems: Record<string, string> = {}

  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      flatItems[`Item ${idx + 1}`] = String(item)
    })
    return { categories, flatItems }
  }

  Object.entries(value).forEach(([key, val]) => {
    if (val === null || val === undefined || val === '') return

    if (typeof val === 'object' && !Array.isArray(val)) {
      // Es una categoría con sub-items
      const categoryItems: Record<string, string> = {}
      Object.entries(val as Record<string, unknown>).forEach(([subKey, subVal]) => {
        if (subVal !== null && subVal !== undefined && subVal !== '') {
          categoryItems[subKey] = simpleValueToString(subVal)
        }
      })
      if (Object.keys(categoryItems).length > 0) {
        categories[key] = categoryItems
      }
    } else {
      // Es un valor plano
      flatItems[key] = simpleValueToString(val)
    }
  })

  return { categories, flatItems }
}

// Sugerencias base comunes a todos los equipos
const SUGERENCIAS_BASE = [
  'Voltaje', 'Potencia', 'Frecuencia', 'Consumo', 'Peso', 'Dimensiones',
  'Conectividad', 'Interfaz', 'Certificaciones'
]

// Sugerencias específicas por categoría de equipo
const SUGERENCIAS_POR_CATEGORIA: Record<string, string[]> = {
  bomba: ['Caudal', 'Presión máxima', 'Altura máxima', 'Material cuerpo', 'Tipo rotor', 'RPM'],
  monitor: ['Resolución', 'Tamaño pantalla', 'Tecnología panel', 'Tasa refresco', 'Puertos'],
  equipo_diagnostico: ['Velocidad', 'Throughput', 'Capacidad', 'Métodos', 'Parámetros', 'Volumen muestra'],
  centrifuga: ['RPM máximas', 'RCF máximo', 'Capacidad tubos', 'Radio rotor', 'Temperatura', 'Ruido'],
  analizador: ['Throughput', 'Volumen muestra', 'Reactivos', 'Canales', 'Tiempo análisis', 'Precisión'],
  microscopio: ['Aumentos', 'Objetivos', 'Iluminación', 'Campo visual', 'Ocular'],
  autoclave: ['Capacidad litros', 'Temperatura máxima', 'Presión máxima', 'Ciclos', 'Material cámara'],
  incubadora: ['Rango temperatura', 'Uniformidad', 'Capacidad', 'CO2', 'Humedad'],
  balanza: ['Capacidad', 'Precisión', 'Linealidad', 'Plato', 'Calibración'],
  espectrofotometro: ['Rango longitud onda', 'Ancho banda', 'Precisión', 'Cubetas', 'Fuente luz'],
  refrigerador: ['Rango temperatura', 'Capacidad litros', 'Uniformidad', 'Alarmas', 'Estantes'],
  default: ['Velocidad', 'Capacidad', 'Volumen', 'Precisión', 'Rendimiento', 'Pantalla', 'Memoria']
}

export function EspecificacionesEditor({
  value,
  onChange,
  disabled = false,
  className,
  categoria,
  compact = false
}: EspecificacionesEditorProps) {
  const isArray = Array.isArray(value)
  const hasHierarchy = hasNestedCategories(value)
  const [mode, setMode] = useState<'object' | 'array'>(isArray ? 'array' : 'object')
  const [viewMode, setViewMode] = useState<'hierarchical' | 'flat'>(hasHierarchy ? 'hierarchical' : 'flat')
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [showSugerencias, setShowSugerencias] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Parsear estructura jerárquica
  const { categories, flatItems } = useMemo(() => parseHierarchicalSpecs(value), [value])

  // Toggle categoría expandida
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Expandir todas las categorías por defecto al inicio
  useMemo(() => {
    if (Object.keys(categories).length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(Object.keys(categories)))
    }
  }, [categories])

  // Sugerencias contextuales basadas en la categoría
  const sugerenciasClaves = useMemo(() => {
    const categoriaNormalizada = categoria?.toLowerCase().replace(/\s+/g, '_') || 'default'
    const especificas = SUGERENCIAS_POR_CATEGORIA[categoriaNormalizada] || SUGERENCIAS_POR_CATEGORIA.default
    // Combinar específicas + base, sin duplicados
    const todas = [...new Set([...especificas, ...SUGERENCIAS_BASE])]
    return todas
  }, [categoria])

  // Filtrar sugerencias que ya están agregadas
  const sugerenciasDisponibles = useMemo(() => {
    if (Array.isArray(value)) return sugerenciasClaves
    const clavesExistentes = Object.keys(value)
    return sugerenciasClaves.filter(s => !clavesExistentes.includes(s))
  }, [sugerenciasClaves, value])

  // Object mode handlers
  const handleAddKeyValue = () => {
    if (!newKey.trim() || !newValue.trim() || disabled) return

    if (mode === 'object' && !Array.isArray(value)) {
      onChange({ ...value, [newKey.trim()]: newValue.trim() })
    }
    setNewKey('')
    setNewValue('')
  }

  const handleAddFromSugerencia = (clave: string) => {
    if (disabled) return
    setNewKey(clave)
    setShowSugerencias(false)
  }

  const handleRemoveKey = (key: string) => {
    if (disabled || Array.isArray(value)) return
    const newObj = { ...value }
    delete newObj[key]
    onChange(newObj)
  }

  const handleUpdateValue = (key: string, newVal: string) => {
    if (disabled || Array.isArray(value)) return
    onChange({ ...value, [key]: newVal })
  }

  // Handlers para modo jerárquico
  const handleUpdateCategoryItem = (category: string, itemKey: string, newVal: string) => {
    if (disabled || Array.isArray(value)) return
    const categoryData = (value[category] as Record<string, unknown>) || {}
    onChange({
      ...value,
      [category]: {
        ...categoryData,
        [itemKey]: newVal
      }
    })
  }

  const handleRemoveCategoryItem = (category: string, itemKey: string) => {
    if (disabled || Array.isArray(value)) return
    const categoryData = { ...(value[category] as Record<string, unknown>) }
    delete categoryData[itemKey]
    if (Object.keys(categoryData).length === 0) {
      // Si la categoría queda vacía, eliminarla
      const newObj = { ...value }
      delete newObj[category]
      onChange(newObj)
    } else {
      onChange({ ...value, [category]: categoryData })
    }
  }

  const handleAddCategoryItem = (category: string, key: string, val: string) => {
    if (disabled || Array.isArray(value) || !key.trim() || !val.trim()) return
    const categoryData = (value[category] as Record<string, unknown>) || {}
    onChange({
      ...value,
      [category]: {
        ...categoryData,
        [key.trim()]: val.trim()
      }
    })
  }

  const handleAddNewCategory = () => {
    if (disabled || Array.isArray(value) || !newCategory.trim()) return
    onChange({
      ...value,
      [newCategory.trim()]: {}
    })
    setExpandedCategories(prev => new Set([...prev, newCategory.trim()]))
    setNewCategory('')
  }

  const handleRemoveCategory = (category: string) => {
    if (disabled || Array.isArray(value)) return
    const newObj = { ...value }
    delete newObj[category]
    onChange(newObj)
  }

  // Array mode handlers
  const handleAddItem = () => {
    if (!newItem.trim() || disabled) return

    if (mode === 'array') {
      const arr = Array.isArray(value) ? value : []
      onChange([...arr, newItem.trim()])
    }
    setNewItem('')
  }

  const handleRemoveItem = (index: number) => {
    if (disabled || !Array.isArray(value)) return
    const arr = [...value]
    arr.splice(index, 1)
    onChange(arr)
  }

  const handleUpdateItem = (index: number, newVal: string) => {
    if (disabled || !Array.isArray(value)) return
    const arr = [...value]
    arr[index] = newVal
    onChange(arr)
  }

  // Mode switch
  const handleModeChange = (newMode: 'object' | 'array') => {
    if (disabled) return
    setMode(newMode)

    // Convert value to new mode
    if (newMode === 'array' && !Array.isArray(value)) {
      // Solo convertir entradas que tienen valor real
      const arr = Object.entries(value)
        .map(([k, v]) => {
          const strVal = valueToString(v)
          return strVal ? `${k}: ${strVal}` : ''
        })
        .filter(Boolean)
      onChange(arr)
    } else if (newMode === 'object' && Array.isArray(value)) {
      const obj: Record<string, string> = {}
      value.forEach((item, idx) => {
        if (item.includes(':')) {
          const [key, ...rest] = item.split(':')
          obj[key.trim()] = rest.join(':').trim()
        } else {
          obj[`Spec ${idx + 1}`] = item
        }
      })
      onChange(obj)
    }
  }


  const totalCategoryItems = Object.values(categories).reduce((acc, cat) => acc + Object.keys(cat).length, 0)
  const totalItems = Object.keys(flatItems).length + totalCategoryItems

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header con toggles */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Especificaciones
            </span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </Badge>
            )}
            {Object.keys(categories).length > 0 && (
              <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                {Object.keys(categories).length} {Object.keys(categories).length === 1 ? 'categoría' : 'categorías'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleModeChange('object')}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                mode === 'object'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-700 dark:text-purple-300'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Grid3X3 className="h-3 w-3" />
              Estructurado
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('array')}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                mode === 'array'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-700 dark:text-purple-300'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List className="h-3 w-3" />
              Lista
            </button>
          </div>
        </div>

        {/* Sub-toggle para vista jerárquica/plana en modo objeto */}
        {mode === 'object' && (hasHierarchy || Object.keys(categories).length > 0) && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Vista:</span>
            <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('hierarchical')}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                  viewMode === 'hierarchical'
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-700 dark:text-purple-300'
                    : 'text-purple-500 hover:text-purple-700'
                )}
              >
                <Layers className="h-3 w-3" />
                Por Categoría
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                  viewMode === 'flat'
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-700 dark:text-purple-300'
                    : 'text-purple-500 hover:text-purple-700'
                )}
              >
                <Grid3X3 className="h-3 w-3" />
                Plano
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modo Estructurado */}
      {mode === 'object' && (
        <div className="space-y-3">
          {/* Vista Jerárquica por Categorías */}
          {viewMode === 'hierarchical' && (
            <div className="space-y-3">
              {/* Categorías existentes */}
              {Object.keys(categories).length > 0 && (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {Object.entries(categories).map(([categoryName, items]) => (
                      <motion.div
                        key={categoryName}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden bg-purple-50/50 dark:bg-purple-900/20"
                      >
                        {/* Header de categoría */}
                        <div
                          className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/20 cursor-pointer"
                          onClick={() => toggleCategory(categoryName)}
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="font-medium text-purple-900 dark:text-purple-100 capitalize">
                              {categoryName.replace(/_/g, ' ')}
                            </span>
                            <Badge variant="secondary" className="text-xs h-5">
                              {Object.keys(items).length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveCategory(categoryName); }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              disabled={disabled}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            {expandedCategories.has(categoryName) ? (
                              <ChevronUp className="h-4 w-4 text-purple-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-purple-500" />
                            )}
                          </div>
                        </div>

                        {/* Items de la categoría */}
                        <AnimatePresence>
                          {expandedCategories.has(categoryName) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-3 py-2 space-y-2 bg-white dark:bg-gray-900/50"
                            >
                              {Object.entries(items).map(([itemKey, itemVal]) => (
                                <div key={itemKey} className="flex items-center gap-2 group">
                                  <div className="flex-shrink-0 w-1/3">
                                    <div className="px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-300 truncate capitalize">
                                      {itemKey.replace(/_/g, ' ')}
                                    </div>
                                  </div>
                                  <Input
                                    value={itemVal}
                                    onChange={(e) => handleUpdateCategoryItem(categoryName, itemKey, e.target.value)}
                                    disabled={disabled}
                                    className="flex-1 h-8 text-sm"
                                  />
                                  <button
                                    type="button"
                                    className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveCategoryItem(categoryName, itemKey)}
                                    disabled={disabled}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}

                              {/* Agregar item a categoría */}
                              <CategoryItemAdder
                                categoryName={categoryName}
                                onAdd={handleAddCategoryItem}
                                disabled={disabled}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Items planos (sin categoría) */}
              {Object.keys(flatItems).length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 font-medium">Sin categoría</div>
                  {Object.entries(flatItems).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 group">
                      <div className="flex-shrink-0 w-1/3">
                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {key}
                        </div>
                      </div>
                      <Input
                        value={val}
                        onChange={(e) => handleUpdateValue(key, e.target.value)}
                        disabled={disabled}
                        className="flex-1 h-9"
                      />
                      <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveKey(key)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Agregar nueva categoría */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-gray-500">Nueva Categoría</Label>
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="ej: Performance, Capacidad, Conectividad..."
                      disabled={disabled}
                      className="h-9"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewCategory())}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleAddNewCategory}
                    disabled={disabled || !newCategory.trim()}
                    className="h-9 gap-1"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Crear
                  </Button>
                </div>

                {/* Agregar item plano */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-gray-500">Item sin categoría</Label>
                    <Input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="Clave"
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Valor"
                      disabled={disabled}
                      className="h-9"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyValue())}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddKeyValue}
                    disabled={disabled || !newKey.trim() || !newValue.trim()}
                    className="h-9 w-9 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Vista Plana (original) */}
          {viewMode === 'flat' && (
            <div className="space-y-3">
              {/* Items existentes */}
              {!Array.isArray(value) && Object.entries(value).length > 0 && (
                <ScrollArea className={cn(Object.keys(value).length > 4 ? 'h-[200px]' : '')}>
                  <div className="space-y-2 pr-2">
                    <AnimatePresence mode="popLayout">
                      {Object.entries(value).map(([key, val]) => (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center gap-2 group"
                        >
                          <div className="flex-shrink-0 w-1/3">
                            <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800 text-sm font-medium text-purple-700 dark:text-purple-300 truncate">
                              {key}
                            </div>
                          </div>
                          <Input
                            value={valueToString(val)}
                            onChange={(e) => handleUpdateValue(key, e.target.value)}
                            disabled={disabled}
                            className="flex-1 h-9"
                            placeholder="Valor..."
                          />
                          <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveKey(key)}
                            disabled={disabled}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}

              {/* Agregar nuevo */}
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {/* Sugerencias rápidas */}
                {sugerenciasDisponibles.length > 0 && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowSugerencias(!showSugerencias)}
                      className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700"
                    >
                      <Sparkles className="h-3 w-3" />
                      Sugerencias {categoria ? `para ${categoria}` : 'comunes'}
                      {showSugerencias ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    <AnimatePresence>
                      {showSugerencias && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-wrap gap-1.5 overflow-hidden"
                        >
                          {sugerenciasDisponibles.slice(0, 12).map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => handleAddFromSugerencia(sug)}
                              disabled={disabled}
                              className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 transition-colors"
                            >
                              + {sug}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Input para nuevo par */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-gray-500">Clave</Label>
                    <Input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="ej: Velocidad"
                      disabled={disabled}
                      className="h-9"
                      list="sugerencias-claves"
                    />
                    <datalist id="sugerencias-claves">
                      {sugerenciasClaves.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-gray-500">Valor</Label>
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="ej: 400 tests/hora"
                      disabled={disabled}
                      className="h-9"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyValue())}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddKeyValue}
                    disabled={disabled || !newKey.trim() || !newValue.trim()}
                    className="h-9 w-9 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modo Lista */}
      {mode === 'array' && (
        <div className="space-y-3">
          {/* Items existentes */}
          {Array.isArray(value) && value.length > 0 && (
            <ScrollArea className={cn(value.length > 5 ? 'h-[200px]' : '')}>
              <div className="space-y-2 pr-2">
                <AnimatePresence mode="popLayout">
                  {value.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-2 group"
                    >
                      <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
                      <Input
                        value={item}
                        onChange={(e) => handleUpdateItem(index, e.target.value)}
                        disabled={disabled}
                        className="flex-1 h-9"
                      />
                      <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveItem(index)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}

          {/* Agregar nuevo item */}
          <div className="flex items-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <Label className="text-xs text-gray-500">Nueva especificación</Label>
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="ej: Pantalla táctil de 10 pulgadas"
                disabled={disabled}
                className="h-9"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddItem}
              disabled={disabled || !newItem.trim()}
              className="h-9 w-9 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalItems === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm">
          No hay especificaciones. Agregá una usando el formulario de arriba.
        </div>
      )}
    </div>
  )
}

// Componente auxiliar para agregar items a una categoría
function CategoryItemAdder({
  categoryName,
  onAdd,
  disabled
}: {
  categoryName: string;
  onAdd: (category: string, key: string, value: string) => void;
  disabled?: boolean;
}) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = () => {
    if (newKey.trim() && newValue.trim()) {
      onAdd(categoryName, newKey, newValue)
      setNewKey('')
      setNewValue('')
      setIsAdding(false)
    }
  }

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
      >
        <Plus className="h-3 w-3" />
        Agregar a {categoryName}
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700"
    >
      <Input
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        placeholder="Clave"
        disabled={disabled}
        className="flex-1 h-8 text-sm"
        autoFocus
      />
      <Input
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        placeholder="Valor"
        disabled={disabled}
        className="flex-1 h-8 text-sm"
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAdd}
        disabled={disabled || !newKey.trim() || !newValue.trim()}
        className="h-8 px-2"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(false)}
        className="h-8 px-2 text-gray-400"
      >
        ✕
      </Button>
    </motion.div>
  )
}

// Display component for read-only contexts - IMPROVED VERSION
export function EspecificacionesDisplay({
  value,
  className
}: {
  value: EspecificacionesValue
  className?: string
}) {
  if (!value || (Array.isArray(value) && value.length === 0) ||
      (!Array.isArray(value) && Object.keys(value).length === 0)) {
    return <span className="text-muted-foreground text-sm">Sin especificaciones</span>
  }

  // Para arrays, mostrar como lista con bullets
  if (Array.isArray(value)) {
    return (
      <ul className={cn('space-y-2', className)}>
        {value.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  // Parsear estructura jerárquica
  const { categories, flatItems } = parseHierarchicalSpecs(value)
  const hasCategories = Object.keys(categories).length > 0
  const hasFlatItems = Object.keys(flatItems).length > 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Categorías con sus items */}
      {hasCategories && (
        <div className="space-y-3">
          {Object.entries(categories).map(([categoryName, items]) => (
            <div
              key={categoryName}
              className="rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 overflow-hidden bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-gray-900/50"
            >
              {/* Header de categoría */}
              <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-100/80 to-indigo-50/50 dark:from-indigo-900/40 dark:to-indigo-900/20 border-b border-indigo-200/40 dark:border-indigo-800/30">
                <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 capitalize flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  {categoryName.replace(/_/g, ' ')}
                  <Badge variant="secondary" className="ml-auto text-xs h-5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {Object.keys(items).length}
                  </Badge>
                </h4>
              </div>

              {/* Items de la categoría en grid */}
              <div className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(items).map(([itemKey, itemVal]) => (
                    <div
                      key={itemKey}
                      className="flex items-start gap-2 p-2 rounded-lg bg-white/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50"
                    >
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 capitalize min-w-[80px] flex-shrink-0">
                        {itemKey.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 break-words">
                        {itemVal}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Items planos (sin categoría) */}
      {hasFlatItems && (
        <div className={cn(hasCategories && 'pt-2 border-t border-gray-200 dark:border-gray-700')}>
          {hasCategories && (
            <p className="text-xs text-gray-500 mb-2 font-medium">Otros</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(flatItems).map(([key, val]) => (
              <div
                key={key}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize min-w-[100px] flex-shrink-0">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-gray-800 dark:text-gray-200 break-words">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact display for tables/cards
export function EspecificacionesCompactDisplay({
  value,
  maxItems = 3,
  className
}: {
  value: EspecificacionesValue
  maxItems?: number
  className?: string
}) {
  if (!value || (Array.isArray(value) && value.length === 0) ||
      (!Array.isArray(value) && Object.keys(value).length === 0)) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  const { categories, flatItems } = parseHierarchicalSpecs(value)
  const totalCategories = Object.keys(categories).length
  const totalFlatItems = Object.keys(flatItems).length
  const totalItems = totalCategories + totalFlatItems

  // Mostrar resumen compacto
  const displayItems: { key: string; value: string }[] = []

  // Agregar categorías como items
  Object.entries(categories).forEach(([catName, items]) => {
    const itemCount = Object.keys(items).length
    displayItems.push({
      key: catName,
      value: `${itemCount} specs`
    })
  })

  // Agregar items planos
  Object.entries(flatItems).forEach(([key, val]) => {
    displayItems.push({ key, value: val })
  })

  const visibleItems = displayItems.slice(0, maxItems)
  const remaining = totalItems - maxItems

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleItems.map(({ key, value }, idx) => (
        <Badge
          key={idx}
          variant="outline"
          className="text-xs font-normal bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
        >
          <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
          {!value.includes('specs') && (
            <>
              <span className="mx-1 text-indigo-400">:</span>
              <span className="truncate max-w-[100px]">{value}</span>
            </>
          )}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining} más
        </Badge>
      )}
    </div>
  )
}
