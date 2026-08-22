"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import type { Role, Permiso, Modulo, Accion } from "@/lib/types/roles"
import { MODULO_LABELS, ACCION_LABELS } from "@/lib/types/roles"

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Role> & { permisos?: string[] }) => Promise<void>
  role?: Role | null
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f59e0b', // orange
  '#10b981', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#9333ea', // purple
]

export function RoleFormDialog({ open, onOpenChange, onSave, role }: RoleFormDialogProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    color: '#6366f1',
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Permisos
  const [allPermisos, setAllPermisos] = useState<Permiso[]>([])
  const [selectedPermisos, setSelectedPermisos] = useState<Set<string>>(new Set())
  const [loadingPermisos, setLoadingPermisos] = useState(false)

  // Cargar permisos disponibles
  useEffect(() => {
    if (open) {
      setLoadingPermisos(true)
      fetch('/api/permisos')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAllPermisos(data)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingPermisos(false))
    }
  }, [open])

  // Cargar permisos del rol al editar
  useEffect(() => {
    if (role && open) {
      setFormData({
        nombre: role.nombre || '',
        descripcion: role.descripcion || '',
        color: role.color || '#6366f1',
      })

      // Cargar permisos actuales del rol
      fetch(`/api/roles/${role.id}/permisos`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setSelectedPermisos(new Set(data.map((p: Permiso) => p.id)))
          }
        })
        .catch(console.error)
    } else if (!role && open) {
      setFormData({
        nombre: '',
        descripcion: '',
        color: '#6366f1',
      })
      setSelectedPermisos(new Set())
    }
  }, [role, open])

  // Agrupar permisos por módulo
  const permisosByModulo = useMemo(() => {
    const grouped: Record<string, Permiso[]> = {}
    allPermisos.forEach(permiso => {
      if (!grouped[permiso.modulo]) {
        grouped[permiso.modulo] = []
      }
      grouped[permiso.modulo].push(permiso)
    })
    return grouped
  }, [allPermisos])

  const modulos = Object.keys(permisosByModulo).sort()

  const togglePermiso = (permisoId: string) => {
    setSelectedPermisos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(permisoId)) {
        newSet.delete(permisoId)
      } else {
        newSet.add(permisoId)
      }
      return newSet
    })
  }

  const toggleAllForModulo = (modulo: string) => {
    const moduloPermisos = permisosByModulo[modulo] || []
    const allSelected = moduloPermisos.every(p => selectedPermisos.has(p.id))

    setSelectedPermisos(prev => {
      const newSet = new Set(prev)
      moduloPermisos.forEach(p => {
        if (allSelected) {
          newSet.delete(p.id)
        } else {
          newSet.add(p.id)
        }
      })
      return newSet
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await onSave({
        ...formData,
        permisos: Array.from(selectedPermisos),
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving role:', error)
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = selectedPermisos.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{role ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
          <DialogDescription>
            {role
              ? 'Modifica los detalles y permisos del rol.'
              : 'Crea un nuevo rol y asigna permisos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="permisos" className="flex items-center gap-2">
                  Permisos
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="flex-1 px-6 py-4 space-y-4 overflow-auto">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Rol *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Gerente de Ventas"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe las responsabilidades de este rol"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded border-2 transition-all ${
                        formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-8 w-16"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este color se usará para identificar el rol en la UI
                </p>
              </div>
            </TabsContent>

            <TabsContent value="permisos" className="flex-1 min-h-0 overflow-hidden">
              {loadingPermisos ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[400px] px-6 py-4">
                  <div className="space-y-4">
                    {modulos.map(modulo => {
                      const moduloPermisos = permisosByModulo[modulo]
                      const allSelected = moduloPermisos.every(p => selectedPermisos.has(p.id))
                      const someSelected = moduloPermisos.some(p => selectedPermisos.has(p.id))

                      return (
                        <div key={modulo} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`modulo-${modulo}`}
                                checked={allSelected}
                                // @ts-ignore
                                indeterminate={someSelected && !allSelected}
                                onCheckedChange={() => toggleAllForModulo(modulo)}
                              />
                              <Label
                                htmlFor={`modulo-${modulo}`}
                                className="font-semibold cursor-pointer"
                              >
                                {MODULO_LABELS[modulo as Modulo] || modulo}
                              </Label>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {moduloPermisos.filter(p => selectedPermisos.has(p.id)).length}/{moduloPermisos.length}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {moduloPermisos.map(permiso => (
                              <div
                                key={permiso.id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`permiso-${permiso.id}`}
                                  checked={selectedPermisos.has(permiso.id)}
                                  onCheckedChange={() => togglePermiso(permiso.id)}
                                />
                                <Label
                                  htmlFor={`permiso-${permiso.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {ACCION_LABELS[permiso.accion as Accion] || permiso.accion}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="px-6 py-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !formData.nombre}>
              {saving ? 'Guardando...' : role ? 'Guardar Cambios' : 'Crear Rol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
