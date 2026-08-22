'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface ControlRemitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  remito: any | null
  onSuccess: () => void
}

interface ItemState {
  id: string
  descripcion: string
  cantidad: number
  lote: string
  fecha_vencimiento: string
  numero_serie: string
  verificado: boolean
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ControlRemitDialog({ open, onOpenChange, remito, onSuccess }: ControlRemitDialogProps) {
  const [items, setItems] = useState<ItemState[]>([])
  const [notasControl, setNotasControl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (remito && open) {
      const remitoItems = Array.isArray(remito.items) ? remito.items : []
      setItems(
        remitoItems.map((item: any) => ({
          id: item.id,
          descripcion: item.descripcion || '',
          cantidad: item.cantidad ?? 0,
          lote: item.lote || '',
          fecha_vencimiento: item.fecha_vencimiento || '',
          numero_serie: item.numero_serie || '',
          verificado: item.verificado ?? false,
        }))
      )
      setNotasControl('')
    }
  }, [remito, open])

  const allChecked = useMemo(() => items.length > 0 && items.every(i => i.verificado), [items])
  const someChecked = useMemo(() => items.some(i => i.verificado), [items])

  function toggleAll() {
    const newVal = !allChecked
    setItems(prev => prev.map(i => ({ ...i, verificado: newVal })))
  }

  function updateItem(id: string, field: keyof ItemState, value: string | boolean) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)))
  }

  async function handleConfirm() {
    if (!remito) return
    setLoading(true)
    try {
      const res = await fetch(`/api/remitos-compra/${remito.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'controlar',
          notas_control: notasControl || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al controlar remito')
      }
      toast.success('Remito controlado')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al controlar remito')
    } finally {
      setLoading(false)
    }
  }

  if (!remito) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Control de Remito #{remito.numero}</DialogTitle>
          <DialogDescription>
            {remito.proveedor_nombre || 'Sin proveedor'} — {formatDate(remito.fecha)}
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 w-8">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Descripcion</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground w-16">Cant.</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Lote</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-32">Vencimiento</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">N Serie</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    Sin items en este remito
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={item.verificado}
                        onCheckedChange={(v) => updateItem(item.id, 'verificado', !!v)}
                      />
                    </td>
                    <td className="px-3 py-2">{item.descripcion || '-'}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{item.cantidad}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={item.lote}
                        onChange={e => updateItem(item.id, 'lote', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Lote"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="date"
                        value={item.fecha_vencimiento}
                        onChange={e => updateItem(item.id, 'fecha_vencimiento', e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={item.numero_serie}
                        onChange={e => updateItem(item.id, 'numero_serie', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Serie"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Observaciones / Discrepancias
          </label>
          <textarea
            value={notasControl}
            onChange={e => setNotasControl(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Notas sobre el control..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!someChecked || loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Confirmar control
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
