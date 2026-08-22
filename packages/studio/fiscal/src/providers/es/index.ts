import type { FiscalProvider, InvoiceData, InvoiceType, ValidationResult } from '../../types'
import { registerFiscalProvider } from '../../registry'
import { validateNif, formatNif } from './tax-id'
import { ES_TAX_RATES, ES_DEFAULT_TAX_RATE } from './tax-rates'
import { ES_TAX_CONDITIONS, ES_CLIENT_FIELDS, ES_ORG_FIELDS } from './fields'
import { RGPD_EMAIL_FOOTER } from './rgpd'
import { generateSpanishInvoicePdf } from './invoice-pdf'

export { validateNif, formatNif } from './tax-id'
export { ES_TAX_RATES, ES_DEFAULT_TAX_RATE } from './tax-rates'
export { ES_TAX_CONDITIONS, ES_COMUNIDADES_AUTONOMAS, ES_CLIENT_FIELDS, ES_ORG_FIELDS } from './fields'
export { RGPD_CONSENT_TEXT, RGPD_EMAIL_FOOTER, getRgpdConsentText } from './rgpd'
export { generateSpanishInvoicePdf } from './invoice-pdf'
export type { SpanishInvoicePdfOptions } from './invoice-pdf'

const ES_INVOICE_TYPES: InvoiceType[] = [
  { id: 'ordinaria', label: 'Factura Ordinaria', code: 'ORD' },
  { id: 'rectificativa', label: 'Factura Rectificativa', code: 'REC', isCredit: true },
  { id: 'proforma', label: 'Factura Proforma', code: 'PRO' },
]

function validateEsInvoice(data: InvoiceData): ValidationResult {
  const errors: string[] = []

  if (!data.emitter.taxId) {
    errors.push('El NIF/CIF del emisor es obligatorio')
  } else if (!validateNif(data.emitter.taxId)) {
    errors.push('El NIF/CIF del emisor no es válido')
  }

  if (!data.receiver.taxId) {
    errors.push('El NIF/NIE/CIF del receptor es obligatorio')
  } else if (!validateNif(data.receiver.taxId)) {
    errors.push('El NIF/NIE/CIF del receptor no es válido')
  }

  if (!data.items || data.items.length === 0) {
    errors.push('La factura debe tener al menos una línea')
  }

  if (!data.date) {
    errors.push('La fecha es obligatoria')
  }

  return { valid: errors.length === 0, errors }
}

function createSpainProvider(): FiscalProvider {
  return {
    country: 'ES',
    countryName: 'España',
    currency: 'EUR',
    currencySymbol: '€',

    taxId: {
      label: 'NIF/CIF',
      validate: validateNif,
      format: formatNif,
      placeholder: '12345678Z',
    },

    taxRates: ES_TAX_RATES,
    defaultTaxRate: ES_DEFAULT_TAX_RATE,
    taxConditions: ES_TAX_CONDITIONS,

    clientFields: ES_CLIENT_FIELDS,
    orgSetupFields: ES_ORG_FIELDS,

    invoicing: {
      invoiceTypes: ES_INVOICE_TYPES,
      numberFormat: '{serie}-{numero:06d}',
      validateInvoice: validateEsInvoice,
      generatePdf: async (data: InvoiceData) => {
        return generateSpanishInvoicePdf(data, {
          invoiceNumber: data.number ?? 'BORRADOR',
        })
      },
    },

    legal: {
      requiresGdpr: true,
      dataRetentionYears: 6,
      emailFooter: RGPD_EMAIL_FOOTER,
    },
  }
}

registerFiscalProvider('ES', createSpainProvider)
