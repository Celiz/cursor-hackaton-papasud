import type { FiscalProvider, InvoiceData, InvoiceType, ValidationResult } from '../../types'
import { registerFiscalProvider } from '../../registry'
import { validateCuit, formatCuit } from './tax-id'
import { AR_TAX_RATES, AR_DEFAULT_TAX_RATE } from './tax-rates'
import { AR_TAX_CONDITIONS, AR_CLIENT_FIELDS, AR_ORG_FIELDS } from './fields'

export { validateCuit, formatCuit } from './tax-id'
export { AR_TAX_RATES, AR_DEFAULT_TAX_RATE } from './tax-rates'
export { AR_TAX_CONDITIONS, AR_CLIENT_FIELDS, AR_ORG_FIELDS } from './fields'

const AR_INVOICE_TYPES: InvoiceType[] = [
  { id: 'A', label: 'Factura A', code: 'A' },
  { id: 'B', label: 'Factura B', code: 'B' },
  { id: 'C', label: 'Factura C', code: 'C' },
  { id: 'NC_A', label: 'Nota de Crédito A', code: 'NCA', isCredit: true },
  { id: 'NC_B', label: 'Nota de Crédito B', code: 'NCB', isCredit: true },
  { id: 'NC_C', label: 'Nota de Crédito C', code: 'NCC', isCredit: true },
]

function validateArInvoice(data: InvoiceData): ValidationResult {
  const errors: string[] = []

  if (!data.emitter.taxId) {
    errors.push('El CUIT del emisor es obligatorio')
  } else if (!validateCuit(data.emitter.taxId)) {
    errors.push('El CUIT del emisor no es válido')
  }

  // Factura A requires receiver CUIT
  if (data.type === 'A' || data.type === 'NC_A') {
    if (!data.receiver.taxId) {
      errors.push('El CUIT del receptor es obligatorio para comprobantes tipo A')
    } else if (!validateCuit(data.receiver.taxId)) {
      errors.push('El CUIT del receptor no es válido')
    }
  }

  if (!data.items || data.items.length === 0) {
    errors.push('La factura debe tener al menos un ítem')
  }

  if (!data.date) {
    errors.push('La fecha es obligatoria')
  }

  return { valid: errors.length === 0, errors }
}

function createArgentinaProvider(): FiscalProvider {
  return {
    country: 'AR',
    countryName: 'Argentina',
    currency: 'ARS',
    currencySymbol: '$',

    taxId: {
      label: 'CUIT',
      validate: validateCuit,
      format: formatCuit,
      placeholder: 'XX-XXXXXXXX-X',
    },

    taxRates: AR_TAX_RATES,
    defaultTaxRate: AR_DEFAULT_TAX_RATE,
    taxConditions: AR_TAX_CONDITIONS,

    clientFields: AR_CLIENT_FIELDS,
    orgSetupFields: AR_ORG_FIELDS,

    invoicing: {
      invoiceTypes: AR_INVOICE_TYPES,
      numberFormat: '{code}-{puntoVenta:05d}-{numero:08d}',
      validateInvoice: validateArInvoice,
    },

    legal: {
      requiresGdpr: false,
      dataRetentionYears: 10,
    },
  }
}

registerFiscalProvider('AR', createArgentinaProvider)
