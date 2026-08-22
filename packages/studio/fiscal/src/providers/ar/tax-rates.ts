import type { TaxRate } from '../../types'

export const AR_TAX_RATES: TaxRate[] = [
  { id: 'iva_21', label: 'IVA 21%', rate: 21, isDefault: true },
  { id: 'iva_10_5', label: 'IVA 10.5%', rate: 10.5 },
  { id: 'iva_27', label: 'IVA 27%', rate: 27 },
  { id: 'iva_exento', label: 'Exento', rate: 0 },
  { id: 'iva_no_gravado', label: 'No gravado', rate: 0 },
]

export const AR_DEFAULT_TAX_RATE = AR_TAX_RATES.find((r) => r.isDefault)!
