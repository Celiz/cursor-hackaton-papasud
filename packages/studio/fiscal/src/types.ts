import { z } from 'zod'

// ---------------------------------------------------------------------------
// Core scalars
// ---------------------------------------------------------------------------

export type CountryCode = 'AR' | 'ES'

export interface TaxRate {
  id: string
  label: string
  /** Percentage expressed as a number, e.g. 21 for 21 % */
  rate: number
  isDefault?: boolean
}

export interface TaxCondition {
  id: string
  label: string
  description?: string
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'textarea'

export interface FormFieldDef {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  /** Zod schema for runtime validation (optional) */
  schema?: z.ZodTypeAny
}

// ---------------------------------------------------------------------------
// Invoicing
// ---------------------------------------------------------------------------

export interface InvoiceType {
  id: string
  label: string
  /** Short code used in numbering, e.g. 'A', 'B', 'ORD' */
  code: string
  isCredit?: boolean
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  taxRateId: string
  discount?: number
}

export interface InvoiceParty {
  name: string
  taxId: string
  taxConditionId?: string
  address?: string
  email?: string
  [key: string]: unknown
}

export interface TaxBreakdownLine {
  taxRateId: string
  label: string
  rate: number
  base: number
  amount: number
}

export interface InvoiceData {
  type: string
  number?: string
  date: string
  emitter: InvoiceParty
  receiver: InvoiceParty
  items: InvoiceLineItem[]
  taxBreakdown?: TaxBreakdownLine[]
  subtotal: number
  totalTax: number
  total: number
  currency: string
  notes?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface FiscalProvider {
  country: CountryCode
  countryName: string
  currency: string
  currencySymbol: string

  taxId: {
    label: string
    validate: (value: string) => boolean
    format: (value: string) => string
    placeholder: string
  }

  taxRates: TaxRate[]
  defaultTaxRate: TaxRate
  taxConditions: TaxCondition[]

  clientFields: FormFieldDef[]
  orgSetupFields: FormFieldDef[]

  invoicing: {
    invoiceTypes: InvoiceType[]
    /** e.g. "A-{puntoVenta}-{numero}" */
    numberFormat: string
    validateInvoice: (data: InvoiceData) => ValidationResult
    generatePdf?: (data: InvoiceData) => Promise<Uint8Array>
    submitToAuthority?: (data: InvoiceData) => Promise<{ ok: boolean; cae?: string; error?: string }>
  }

  legal: {
    requiresGdpr: boolean
    dataRetentionYears: number
    emailFooter?: string
  }
}
