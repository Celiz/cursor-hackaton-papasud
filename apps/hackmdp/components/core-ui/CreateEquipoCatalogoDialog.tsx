'use client'

import { useState } from 'react'
import { EquipoCatalogo, DivisionCatalogo } from '@/lib/types'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DivisionMultiSelect } from './DivisionMultiSelect'
import { EspecificacionesEditor } from './EspecificacionesEditor'
import { QuickEditableCombobox } from '@/components/ui/quick-editable-combobox'
import useSWR from 'swr'
import { toast } from 'sonner'

const fetcherCatEq = (url: string) => fetch(url).then((r) => r.json())

interface CreateEquipoCatalogoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<EquipoCatalogo>) => void
}

const initialFormData: Partial<EquipoCatalogo> & { subtipo?: string } = {
  marca: '',
  modelo: '',
  tipo: '',
  subtipo: '',
  categoria: '',
  utilidad: '',
  division: [],
  imagen_url: '',
  detalle: '',
  especificaciones: {},
  disponible: true,
  orden: 0,
}

export function CreateEquipoCatalogoDialog({
  open,
  onOpenChange,
  onSave,
}: CreateEquipoCatalogoDialogProps) {
  const [formData, setFormData] = useState<Partial<EquipoCatalogo> & { subtipo?: string }>(initialFormData)

  // Catalogos desde las tablas org-scoped (marcas, tipos_equipos)
  const { data: marcasData, mutate: mutateMarcas } = useSWR<Array<{ nombre: string }>>(
    open ? '/api/marcas' : null,
    fetcherCatEq,
    { dedupingInterval: 2 * 60 * 1000 }
  )
  const { data: tiposData, mutate: mutateTipos } = useSWR<Array<{ nombre: string }>>(
    open ? '/api/tipos-equipos' : null,
    fetcherCatEq,
    { dedupingInterval: 2 * 60 * 1000 }
  )
  const marcasList = (marcasData || []).map((m) => m.nombre).filter(Boolean)
  const tiposList = (tiposData || []).map((t) => t.nombre).filter(Boolean)

  // Subtipos en cascada según la Categoría (familia) elegida → equipos.tipo.
  const { data: subtiposData, mutate: mutateSubtipos } = useSWR<Array<{ nombre: string }>>(
    open && formData.tipo?.trim()
      ? `/api/subtipos-equipos?categoria=${encodeURIComponent(formData.tipo.trim())}`
      : null,
    fetcherCatEq
  )
  const subtiposList = (subtiposData || []).map((s) => s.nombre).filter(Boolean)

  const createCatalog = async (
    endpoint: string,
    mutate: () => void,
    label: string,
    nombre: string,
    extraBody: Record<string, unknown> = {}
  ): Promise<void> => {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, ...extraBody }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || `No se pudo agregar ${label}`)
        return
      }
      const created = await res.json()
      toast.success(`${label} "${created.nombre}" agregado`)
      mutate()
    } catch {
      toast.error(`Error al agregar ${label}`)
    }
  }

  const handleSave = () => {
    if (!formData.marca?.trim() || !formData.modelo?.trim() || !formData.tipo?.trim()) return
    onSave({ ...formData, subtipo: formData.subtipo || null } as Partial<EquipoCatalogo>)
    setFormData(initialFormData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    onOpenChange(false)
  }

  const isValid = formData.marca?.trim() && formData.modelo?.trim() && formData.tipo?.trim()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nuevo Equipo</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Información Básica</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca *</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                    <QuickEditableCombobox
                      value={formData.marca || ''}
                      options={marcasList}
                      placeholder="No se encontraron marcas"
                      searchPlaceholder="Buscar marca..."
                      emptyLabel="Sin marca"
                      triggerClassName="font-normal"
                      onChange={async (v) => {
                        setFormData({ ...formData, marca: v })
                        if (
                          v.trim() &&
                          !marcasList.some((m) => m.toLowerCase() === v.trim().toLowerCase())
                        ) {
                          await createCatalog('/api/marcas', mutateMarcas, 'Marca', v.trim())
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo *</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo || ''}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    placeholder="ej: BC-5000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Categoría *</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                    <QuickEditableCombobox
                      value={formData.tipo || ''}
                      options={tiposList}
                      placeholder="No se encontraron categorías"
                      searchPlaceholder="Buscar categoría..."
                      emptyLabel="Sin categoría"
                      triggerClassName="font-normal"
                      onChange={async (v) => {
                        setFormData({ ...formData, tipo: v, subtipo: '' })
                        if (
                          v.trim() &&
                          !tiposList.some((t) => t.toLowerCase() === v.trim().toLowerCase())
                        ) {
                          await createCatalog('/api/tipos-equipos', mutateTipos, 'Categoría', v.trim())
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtipo">Tipo</Label>
                  <QuickEditableCombobox
                    value={formData.subtipo || ''}
                    options={subtiposList}
                    disabled={!formData.tipo?.trim()}
                    placeholder="No hay tipos para esta categoría"
                    searchPlaceholder="Buscar tipo..."
                    emptyLabel={formData.tipo?.trim() ? 'Sin tipo' : 'Elegí una categoría primero'}
                    onChange={async (v) => {
                      setFormData((prev) => ({ ...prev, subtipo: v }))
                      if (
                        v.trim() &&
                        formData.tipo?.trim() &&
                        !subtiposList.some((s) => s.toLowerCase() === v.trim().toLowerCase())
                      ) {
                        await createCatalog('/api/subtipos-equipos', mutateSubtipos, 'Tipo', v.trim(), { categoria: formData.tipo.trim() })
                      }
                    }}
                  />
                </div>
              </div>

            </div>

            {/* Divisiones */}
            <div className="space-y-2">
              <Label>Divisiones</Label>
              <DivisionMultiSelect
                value={(formData.division as DivisionCatalogo[]) || []}
                onChange={(division) => setFormData({ ...formData, division })}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Descripción</h3>

              <div className="space-y-2">
                <Label htmlFor="utilidad">Utilidad</Label>
                <Input
                  id="utilidad"
                  value={formData.utilidad || ''}
                  onChange={(e) => setFormData({ ...formData, utilidad: e.target.value })}
                  placeholder="Breve descripción del uso"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detalle">Descripción Detallada</Label>
                <Textarea
                  id="detalle"
                  value={formData.detalle || ''}
                  onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                  rows={4}
                  placeholder="Descripción completa para mostrar en la web..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagen_url">URL de Imagen</Label>
                <Input
                  id="imagen_url"
                  value={formData.imagen_url || ''}
                  onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Especificaciones */}
            <div className="space-y-2">
              <Label>Especificaciones Técnicas</Label>
              <EspecificacionesEditor
                value={(formData.especificaciones || {}) as Record<string, unknown> | string[]}
                onChange={(especificaciones) => setFormData({ ...formData, especificaciones: especificaciones as any })}
              />
            </div>

            {/* Control */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Control</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={formData.orden || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="disponible"
                    checked={formData.disponible}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, disponible: checked })
                    }
                  />
                  <Label htmlFor="disponible">Visible en la web</Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Crear Equipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
