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
import { Plus, Trash2 } from 'lucide-react'

interface CreateTransferenciaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: any) => void
}

interface ItemTransferencia {
  producto_id: string
  cantidad: number
  observaciones: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error')
  return Array.isArray(data) ? data : (data?.data ?? [])
}

const initialFormData = {
  deposito_origen_id: '',
  deposito_destino_id: '',
  fecha_transferencia: new Date().toISOString().split('T')[0],
  motivo: '',
  observaciones: '',
}

export function CreateTransferenciaDialog({
  open,
  onOpenChange,
  onSave,
}: CreateTransferenciaDialogProps) {
  const [formData, setFormData] = useState(initialFormData)
  const [items, setItems] = useState<ItemTransferencia[]>([])
  const [newItem, setNewItem] = useState<ItemTransferencia>({
    producto_id: '',
    cantidad: 1,
    observaciones: '',
  })

  const { data: depositos = [] } = useSWR('/api/inventario/depositos?activo=true', fetcher)
  const { data: productos = [] } = useSWR('/api/productos?pageSize=1000', fetcher)

  const handleAddItem = () => {
    if (!newItem.producto_id || newItem.cantidad <= 0) return

    setItems([...items, { ...newItem }])
    setNewItem({ producto_id: '', cantidad: 1, observaciones: '' })
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!formData.deposito_origen_id || !formData.deposito_destino_id || items.length === 0) return

    onSave({
      ...formData,
      items,
    })

    setFormData(initialFormData)
    setItems([])
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setItems([])
    onOpenChange(false)
  }

  const isValid =
    formData.deposito_origen_id &&
    formData.deposito_destino_id &&
    formData.deposito_origen_id !== formData.deposito_destino_id &&
    formData.fecha_transferencia &&
    items.length > 0

  // Obtener nombre del producto
  const getProductoNombre = (productoId: string) => {
    const producto = productos.find((p: any) => p.id === productoId)
    return producto ? `${producto.codigo ? `[${producto.codigo}] ` : ''}${producto.nombre}` : productoId
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nueva Transferencia</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Depósitos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deposito_origen_id">Depósito Origen *</Label>
                <Select
                  value={formData.deposito_origen_id}
                  onValueChange={(value) => setFormData({ ...formData, deposito_origen_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar origen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {depositos.map((d: any) => (
                      <SelectItem key={d.id} value={d.id} disabled={d.id === formData.deposito_destino_id}>
                        [{d.codigo}] {d.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposito_destino_id">Depósito Destino *</Label>
                <Select
                  value={formData.deposito_destino_id}
                  onValueChange={(value) => setFormData({ ...formData, deposito_destino_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {depositos.map((d: any) => (
                      <SelectItem key={d.id} value={d.id} disabled={d.id === formData.deposito_origen_id}>
                        [{d.codigo}] {d.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="fecha_transferencia">Fecha de Transferencia *</Label>
              <Input
                id="fecha_transferencia"
                type="date"
                value={formData.fecha_transferencia}
                onChange={(e) => setFormData({ ...formData, fecha_transferencia: e.target.value })}
              />
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="ej: Reposición de stock, Reordenamiento"
              />
            </div>

            {/* Items */}
            <div className="space-y-4">
              <Label>Items a Transferir *</Label>

              {/* Lista de items */}
              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <span className="flex-1 text-sm">{getProductoNombre(item.producto_id)}</span>
                      <span className="font-medium">{item.cantidad} unid.</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Agregar item */}
              <div className="flex gap-2 p-3 border rounded-lg">
                <Select
                  value={newItem.producto_id}
                  onValueChange={(value) => setNewItem({ ...newItem, producto_id: value })}
                >
                  <SelectTrigger className="flex-1">
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
                <Input
                  type="number"
                  min="1"
                  value={newItem.cantidad}
                  onChange={(e) => setNewItem({ ...newItem, cantidad: parseInt(e.target.value) || 1 })}
                  className="w-24"
                  placeholder="Cant."
                />
                <Button onClick={handleAddItem} disabled={!newItem.producto_id}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {items.length} productos, {items.reduce((sum, i) => sum + i.cantidad, 0)} unidades
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!isValid}>
                Crear Transferencia
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
