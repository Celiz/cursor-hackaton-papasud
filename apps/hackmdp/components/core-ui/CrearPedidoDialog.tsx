'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { OportunidadVenta, OportunidadItem } from '@/lib/types'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Package, Trash2 } from 'lucide-react'

interface CrearPedidoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidad: OportunidadVenta
  onSuccess: (pedidoId: string, pedidoNumero: string) => void
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar')
  return res.json()
}

interface PedidoItemDraft {
  id: string
  producto_id: string | null
  equipo_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
}

export function CrearPedidoDialog({
  open,
  onOpenChange,
  oportunidad,
  onSuccess,
}: CrearPedidoDialogProps) {
  const { data: opItems, isLoading: loadingItems } = useSWR<OportunidadItem[]>(
    open ? `/api/oportunidades-items?oportunidad_id=${oportunidad.id}` : null,
    fetcher
  )

  const [items, setItems] = useState<PedidoItemDraft[]>([])
  const [itemsInitialized, setItemsInitialized] = useState(false)
  const [manualDesc, setManualDesc] = useState('')
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)

  // Initialize items from oportunidades_items when data loads
  if (opItems && !itemsInitialized) {
    if (opItems.length > 0) {
      setItems(opItems.map(item => ({
        id: item.id,
        producto_id: item.producto_id || null,
        equipo_id: item.equipo_id || null,
        descripcion: item.descripcion
          || (item.equipo_marca && item.equipo_modelo
            ? `${item.equipo_marca} ${item.equipo_modelo}`
            : item.producto_nombre || 'Item'),
        cantidad: item.cantidad || 1,
        precio_unitario: item.precio_unitario || item.equipo_precio_lista || item.producto_precio || 0,
      })))
    }
    setItemsInitialized(true)
  }

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setItems([])
      setItemsInitialized(false)
      setManualDesc('')
      setDireccionEntrega('')
      setObservaciones('')
    }
    onOpenChange(open)
  }

  const total = useMemo(() =>
    items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0),
    [items]
  )

  const updateItem = (index: number, field: keyof PedidoItemDraft, value: any) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    // Validate: need items OR manual description
    const hasItems = items.length > 0
    const hasManualDesc = manualDesc.trim().length > 0
    if (!hasItems && !hasManualDesc) {
      toast.error('Agrega al menos un item o una descripcion')
      return
    }

    setSaving(true)
    try {
      // Build pedido items
      const pedidoItems = hasItems
        ? items.map(item => ({
            producto_id: item.producto_id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.cantidad * item.precio_unitario,
          }))
        : [{
            producto_id: null,
            descripcion: manualDesc.trim(),
            cantidad: 1,
            precio_unitario: oportunidad.monto_estimado || 0,
            subtotal: oportunidad.monto_estimado || 0,
          }]

      const subtotal = pedidoItems.reduce((s, i) => s + (i.subtotal || 0), 0)

      // 1. Create pedido
      const pedidoRes = await fetch('/api/pedidos-ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: oportunidad.cliente_id,
          direccion_entrega: direccionEntrega || null,
          observaciones: observaciones || null,
          subtotal,
          iva: 0,
          total: subtotal,
          items: pedidoItems,
        }),
      })

      if (!pedidoRes.ok) {
        const err = await pedidoRes.json()
        throw new Error(err.error || 'Error al crear pedido')
      }

      const pedido = await pedidoRes.json()

      // 2. Link pedido to oportunidad
      const linkRes = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: pedido.id }),
      })

      if (!linkRes.ok) {
        console.error('Error linking pedido to oportunidad')
      }

      toast.success(`Pedido ${pedido.numero} creado`)
      onSuccess(pedido.id, pedido.numero)
      handleOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const clienteNombre = oportunidad.cliente?.nombre
    || oportunidad.cliente?.nombre_fantasia
    || oportunidad.empresa_nombre
    || 'Sin cliente'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Crear Pedido
          </DialogTitle>
          <DialogDescription>
            {oportunidad.nombre}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cliente */}
          <div>
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <p className="text-sm font-medium">{clienteNombre}</p>
          </div>

          {/* Items */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Items</Label>
            {loadingItems ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-md border bg-muted/30">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{item.descripcion}</p>
                      <div className="flex gap-2">
                        <div className="w-20">
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => updateItem(idx, 'cantidad', parseInt(e.target.value) || 1)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.precio_unitario}
                            onChange={(e) => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs"
                            placeholder="Precio"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground self-center">
                          = {formatCurrency(item.cantidad * item.precio_unitario)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="text-right text-sm font-semibold pt-1">
                  Total: {formatCurrency(total)}
                </div>
              </div>
            ) : (
              <div>
                <Textarea
                  placeholder="Describe los items del pedido..."
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
            )}
          </div>

          {/* Direccion */}
          <div>
            <Label className="text-xs text-muted-foreground">Direccion de entrega</Label>
            <Input
              value={direccionEntrega}
              onChange={(e) => setDireccionEntrega(e.target.value)}
              placeholder="Direccion completa..."
              className="text-sm"
            />
          </div>

          {/* Observaciones */}
          <div>
            <Label className="text-xs text-muted-foreground">Observaciones</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas internas para logistica..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
            Crear Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
