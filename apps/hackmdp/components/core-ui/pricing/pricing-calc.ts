export interface PricingState {
  precio_costo: string
  moneda_compra: 'USD' | 'ARS'
  ganancia: string
  precio_venta: string
  moneda: 'USD' | 'ARS'      // moneda del precio de venta
  precio_venta_modo: 'calculado' | 'fijo'
  iva_alicuota?: string
}

export function convMoneda(monto: number, origen: string, destino: string, cotDia: number): number {
  if (!isFinite(monto) || origen === destino) return monto
  if (!cotDia || cotDia <= 0) return monto
  if (origen === 'USD' && destino === 'ARS') return monto * cotDia
  if (origen === 'ARS' && destino === 'USD') return monto / cotDia
  return monto
}

/** Recalcula precio_venta (modo calculado) o ganancia (modo fijo). Devuelve estado nuevo. */
export function recalcPricing(s: PricingState, cotDia: number): PricingState {
  const next = { ...s }
  const costo = parseFloat(next.precio_costo)
  const costoEnVenta = convMoneda(costo, next.moneda_compra, next.moneda, cotDia)
  if (next.precio_venta_modo === 'calculado') {
    const g = parseFloat(next.ganancia)
    if (!isNaN(costoEnVenta) && !isNaN(g)) next.precio_venta = (costoEnVenta * (1 + g / 100)).toFixed(2)
  } else {
    const l = parseFloat(next.precio_venta)
    if (!isNaN(costoEnVenta) && costoEnVenta > 0 && !isNaN(l)) next.ganancia = (((l / costoEnVenta) - 1) * 100).toFixed(2)
  }
  return next
}
