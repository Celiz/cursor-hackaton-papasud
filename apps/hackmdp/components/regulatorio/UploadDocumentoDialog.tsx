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
import type { RegTipoDocumento, RegReferenciaTipo } from '@locus/db/schema/regulatory'

// ============================================================================
// Types & Constants
// ============================================================================

interface UploadDocumentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  preselectedRegistroId?: string
}

const TIPO_OPTIONS: { value: RegTipoDocumento; label: string }[] = [
  { value: 'certificado_anmat', label: 'Certificado ANMAT' },
  { value: 'certificado_calidad', label: 'Certificado de Calidad' },
  { value: 'informe_tecnico', label: 'Informe Tecnico' },
  { value: 'disposicion', label: 'Disposicion' },
  { value: 'protocolo', label: 'Protocolo' },
  { value: 'acta_inspeccion', label: 'Acta de Inspeccion' },
  { value: 'calibracion', label: 'Calibracion' },
  { value: 'otro', label: 'Otro' },
]

const REFERENCIA_TIPO_OPTIONS: { value: RegReferenciaTipo; label: string }[] = [
  { value: 'producto', label: 'Producto' },
  { value: 'equipo_instancia', label: 'Equipo (instancia)' },
  { value: 'lote', label: 'Lote' },
  { value: 'reactivo', label: 'Reactivo' },
  { value: 'evento', label: 'Evento' },
]

const INITIAL_FORM = {
  tipo: '' as string,
  nombre: '',
  url: '',
  fecha_emision: '',
  fecha_vencimiento: '',
  registro_id: '',
  referencia_tipo: '' as string,
  referencia_id: '',
  notas: '',
}

// ============================================================================
// Component
// ============================================================================

export function UploadDocumentoDialog({
  open,
  onOpenChange,
  onCreated,
  preselectedRegistroId,
}: UploadDocumentoDialogProps) {
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    registro_id: preselectedRegistroId || '',
  })
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setForm({
      ...INITIAL_FORM,
      registro_id: preselectedRegistroId || '',
    })
  }, [preselectedRegistroId])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }, [onOpenChange, resetForm])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.tipo || !form.nombre.trim()) {
      toast.error('Tipo y nombre son requeridos')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, string | null> = {
        tipo: form.tipo,
        nombre: form.nombre.trim(),
        url: form.url.trim() || null,
        fecha_emision: form.fecha_emision || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        registro_id: form.registro_id.trim() || null,
        referencia_tipo: form.referencia_tipo || null,
        referencia_id: form.referencia_id.trim() || null,
        notas: form.notas.trim() || null,
      }

      const res = await fetch('/api/regulatorio/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear documento')
      }

      toast.success('Documento creado')
      resetForm()
      onOpenChange(false)
      onCreated()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear documento')
    } finally {
      setSaving(false)
    }
  }, [form, onCreated, onOpenChange, resetForm])

  const updateField = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subir Documento</DialogTitle>
          <DialogDescription>
            Registra un nuevo documento regulatorio. La URL puede ser un enlace a Google Drive, SharePoint u otro servicio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={form.tipo} onValueChange={(v) => updateField('tipo', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              placeholder="Nombre del documento"
              required
            />
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input
              value={form.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de emision</Label>
              <Input
                type="date"
                value={form.fecha_emision}
                onChange={(e) => updateField('fecha_emision', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de vencimiento</Label>
              <Input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => updateField('fecha_vencimiento', e.target.value)}
              />
            </div>
          </div>

          {/* Registro ID */}
          <div className="space-y-1.5">
            <Label>ID de Registro asociado</Label>
            <Input
              value={form.registro_id}
              onChange={(e) => updateField('registro_id', e.target.value)}
              placeholder="UUID del registro (opcional)"
            />
          </div>

          {/* Referencia */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de referencia</Label>
              <Select value={form.referencia_tipo} onValueChange={(v) => updateField('referencia_tipo', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional..." />
                </SelectTrigger>
                <SelectContent>
                  {REFERENCIA_TIPO_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ID de referencia</Label>
              <Input
                value={form.referencia_id}
                onChange={(e) => updateField('referencia_id', e.target.value)}
                placeholder="UUID (opcional)"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              value={form.notas}
              onChange={(e) => updateField('notas', e.target.value)}
              placeholder="Observaciones o notas adicionales..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button htmlType="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button htmlType="submit" disabled={saving || !form.tipo || !form.nombre.trim()} loading={saving}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
