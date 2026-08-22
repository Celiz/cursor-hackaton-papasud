'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface GroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: { id: string; nombre: string; descripcion?: string; color: string } | null
  productoIds?: string[]
  onSuccess: () => void
}

const PRESET_COLORS = [
  { value: 'blue', label: 'Azul', dot: 'bg-blue-500' },
  { value: 'purple', label: 'Violeta', dot: 'bg-purple-500' },
  { value: 'amber', label: 'Ambar', dot: 'bg-amber-500' },
  { value: 'emerald', label: 'Esmeralda', dot: 'bg-emerald-500' },
  { value: 'rose', label: 'Rosa', dot: 'bg-rose-500' },
  { value: 'cyan', label: 'Cyan', dot: 'bg-cyan-500' },
]

export function GroupFormDialog({ open, onOpenChange, group, productoIds, onSuccess }: GroupFormDialogProps) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState('blue')
  const [saving, setSaving] = useState(false)

  const isEditing = !!group

  useEffect(() => {
    if (open) {
      if (group) {
        setNombre(group.nombre)
        setDescripcion(group.descripcion || '')
        setColor(group.color || 'blue')
      } else {
        setNombre('')
        setDescripcion('')
        setColor('blue')
      }
    }
  }, [open, group])

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        color,
      }

      if (isEditing) {
        payload.id = group!.id
      }

      if (!isEditing && productoIds && productoIds.length > 0) {
        payload.producto_ids = productoIds
      }

      const res = await fetch('/api/precios/grupos', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar grupo')

      toast.success(isEditing ? 'Grupo actualizado' : 'Grupo creado')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar grupo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Grupo' : 'Nuevo Grupo'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del grupo de productos.'
              : 'Crea un grupo para organizar productos y aplicar cambios en lote.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-nombre">Nombre *</Label>
            <Input
              id="group-nombre"
              placeholder="Ej: Línea Premium"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-desc">Descripcion</Label>
            <Input
              id="group-desc"
              placeholder="Descripcion opcional del grupo"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${c.dot}`} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEditing && productoIds && productoIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Se agregarán {productoIds.length} producto(s) al grupo.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Grupo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
