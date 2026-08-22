'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react'

interface PreviewItem {
  id: string
  nombre: string
  codigo: string
  precio_costo: number
  precio_venta_actual: number
  precio_venta_nuevo: number
}

interface BulkPriceUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onSuccess: () => void
}

const TIPO_OPTIONS = [
  { value: 'margen', label: 'Aplicar Margen %', desc: 'Calcula precio venta a partir del costo + margen' },
  { value: 'precio_fijo', label: 'Precio Fijo', desc: 'Establece un precio fijo para todos' },
  { value: 'ajuste_porcentaje', label: 'Ajuste Porcentual', desc: 'Aumenta o disminuye el precio actual en un %' },
]

export function BulkPriceUpdateDialog({ open, onOpenChange, selectedIds, onSuccess }: BulkPriceUpdateDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [tipo, setTipo] = useState<string>('margen')
  const [valor, setValor] = useState<string>('')
  const [motivo, setMotivo] = useState('')
  const [previewData, setPreviewData] = useState<PreviewItem[]>([])
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const reset = () => {
    setStep(1)
    setTipo('margen')
    setValor('')
    setMotivo('')
    setPreviewData([])
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handlePreview = async () => {
    const numVal = parseFloat(valor)
    if (isNaN(numVal)) {
      toast.error('Ingresa un valor numerico valido')
      return
    }
    if (!motivo.trim()) {
      toast.error('El motivo es requerido')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/precios/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_ids: selectedIds,
          tipo,
          valor: numVal,
          motivo: motivo.trim(),
          preview: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar vista previa')

      setPreviewData(data.preview || [])
      setStep(2)
    } catch (err: any) {
      toast.error(err.message || 'Error al generar vista previa')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    const numVal = parseFloat(valor)
    setConfirming(true)
    try {
      const res = await fetch('/api/precios/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_ids: selectedIds,
          tipo,
          valor: numVal,
          motivo: motivo.trim(),
          preview: false,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar precios')

      toast.success(`${data.updated || previewData.length} precios actualizados`)
      onSuccess()
      handleOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar precios')
    } finally {
      setConfirming(false)
    }
  }

  const avgChange = previewData.length > 0
    ? previewData.reduce((sum, p) => {
        const actual = p.precio_venta_actual || 1
        return sum + ((p.precio_venta_nuevo - p.precio_venta_actual) / actual) * 100
      }, 0) / previewData.length
    : 0

  const fmt = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cambio Masivo de Precios</DialogTitle>
          <DialogDescription>
            {step === 1
              ? `Configura el cambio para ${selectedIds.length} producto(s) seleccionado(s).`
              : 'Revisa los cambios antes de confirmar.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Tipo de cambio</Label>
              <div className="space-y-2">
                {TIPO_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      tipo === opt.value
                        ? 'border-purple-500 bg-purple-500/5'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value={opt.value}
                      checked={tipo === opt.value}
                      onChange={(e) => setTipo(e.target.value)}
                      className="mt-0.5 accent-purple-600"
                    />
                    <div>
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-valor">
                Valor {tipo === 'precio_fijo' ? '($)' : '(%)'}
              </Label>
              <Input
                id="bulk-valor"
                type="number"
                step="0.01"
                placeholder={tipo === 'precio_fijo' ? 'Ej: 15000' : 'Ej: 30'}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-motivo">Motivo *</Label>
              <Input
                id="bulk-motivo"
                placeholder="Ej: Actualización lista proveedor Marzo 2025"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Producto</th>
                      <th className="text-right p-2 font-medium">Costo</th>
                      <th className="text-right p-2 font-medium">Precio Actual</th>
                      <th className="text-right p-2 font-medium">Precio Nuevo</th>
                      <th className="text-right p-2 font-medium">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item) => {
                      const diff = item.precio_venta_nuevo - item.precio_venta_actual
                      const diffPct = item.precio_venta_actual
                        ? ((diff / item.precio_venta_actual) * 100).toFixed(1)
                        : '0.0'
                      return (
                        <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="p-2">
                            <div className="font-medium">{item.nombre}</div>
                            <div className="text-xs text-muted-foreground">{item.codigo}</div>
                          </td>
                          <td className="p-2 text-right text-muted-foreground">{fmt(item.precio_costo)}</td>
                          <td className="p-2 text-right">{fmt(item.precio_venta_actual)}</td>
                          <td className="p-2 text-right font-medium">{fmt(item.precio_venta_nuevo)}</td>
                          <td className={`p-2 text-right ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {diff > 0 ? '+' : ''}{fmt(diff)} ({diffPct}%)
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
              <span className="text-muted-foreground">
                {previewData.length} productos
              </span>
              <span className="font-medium">
                Promedio cambio: {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePreview} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Vista Previa
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={confirming}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar Cambios
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
