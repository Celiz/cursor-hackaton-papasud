import type { TaxRate } from '../../types'

export const ES_TAX_RATES: TaxRate[] = [
  { id: 'iva_general', label: 'IVA General 21%', rate: 21, isDefault: true },
  { id: 'iva_reducido', label: 'IVA Reducido 10%', rate: 10 },
  { id: 'iva_superreducido', label: 'IVA Superreducido 4%', rate: 4 },
  { id: 'iva_exento', label: 'Exento', rate: 0 },
]

export const ES_DEFAULT_TAX_RATE = ES_TAX_RATES.find((r) => r.isDefault)!
