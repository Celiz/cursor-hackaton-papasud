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

interface CreateBinDialogProps {
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
  { value: 'picking', label: 'Picking' },
  { value: 'reserve', label: 'Reserva' },
  { value: 'receiving', label: 'Recepción' },
  { value: 'shipping', label: 'Envío' },
  { value: 'quarantine', label: 'Cuarentena' },
  { value: 'returns', label: 'Devoluciones' },
]

const initialFormData = {
  deposito_id: '',
  codigo: '',
  nombre: '',
  descripcion: '',
  pasillo: '',
  estanteria: '',
  nivel: '',
  posicion: '',
  tipo: 'picking',
  prioridad: '0',
  capacidad_m3: '',
  capacidad_kg: '',
  capacidad_unidades: '',
  temperatura_min: '',
  temperatura_max: '',
}

export function CreateBinDialog({
  open,
  onOpenChange,
  onSave,
}: CreateBinDialogProps) {
  const [formData, setFormData] = useState(initialFormData)

  const { data: depositos = [] } = useSWR('/api/inventario/depositos?activo=true', fetcher)

  const handleSave = () => {
    if (!formData.deposito_id || !formData.codigo) return

    onSave({
      deposito_id: formData.deposito_id,
      codigo: formData.codigo,
      nombre: formData.nombre || null,
      descripcion: formData.descripcion || null,
      pasillo: formData.pasillo || null,
      estanteria: formData.estanteria || null,
      nivel: formData.nivel ? parseInt(formData.nivel) : null,
      posicion: formData.posicion || null,
      tipo: formData.tipo,
      prioridad: parseInt(formData.prioridad) || 0,
      capacidad_m3: formData.capacidad_m3 ? parseFloat(formData.capacidad_m3) : null,
      capacidad_kg: formData.capacidad_kg ? parseFloat(formData.capacidad_kg) : null,
      capacidad_unidades: formData.capacidad_unidades ? parseInt(formData.capacidad_unidades) : null,
      temperatura_min: formData.temperatura_min ? parseFloat(formData.temperatura_min) : null,
      temperatura_max: formData.temperatura_max ? parseFloat(formData.temperatura_max) : null,
    })

    setFormData(initialFormData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    onOpenChange(false)
  }

  // Generar código automático basado en ubicación
  const generateCode = () => {
    const parts = [
      formData.pasillo,
      formData.estanteria,
      formData.nivel,
      formData.posicion,
    ].filter(Boolean)

    if (parts.length > 0) {
      setFormData({ ...formData, codigo: parts.join('-') })
    }
  }

  const isValid = formData.deposito_id && formData.codigo

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nueva Ubicación (Bin)</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Depósito */}
            <div className="space-y-2">
              <Label htmlFor="deposito_id">Depósito *</Label>
              <Select
                value={formData.deposito_id}
                onValueChange={(value) => setFormData({ ...formData, deposito_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar depósito..." />
                </SelectTrigger>
                <SelectContent>
                  {depositos.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      [{d.codigo}] {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ubicación física */}
            <div className="space-y-2">
              <Label>Ubicación Física</Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Pasillo</Label>
                  <Input
                    value={formData.pasillo}
                    onChange={(e) => setFormData({ ...formData, pasillo: e.target.value.toUpperCase() })}
                    placeholder="A"
                    onBlur={generateCode}
                  />
                </div>
                <div>
                  <Label className="text-xs">Estantería</Label>
                  <Input
                    value={formData.estanteria}
                    onChange={(e) => setFormData({ ...formData, estanteria: e.target.value })}
                    placeholder="05"
                    onBlur={generateCode}
                  />
                </div>
                <div>
                  <Label className="text-xs">Nivel</Label>
                  <Input
                    type="number"
                    value={formData.nivel}
                    onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                    placeholder="3"
                    onBlur={generateCode}
                  />
                </div>
                <div>
                  <Label className="text-xs">Posición</Label>
                  <Input
                    value={formData.posicion}
                    onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
                    placeholder="01"
                    onBlur={generateCode}
                  />
                </div>
              </div>
            </div>

            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="A-05-3-01"
              />
              <p className="text-xs text-muted-foreground">
                Se genera automáticamente al completar la ubicación física
              </p>
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre descriptivo (opcional)"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
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

            {/* Capacidad */}
            <div className="space-y-2">
              <Label>Capacidad</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Unidades</Label>
                  <Input
                    type="number"
                    value={formData.capacidad_unidades}
                    onChange={(e) => setFormData({ ...formData, capacidad_unidades: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">m³</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.capacidad_m3}
                    onChange={(e) => setFormData({ ...formData, capacidad_m3: e.target.value })}
                    placeholder="1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs">kg</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.capacidad_kg}
                    onChange={(e) => setFormData({ ...formData, capacidad_kg: e.target.value })}
                    placeholder="500"
                  />
                </div>
              </div>
            </div>

            {/* Temperatura */}
            <div className="space-y-2">
              <Label>Control de Temperatura (opcional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Temp. Mín (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.temperatura_min}
                    onChange={(e) => setFormData({ ...formData, temperatura_min: e.target.value })}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label className="text-xs">Temp. Máx (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.temperatura_max}
                    onChange={(e) => setFormData({ ...formData, temperatura_max: e.target.value })}
                    placeholder="8"
                  />
                </div>
              </div>
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <Label htmlFor="prioridad">Prioridad de Picking</Label>
              <Input
                id="prioridad"
                type="number"
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Mayor prioridad = se usa primero para picking
              </p>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Crear Bin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
