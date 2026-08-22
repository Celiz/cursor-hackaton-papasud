'use client'

import { useState } from 'react'
import { ProductoCatalogo, DivisionCatalogo } from '@/lib/types'
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
import { DivisionMultiSelect } from './DivisionMultiSelect'

interface CreateProductoCatalogoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<ProductoCatalogo>) => void
}

const initialFormData: Partial<ProductoCatalogo> = {
  nombre: '',
  codigo: '',
  descripcion: '',
  tipo: 'insumo',
  categoria: '',
  marca: '',
  precio_lista: undefined,
  precio_final: undefined,
  moneda: 'ARS',
  disponible: true,
  stock: 0,
  imagen_url: '',
  division: [],
}

export function CreateProductoCatalogoDialog({
  open,
  onOpenChange,
  onSave,
}: CreateProductoCatalogoDialogProps) {
  const [formData, setFormData] = useState<Partial<ProductoCatalogo>>(initialFormData)

  const handleSave = () => {
    if (!formData.nombre?.trim()) return
    onSave(formData)
    setFormData(initialFormData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    onOpenChange(false)
  }

  const isValid = formData.nombre?.trim()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Información Básica</h3>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del producto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="SKU o código interno"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo || 'insumo'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value as 'insumo' | 'accesorio' | 'repuesto' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insumo">Insumo</SelectItem>
                      <SelectItem value="accesorio">Accesorio</SelectItem>
                      <SelectItem value="repuesto">Repuesto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="ej: Reactivos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca || ''}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    placeholder="Marca del producto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* Divisiones */}
            <div className="space-y-2">
              <Label>Divisiones</Label>
              <DivisionMultiSelect
                value={(formData.division as DivisionCatalogo[]) || []}
                onChange={(division) => setFormData({ ...formData, division })}
              />
            </div>

            {/* Precios */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Precios y Stock</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda</Label>
                  <Select
                    value={formData.moneda || 'ARS'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, moneda: value as 'ARS' | 'USD' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS ($)</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio_lista">Precio Lista</Label>
                  <Input
                    id="precio_lista"
                    type="number"
                    value={formData.precio_lista || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precio_lista: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio_final">Precio Final</Label>
                  <Input
                    id="precio_final"
                    type="number"
                    value={formData.precio_final || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precio_final: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* Imagen */}
            <div className="space-y-2">
              <Label htmlFor="imagen_url">URL de Imagen</Label>
              <Input
                id="imagen_url"
                value={formData.imagen_url || ''}
                onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* Control */}
            <div className="flex items-center space-x-2">
              <Switch
                id="disponible"
                checked={formData.disponible}
                onCheckedChange={(checked) => setFormData({ ...formData, disponible: checked })}
              />
              <Label htmlFor="disponible">Visible en la web</Label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Crear Producto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
