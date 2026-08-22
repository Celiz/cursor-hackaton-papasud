'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { usePricing } from './use-pricing'

type Pricing = ReturnType<typeof usePricing>

const MonedaToggle = ({ value, onChange }: { value: string; onChange: (v: 'USD' | 'ARS') => void }) => (
  <Select value={value} onValueChange={(v) => onChange(v as 'USD' | 'ARS')}>
    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
    <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
  </Select>
)

export function PricingSection({ pricing }: { pricing: Pricing }) {
  const { state, aplicar, cotDia } = pricing
  const calc = state.precio_venta_modo === 'calculado'
  return (
    <div className="space-y-4">
      <div>
        <Label>Precio Costo</Label>
        <div className="flex gap-2">
          <Input type="number" step="0.01" value={state.precio_costo} onChange={(e) => aplicar({ precio_costo: e.target.value })} />
          <MonedaToggle value={state.moneda_compra} onChange={(v) => aplicar({ moneda_compra: v })} />
        </div>
      </div>
      <div>
        <Label>Modo de precio</Label>
        <Select value={state.precio_venta_modo} onValueChange={(v) => aplicar({ precio_venta_modo: v as 'calculado' | 'fijo' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="calculado">Calculado (costo + ganancia%)</SelectItem>
            <SelectItem value="fijo">Fijo (ingreso el precio)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ganancia %</Label>
          <Input type="number" step="0.01" value={state.ganancia} onChange={(e) => aplicar({ ganancia: e.target.value })} />
        </div>
        <div>
          <Label>Precio Venta</Label>
          <div className="flex gap-2">
            <Input type="number" step="0.01" value={state.precio_venta} readOnly={calc} onChange={(e) => aplicar({ precio_venta: e.target.value })} />
            <MonedaToggle value={state.moneda} onChange={(v) => aplicar({ moneda: v })} />
          </div>
        </div>
      </div>
      <div>
        <Label>IVA %</Label>
        <Select value={state.iva_alicuota} onValueChange={(v) => aplicar({ iva_alicuota: v })}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="21">21%</SelectItem>
            <SelectItem value="10.5">10.5%</SelectItem>
            <SelectItem value="27">27%</SelectItem>
            <SelectItem value="0">0%</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {state.moneda_compra !== state.moneda && (
        <p className="text-xs text-muted-foreground">Cotización del día: {cotDia > 0 ? `$${cotDia}` : 'no disponible'} (USD↔ARS)</p>
      )}
    </div>
  )
}
