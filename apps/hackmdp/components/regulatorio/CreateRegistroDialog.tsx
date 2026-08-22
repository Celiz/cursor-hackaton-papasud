'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { RegEntidad, RegTipoRegistro, RegClaseRiesgo, RegEstadoRegistro } from '@locus/db/schema/regulatory'

interface CreateRegistroDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

interface FormState {
  entidad: RegEntidad
  tipo_registro: RegTipoRegistro
  numero_registro: string
  clase_riesgo: RegClaseRiesgo | ''
  estado: RegEstadoRegistro
  fecha_otorgamiento: string
  fecha_vencimiento: string
  titular: string
  descripcion: string
  disposicion: string
  notas: string
}

const INITIAL_FORM: FormState = {
  entidad: 'anmat',
  tipo_registro: 'producto_medico',
  numero_registro: '',
  clase_riesgo: '',
  estado: 'en_tramite',
  fecha_otorgamiento: '',
  fecha_vencimiento: '',
  titular: '',
  descripcion: '',
  disposicion: '',
  notas: '',
}

export function CreateRegistroDialog({ open, onOpenChange, onCreated }: CreateRegistroDialogProps) {
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setForm({ ...INITIAL_FORM })
      setError(null)
    }
    onOpenChange(open)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.numero_registro.trim()) {
      setError('El numero de registro es obligatorio')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        entidad: form.entidad,
        tipo_registro: form.tipo_registro,
        numero_registro: form.numero_registro.trim(),
        estado: form.estado,
      }

      if (form.entidad === 'anmat' && form.clase_riesgo) {
        payload.clase_riesgo = form.clase_riesgo
      }
      if (form.fecha_otorgamiento) payload.fecha_otorgamiento = form.fecha_otorgamiento
      if (form.fecha_vencimiento) payload.fecha_vencimiento = form.fecha_vencimiento
      if (form.titular.trim()) payload.titular = form.titular.trim()
      if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim()
      if (form.entidad === 'anmat' && form.disposicion.trim()) {
        payload.disposicion = form.disposicion.trim()
      }
      if (form.notas.trim()) payload.notas = form.notas.trim()

      const res = await fetch('/api/regulatorio/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al crear registro')
      }

      setForm({ ...INITIAL_FORM })
      setError(null)
      onCreated()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Registro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Entidad */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Entidad</label>
            <Select value={form.entidad} onValueChange={(v) => updateField('entidad', v as RegEntidad)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anmat">ANMAT</SelectItem>
                <SelectItem value="senasa">SENASA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo registro */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de registro</label>
            <Select value={form.tipo_registro} onValueChange={(v) => updateField('tipo_registro', v as RegTipoRegistro)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="producto_medico">Producto medico</SelectItem>
                <SelectItem value="reactivo">Reactivo</SelectItem>
                <SelectItem value="equipo_importado">Equipo importado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Numero registro */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Numero de registro <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.numero_registro}
              onChange={(e) => updateField('numero_registro', e.target.value)}
              placeholder="PM-1234-56"
              className="h-9"
            />
          </div>

          {/* Clase riesgo - only for ANMAT */}
          {form.entidad === 'anmat' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Clase de riesgo</label>
              <Select
                value={form.clase_riesgo || 'none'}
                onValueChange={(v) => updateField('clase_riesgo', (v === 'none' ? '' : v) as RegClaseRiesgo | '')}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  <SelectItem value="I">Clase I</SelectItem>
                  <SelectItem value="II">Clase II</SelectItem>
                  <SelectItem value="III">Clase III</SelectItem>
                  <SelectItem value="IV">Clase IV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Estado */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
            <Select value={form.estado} onValueChange={(v) => updateField('estado', v as RegEstadoRegistro)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_tramite">En tramite</SelectItem>
                <SelectItem value="vigente">Vigente</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="suspendido">Suspendido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha otorgamiento</label>
              <Input
                type="date"
                value={form.fecha_otorgamiento}
                onChange={(e) => updateField('fecha_otorgamiento', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha vencimiento</label>
              <Input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => updateField('fecha_vencimiento', e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Titular */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Titular</label>
            <Input
              value={form.titular}
              onChange={(e) => updateField('titular', e.target.value)}
              placeholder="Nombre del titular"
              className="h-9"
            />
          </div>

          {/* Descripcion */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripcion</label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => updateField('descripcion', e.target.value)}
              placeholder="Descripcion del producto/equipo registrado"
              rows={2}
            />
          </div>

          {/* Disposicion - only for ANMAT */}
          {form.entidad === 'anmat' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Disposicion</label>
              <Input
                value={form.disposicion}
                onChange={(e) => updateField('disposicion', e.target.value)}
                placeholder="Disp. ANMAT N..."
                className="h-9"
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
            <Textarea
              value={form.notas}
              onChange={(e) => updateField('notas', e.target.value)}
              placeholder="Notas internas..."
              rows={2}
            />
          </div>

          {/* Error display */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Registro
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
