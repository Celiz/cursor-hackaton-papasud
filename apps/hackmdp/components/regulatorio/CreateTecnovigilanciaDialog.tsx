'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface CreateTecnovigilanciaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

const INITIAL_FORM = {
  tipo: '' as string,
  gravedad: '' as string,
  descripcion: '',
  fecha_evento: '',
  fecha_deteccion: todayISO(),
  institucion: '',
  contacto: '',
  notas: '',
}

export function CreateTecnovigilanciaDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTecnovigilanciaDialogProps) {
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM, fecha_deteccion: todayISO() })
  }, [])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    },
    [onOpenChange, resetForm]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!form.tipo || !form.gravedad || !form.descripcion.trim() || !form.fecha_evento || !form.fecha_deteccion) {
        toast.error('Completar los campos requeridos: tipo, gravedad, descripcion, fecha evento y fecha deteccion')
        return
      }

      setSaving(true)
      try {
        const res = await fetch('/api/regulatorio/tecnovigilancia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: form.tipo,
            gravedad: form.gravedad,
            descripcion: form.descripcion.trim(),
            fecha_evento: form.fecha_evento,
            fecha_deteccion: form.fecha_deteccion,
            institucion: form.institucion.trim() || null,
            contacto: form.contacto.trim() || null,
            notas: form.notas.trim() || null,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Error al crear evento')
        }

        resetForm()
        onCreated()
      } catch (err: any) {
        toast.error(err.message || 'Error al crear evento')
      } finally {
        setSaving(false)
      }
    },
    [form, onCreated, resetForm]
  )

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Evento de Tecnovigilancia</DialogTitle>
          <DialogDescription>
            Registrar un evento adverso, accion correctiva o retiro de mercado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={form.tipo} onValueChange={(v) => updateField('tipo', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evento_adverso">Evento Adverso</SelectItem>
                <SelectItem value="accion_correctiva">Accion Correctiva</SelectItem>
                <SelectItem value="retiro_mercado">Retiro de Mercado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gravedad */}
          <div className="space-y-2">
            <Label htmlFor="gravedad">Gravedad *</Label>
            <Select value={form.gravedad} onValueChange={(v) => updateField('gravedad', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar gravedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="moderado">Moderado</SelectItem>
                <SelectItem value="grave">Grave</SelectItem>
                <SelectItem value="muerte">Muerte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripcion */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripcion *</Label>
            <Textarea
              id="descripcion"
              placeholder="Describir el evento..."
              value={form.descripcion}
              onChange={(e) => updateField('descripcion', e.target.value)}
              rows={3}
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_evento">Fecha Evento *</Label>
              <Input
                id="fecha_evento"
                type="date"
                value={form.fecha_evento}
                onChange={(e) => updateField('fecha_evento', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_deteccion">Fecha Deteccion *</Label>
              <Input
                id="fecha_deteccion"
                type="date"
                value={form.fecha_deteccion}
                onChange={(e) => updateField('fecha_deteccion', e.target.value)}
              />
            </div>
          </div>

          {/* Institucion + Contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="institucion">Institucion</Label>
              <Input
                id="institucion"
                placeholder="Nombre de la institucion"
                value={form.institucion}
                onChange={(e) => updateField('institucion', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contacto">Contacto</Label>
              <Input
                id="contacto"
                placeholder="Persona de contacto"
                value={form.contacto}
                onChange={(e) => updateField('contacto', e.target.value)}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              placeholder="Notas adicionales..."
              value={form.notas}
              onChange={(e) => updateField('notas', e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              htmlType="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button htmlType="submit" disabled={saving}>
              {saving ? 'Creando...' : 'Crear Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
