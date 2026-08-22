'use client'

import { useState } from 'react'
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

interface CreateDepositoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: any) => void
}

const TIPO_OPTIONS = [
  { value: 'almacen', label: 'Almacén' },
  { value: 'tienda', label: 'Tienda' },
  { value: 'frigorifico', label: 'Frigorífico' },
  { value: 'transito', label: 'Tránsito' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'cuarentena', label: 'Cuarentena' },
]

const initialFormData = {
  codigo: '',
  nombre: '',
  tipo: 'almacen',
  direccion: '',
  ciudad: '',
  provincia: '',
  codigo_postal: '',
  telefono: '',
  responsable: '',
  capacidad_m3: '',
  temperatura_controlada: false,
  temperatura_min: '',
  temperatura_max: '',
  requiere_autorizacion: false,
  permite_picking: true,
  permite_recepcion: true,
  es_principal: false,
  notas: '',
}

export function CreateDepositoDialog({
  open,
  onOpenChange,
  onSave,
}: CreateDepositoDialogProps) {
  const [formData, setFormData] = useState(initialFormData)

  const handleSave = () => {
    if (!formData.codigo || !formData.nombre || !formData.tipo) return

    onSave({
      codigo: formData.codigo,
      nombre: formData.nombre,
      tipo: formData.tipo,
      direccion: formData.direccion || null,
      ciudad: formData.ciudad || null,
      provincia: formData.provincia || null,
      codigo_postal: formData.codigo_postal || null,
      telefono: formData.telefono || null,
      responsable: formData.responsable || null,
      capacidad_m3: formData.capacidad_m3 ? parseFloat(formData.capacidad_m3) : null,
      temperatura_controlada: formData.temperatura_controlada,
      temperatura_min: formData.temperatura_min ? parseFloat(formData.temperatura_min) : null,
      temperatura_max: formData.temperatura_max ? parseFloat(formData.temperatura_max) : null,
      requiere_autorizacion: formData.requiere_autorizacion,
      permite_picking: formData.permite_picking,
      permite_recepcion: formData.permite_recepcion,
      es_principal: formData.es_principal,
      notas: formData.notas || null,
    })

    setFormData(initialFormData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    onOpenChange(false)
  }

  const isValid = formData.codigo && formData.nombre && formData.tipo

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nuevo Depósito</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Código y Nombre */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="DEP-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Depósito Principal"
                />
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
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

            {/* Responsable y Teléfono */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsable">Responsable</Label>
                <Input
                  id="responsable"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Av. Ejemplo 1234"
              />
            </div>

            {/* Ciudad, Provincia, CP */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  value={formData.provincia}
                  onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_postal">CP</Label>
                <Input
                  id="codigo_postal"
                  value={formData.codigo_postal}
                  onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                />
              </div>
            </div>

            {/* Capacidad */}
            <div className="space-y-2">
              <Label htmlFor="capacidad_m3">Capacidad (m³)</Label>
              <Input
                id="capacidad_m3"
                type="number"
                value={formData.capacidad_m3}
                onChange={(e) => setFormData({ ...formData, capacidad_m3: e.target.value })}
                placeholder="100"
              />
            </div>

            {/* Temperatura */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Temperatura Controlada</Label>
                  <p className="text-xs text-muted-foreground">Requiere control de temperatura</p>
                </div>
                <Switch
                  checked={formData.temperatura_controlada}
                  onCheckedChange={(checked) => setFormData({ ...formData, temperatura_controlada: checked })}
                />
              </div>

              {formData.temperatura_controlada && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperatura_min">Temp. Mínima (°C)</Label>
                    <Input
                      id="temperatura_min"
                      type="number"
                      value={formData.temperatura_min}
                      onChange={(e) => setFormData({ ...formData, temperatura_min: e.target.value })}
                      placeholder="2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperatura_max">Temp. Máxima (°C)</Label>
                    <Input
                      id="temperatura_max"
                      type="number"
                      value={formData.temperatura_max}
                      onChange={(e) => setFormData({ ...formData, temperatura_max: e.target.value })}
                      placeholder="8"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Permisos */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Operaciones</h3>

              <div className="flex items-center justify-between">
                <Label>Permite Picking</Label>
                <Switch
                  checked={formData.permite_picking}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_picking: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Permite Recepción</Label>
                <Switch
                  checked={formData.permite_recepcion}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_recepcion: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Requiere Autorización</Label>
                <Switch
                  checked={formData.requiere_autorizacion}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiere_autorizacion: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Depósito Principal</Label>
                <Switch
                  checked={formData.es_principal}
                  onCheckedChange={(checked) => setFormData({ ...formData, es_principal: checked })}
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Crear Depósito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
