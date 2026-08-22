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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Lote } from '@/app/dashboard/inventario/lotes/columns'

interface CreateLoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Lote>) => void
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error')
  return Array.isArray(data) ? data : (data?.data ?? [])
}

const initialFormData = {
  producto_id: '',
  numero_lote: '',
  fecha_fabricacion: '',
  fecha_vencimiento: '',
  proveedor_id: '',
  orden_compra: '',
  cantidad_original: 0,
  costo_unitario: '',
  certificado_calidad: false,
  certificado_anmat: false,
  certificado_url: '',
  notas: '',
}

export function CreateLoteDialog({
  open,
  onOpenChange,
  onSave,
}: CreateLoteDialogProps) {
  const [formData, setFormData] = useState(initialFormData)

  const { data: productos = [] } = useSWR('/api/productos?pageSize=1000', fetcher)
  const { data: proveedores = [] } = useSWR('/api/proveedores', fetcher)

  const handleSave = () => {
    if (!formData.producto_id || !formData.numero_lote || !formData.cantidad_original) return

    onSave({
      producto_id: formData.producto_id,
      numero_lote: formData.numero_lote,
      fecha_fabricacion: formData.fecha_fabricacion || null,
      fecha_vencimiento: formData.fecha_vencimiento || null,
      proveedor_id: formData.proveedor_id || null,
      orden_compra: formData.orden_compra || null,
      cantidad_original: formData.cantidad_original,
      costo_unitario: formData.costo_unitario ? parseFloat(formData.costo_unitario) : null,
      certificado_calidad: formData.certificado_calidad,
      certificado_anmat: formData.certificado_anmat,
      certificado_url: formData.certificado_url || null,
      notas: formData.notas || null,
    } as Partial<Lote>)

    setFormData(initialFormData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    onOpenChange(false)
  }

  const isValid = formData.producto_id && formData.numero_lote && formData.cantidad_original > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nuevo Lote</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Producto */}
            <div className="space-y-2">
              <Label htmlFor="producto_id">Producto *</Label>
              <Select
                value={formData.producto_id}
                onValueChange={(value) => setFormData({ ...formData, producto_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {productos.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo ? `[${p.codigo}] ` : ''}{p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Número de Lote y Cantidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero_lote">Número de Lote *</Label>
                <Input
                  id="numero_lote"
                  value={formData.numero_lote}
                  onChange={(e) => setFormData({ ...formData, numero_lote: e.target.value })}
                  placeholder="ej: LOT-2025-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidad_original">Cantidad *</Label>
                <Input
                  id="cantidad_original"
                  type="number"
                  value={formData.cantidad_original || ''}
                  onChange={(e) => setFormData({ ...formData, cantidad_original: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_fabricacion">Fecha Fabricación</Label>
                <Input
                  id="fecha_fabricacion"
                  type="date"
                  value={formData.fecha_fabricacion}
                  onChange={(e) => setFormData({ ...formData, fecha_fabricacion: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_vencimiento">Fecha Vencimiento</Label>
                <Input
                  id="fecha_vencimiento"
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                />
              </div>
            </div>

            {/* Proveedor y Orden de Compra */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proveedor_id">Proveedor</Label>
                <Select
                  value={formData.proveedor_id}
                  onValueChange={(value) => setFormData({ ...formData, proveedor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin proveedor</SelectItem>
                    {proveedores.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orden_compra">Orden de Compra</Label>
                <Input
                  id="orden_compra"
                  value={formData.orden_compra}
                  onChange={(e) => setFormData({ ...formData, orden_compra: e.target.value })}
                  placeholder="ej: OC-2025-001"
                />
              </div>
            </div>

            {/* Costo */}
            <div className="space-y-2">
              <Label htmlFor="costo_unitario">Costo Unitario</Label>
              <Input
                id="costo_unitario"
                type="number"
                step="0.01"
                value={formData.costo_unitario}
                onChange={(e) => setFormData({ ...formData, costo_unitario: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Certificados */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Certificados</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="certificado_calidad">Certificado de Calidad</Label>
                  <p className="text-xs text-muted-foreground">El lote tiene certificado de calidad</p>
                </div>
                <Switch
                  id="certificado_calidad"
                  checked={formData.certificado_calidad}
                  onCheckedChange={(checked) => setFormData({ ...formData, certificado_calidad: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="certificado_anmat">Certificado ANMAT</Label>
                  <p className="text-xs text-muted-foreground">El lote está certificado por ANMAT</p>
                </div>
                <Switch
                  id="certificado_anmat"
                  checked={formData.certificado_anmat}
                  onCheckedChange={(checked) => setFormData({ ...formData, certificado_anmat: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="certificado_url">URL del Certificado</Label>
                <Input
                  id="certificado_url"
                  value={formData.certificado_url}
                  onChange={(e) => setFormData({ ...formData, certificado_url: e.target.value })}
                  placeholder="https://..."
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
            Crear Lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
