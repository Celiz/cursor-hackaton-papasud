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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CreateSerialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: any) => void
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error')
  return Array.isArray(data) ? data : (data?.data ?? [])
}

const initialFormData = {
  producto_id: '',
  numero_serie: '',
  lote_id: '',
  deposito_id: '',
  bin_id: '',
  garantia_meses: '',
  costo_adquisicion: '',
}

export function CreateSerialDialog({
  open,
  onOpenChange,
  onSave,
}: CreateSerialDialogProps) {
  const [formData, setFormData] = useState(initialFormData)

  const { data: productos = [] } = useSWR('/api/productos?pageSize=1000', fetcher)
  const { data: lotes = [] } = useSWR('/api/inventario/lotes', fetcher)
  const { data: depositos = [] } = useSWR('/api/inventario/depositos', fetcher)
  const { data: bins = [] } = useSWR(
    formData.deposito_id ? `/api/inventario/bins?deposito_id=${formData.deposito_id}` : null,
    fetcher
  )

  const handleSave = () => {
    if (!formData.producto_id || !formData.numero_serie) return

    onSave({
      producto_id: formData.producto_id,
      numero_serie: formData.numero_serie,
      lote_id: formData.lote_id || null,
      deposito_id: formData.deposito_id || null,
      bin_id: formData.bin_id || null,
      garantia_meses: formData.garantia_meses ? parseInt(formData.garantia_meses) : null,
      costo_adquisicion: formData.costo_adquisicion ? parseFloat(formData.costo_adquisicion) : null,
    })

    setFormData(initialFormData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    onOpenChange(false)
  }

  // Filtrar lotes por producto seleccionado
  const filteredLotes = formData.producto_id
    ? lotes.filter((l: any) => l.producto_id === formData.producto_id)
    : lotes

  const isValid = formData.producto_id && formData.numero_serie

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nuevo Número de Serie</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Producto */}
            <div className="space-y-2">
              <Label htmlFor="producto_id">Producto *</Label>
              <Select
                value={formData.producto_id}
                onValueChange={(value) => setFormData({ ...formData, producto_id: value, lote_id: '' })}
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

            {/* Número de Serie */}
            <div className="space-y-2">
              <Label htmlFor="numero_serie">Número de Serie *</Label>
              <Input
                id="numero_serie"
                value={formData.numero_serie}
                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                placeholder="ej: SN-2025-00001"
              />
            </div>

            {/* Lote */}
            <div className="space-y-2">
              <Label htmlFor="lote_id">Lote</Label>
              <Select
                value={formData.lote_id}
                onValueChange={(value) => setFormData({ ...formData, lote_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar lote..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin lote</SelectItem>
                  {filteredLotes.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.numero_lote}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Depósito */}
            <div className="space-y-2">
              <Label htmlFor="deposito_id">Depósito</Label>
              <Select
                value={formData.deposito_id}
                onValueChange={(value) => setFormData({ ...formData, deposito_id: value, bin_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar depósito..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin depósito</SelectItem>
                  {depositos.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bin */}
            {formData.deposito_id && (
              <div className="space-y-2">
                <Label htmlFor="bin_id">Ubicación (Bin)</Label>
                <Select
                  value={formData.bin_id}
                  onValueChange={(value) => setFormData({ ...formData, bin_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin bin</SelectItem>
                    {(bins || []).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.codigo || b.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Garantía */}
            <div className="space-y-2">
              <Label htmlFor="garantia_meses">Meses de Garantía</Label>
              <Input
                id="garantia_meses"
                type="number"
                value={formData.garantia_meses}
                onChange={(e) => setFormData({ ...formData, garantia_meses: e.target.value })}
                placeholder="12"
              />
            </div>

            {/* Costo */}
            <div className="space-y-2">
              <Label htmlFor="costo_adquisicion">Costo de Adquisición</Label>
              <Input
                id="costo_adquisicion"
                type="number"
                step="0.01"
                value={formData.costo_adquisicion}
                onChange={(e) => setFormData({ ...formData, costo_adquisicion: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Crear Serial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
