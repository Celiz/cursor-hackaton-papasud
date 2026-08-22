'use client'

import { useState } from 'react'
import useSWR from 'swr'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CreateConteoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: any) => void
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error')
  return Array.isArray(data) ? data : []
}

const TIPO_OPTIONS = [
  { value: 'ciclico', label: 'Cíclico' },
  { value: 'completo', label: 'Completo' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'sorpresa', label: 'Sorpresa' },
]

const CRITERIO_OPTIONS = [
  { value: 'manual', label: 'Selección Manual' },
  { value: 'abc', label: 'Clasificación ABC' },
  { value: 'random', label: 'Aleatorio' },
  { value: 'bins_especificos', label: 'Bins Específicos' },
]

const initialFormData = {
  nombre: '',
  descripcion: '',
  deposito_id: '',
  tipo_conteo: 'ciclico',
  criterio_seleccion: 'manual',
  fecha_programada: '',
}

export function CreateConteoDialog({
  open,
  onOpenChange,
  onSave,
}: CreateConteoDialogProps) {
  const [formData, setFormData] = useState(initialFormData)

  const { data: depositos = [] } = useSWR('/api/inventario/depositos?activo=true', fetcher)

  const handleSave = () => {
    if (!formData.nombre) return

    onSave({
      ...formData,
      deposito_id: formData.deposito_id || null,
      fecha_programada: formData.fecha_programada || null,
    })

    setFormData(initialFormData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    onOpenChange(false)
  }

  const isValid = formData.nombre.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nuevo Conteo Cíclico</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="ej: Conteo Mensual Depósito Principal"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={2}
                placeholder="Descripción del conteo..."
              />
            </div>

            {/* Depósito */}
            <div className="space-y-2">
              <Label htmlFor="deposito_id">Depósito</Label>
              <Select
                value={formData.deposito_id}
                onValueChange={(value) => setFormData({ ...formData, deposito_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los depósitos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los depósitos</SelectItem>
                  {depositos.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      [{d.codigo}] {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de conteo */}
            <div className="space-y-2">
              <Label htmlFor="tipo_conteo">Tipo de Conteo</Label>
              <Select
                value={formData.tipo_conteo}
                onValueChange={(value) => setFormData({ ...formData, tipo_conteo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criterio de selección */}
            <div className="space-y-2">
              <Label htmlFor="criterio_seleccion">Criterio de Selección</Label>
              <Select
                value={formData.criterio_seleccion}
                onValueChange={(value) => setFormData({ ...formData, criterio_seleccion: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRITERIO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha programada */}
            <div className="space-y-2">
              <Label htmlFor="fecha_programada">Fecha Programada</Label>
              <Input
                id="fecha_programada"
                type="date"
                value={formData.fecha_programada}
                onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Crear Conteo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
