'use client'

import { useState, useEffect } from 'react'
import { FeaturedEquipo, EquipoCatalogo } from '@/lib/types'

// Divisiones disponibles para featured
const FEATURED_DIVISIONS = ['Laboratorios', 'Veterinaria'] as const
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Box, Star, Layers } from 'lucide-react'

interface CreateFeaturedEquipoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<FeaturedEquipo>) => void
  equipos: EquipoCatalogo[]
  defaultDivision?: string | null
  defaultPosicion?: number | null
}

const BADGE_COLOR_OPTIONS = [
  { value: 'primary', label: 'Azul', className: 'bg-blue-100 text-blue-800' },
  { value: 'success', label: 'Verde', className: 'bg-green-100 text-green-800' },
  { value: 'warning', label: 'Amarillo', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'danger', label: 'Rojo', className: 'bg-red-100 text-red-800' },
  { value: 'secondary', label: 'Gris', className: 'bg-gray-100 text-gray-800' },
]

const initialFormData: Partial<FeaturedEquipo> = {
  equipo_id: '',
  custom_features: [],
  badge_text: '',
  badge_color: 'primary',
  featured_division: '',
  posicion: 0,
  activo: true,
  fecha_inicio: undefined,
  fecha_fin: undefined,
}

export function CreateFeaturedEquipoDialog({
  open,
  onOpenChange,
  onSave,
  equipos,
  defaultDivision,
  defaultPosicion,
}: CreateFeaturedEquipoDialogProps) {
  const [formData, setFormData] = useState<Partial<FeaturedEquipo>>(initialFormData)
  const [newFeature, setNewFeature] = useState('')

  // Actualizar cuando cambian los defaults (al abrir desde un slot específico)
  useEffect(() => {
    if (open) {
      setFormData({
        ...initialFormData,
        featured_division: defaultDivision ?? '',
        posicion: defaultPosicion ?? 0,
      })
    }
  }, [open, defaultDivision, defaultPosicion])

  const handleSave = () => {
    if (!formData.equipo_id) return
    onSave(formData)
    setFormData(initialFormData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setNewFeature('')
    onOpenChange(false)
  }

  const addFeature = () => {
    if (!newFeature.trim()) return
    const features = [...(formData.custom_features || []), newFeature.trim()]
    setFormData({ ...formData, custom_features: features })
    setNewFeature('')
  }

  const removeFeature = (index: number) => {
    const features = [...(formData.custom_features || [])]
    features.splice(index, 1)
    setFormData({ ...formData, custom_features: features })
  }

  const selectedEquipo = equipos.find((e) => e.id === formData.equipo_id)

  const isValid = formData.equipo_id

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Nuevo Equipo Destacado
          </DialogTitle>
          {(defaultDivision !== null || defaultPosicion !== null) && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Layers className="h-3 w-3 mr-1" />
                {defaultDivision || 'Laboratorios'}
              </Badge>
              {defaultPosicion !== null && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Posición {defaultPosicion}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Seleccionar Equipo */}
            <div className="space-y-2">
              <Label htmlFor="equipo_id">Equipo *</Label>
              <Select
                value={formData.equipo_id || ''}
                onValueChange={(value) => setFormData({ ...formData, equipo_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar equipo..." />
                </SelectTrigger>
                <SelectContent>
                  {equipos.map((equipo) => (
                    <SelectItem key={equipo.id} value={equipo.id}>
                      {equipo.marca} {equipo.modelo} - {equipo.tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedEquipo && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 mt-2">
                  {selectedEquipo.imagen_url ? (
                    <img
                      src={selectedEquipo.imagen_url}
                      alt={`${selectedEquipo.marca} ${selectedEquipo.modelo}`}
                      className="h-12 w-12 rounded object-contain bg-white"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                      <Box className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{selectedEquipo.marca} {selectedEquipo.modelo}</p>
                    <p className="text-xs text-muted-foreground">{selectedEquipo.tipo}</p>
                  </div>
                </div>
              )}
            </div>

            {/* División */}
            <div className="space-y-2">
              <Label htmlFor="featured_division">División donde destacar</Label>
              <Select
                value={formData.featured_division || ''}
                onValueChange={(value) => setFormData({ ...formData, featured_division: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar división..." />
                </SelectTrigger>
                <SelectContent>
                  {FEATURED_DIVISIONS.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Badge */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Badge</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge_text">Texto del Badge</Label>
                  <Input
                    id="badge_text"
                    value={formData.badge_text || ''}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    placeholder="ej: Nuevo, Destacado, Oferta"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_color">Color del Badge</Label>
                  <Select
                    value={formData.badge_color || 'primary'}
                    onValueChange={(value) => setFormData({ ...formData, badge_color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BADGE_COLOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${option.className}`}>
                              {option.label}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.badge_text && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Vista previa:</span>
                  <Badge
                    variant="outline"
                    className={
                      BADGE_COLOR_OPTIONS.find((o) => o.value === formData.badge_color)?.className
                    }
                  >
                    {formData.badge_text}
                  </Badge>
                </div>
              )}
            </div>

            {/* Custom Features */}
            <div className="space-y-2">
              <Label>Características Personalizadas</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Agregar característica..."
                  onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                />
                <Button type="button" variant="outline" size="icon" onClick={addFeature}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.custom_features && formData.custom_features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.custom_features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      {feature}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1"
                        onClick={() => removeFeature(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Posición y Control */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="posicion">Posición</Label>
                <Input
                  id="posicion"
                  type="number"
                  value={formData.posicion || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, posicion: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_inicio">Fecha Inicio (opcional)</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={formData.fecha_inicio || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_inicio: e.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_fin">Fecha Fin (opcional)</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={formData.fecha_fin || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_fin: e.target.value || undefined })
                  }
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Crear Destacado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
