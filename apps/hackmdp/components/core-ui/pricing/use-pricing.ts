import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { recalcPricing, convMoneda, type PricingState } from './pricing-calc'

const fetcher = async (url: string) => (await fetch(url)).json()

export function usePricing(initial: Partial<PricingState>, enabled = true) {
  const [state, setState] = useState<PricingState>({
    precio_costo: '', moneda_compra: 'ARS', ganancia: '',
    precio_venta: '', moneda: 'ARS', precio_venta_modo: 'calculado', iva_alicuota: '21',
    ...initial,
  })
  const { data } = useSWR<{ valor_venta?: number }>(enabled ? '/api/cotizaciones' : null, fetcher, {
    dedupingInterval: 2 * 60 * 1000,
  })
  const cotDia = Number(data?.valor_venta) || 0

  const aplicar = (patch: Partial<PricingState>) =>
    setState((prev) => recalcPricing({ ...prev, ...patch }, cotDia))

  useEffect(() => {
    if (!enabled || state.precio_venta_modo !== 'calculado') return
    if (state.moneda_compra === state.moneda) return
    setState((prev) => recalcPricing(prev, cotDia))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotDia, enabled])

  return { state, setState, aplicar, cotDia, convMoneda: (m: number, o: string, d: string) => convMoneda(m, o, d, cotDia) }
}
