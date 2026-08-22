import type { FormFieldDef, TaxCondition } from '../../types'

export const ES_TAX_CONDITIONS: TaxCondition[] = [
  { id: 'autonomo', label: 'Autónomo' },
  { id: 'sl', label: 'Sociedad Limitada (SL)' },
  { id: 'sa', label: 'Sociedad Anónima (SA)' },
  { id: 'cooperativa', label: 'Cooperativa' },
  { id: 'asociacion', label: 'Asociación' },
  { id: 'particular', label: 'Particular' },
  { id: 'otro', label: 'Otro' },
]

export const ES_COMUNIDADES_AUTONOMAS = [
  'Andalucía',
  'Aragón',
  'Asturias',
  'Islas Baleares',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Ceuta',
  'Comunidad Valenciana',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Comunidad de Madrid',
  'Melilla',
  'Región de Murcia',
  'Navarra',
  'País Vasco',
] as const

export const ES_CLIENT_FIELDS: FormFieldDef[] = [
  { name: 'razon_social', label: 'Razón Social / Nombre', type: 'text', required: true },
  { name: 'nif', label: 'NIF / NIE / CIF', type: 'text', required: true, placeholder: '12345678Z' },
  {
    name: 'tipo_empresa',
    label: 'Tipo de Empresa',
    type: 'select',
    required: true,
    options: ES_TAX_CONDITIONS.map((c) => ({ value: c.id, label: c.label })),
  },
  { name: 'email', label: 'Email', type: 'email', required: false },
  { name: 'telefono', label: 'Teléfono', type: 'tel', required: false },
  { name: 'direccion', label: 'Dirección', type: 'text', required: false },
  { name: 'localidad', label: 'Localidad', type: 'text', required: false },
  { name: 'provincia', label: 'Provincia', type: 'text', required: false },
  {
    name: 'comunidad_autonoma',
    label: 'Comunidad Autónoma',
    type: 'select',
    required: false,
    options: ES_COMUNIDADES_AUTONOMAS.map((c) => ({ value: c, label: c })),
  },
  { name: 'codigo_postal', label: 'Código Postal', type: 'text', required: false, placeholder: '28001' },
  {
    name: 'rgpd_consent',
    label: 'Consentimiento RGPD',
    type: 'checkbox',
    required: true,
  },
]

export const ES_ORG_FIELDS: FormFieldDef[] = [
  { name: 'nif', label: 'NIF / CIF', type: 'text', required: true, placeholder: 'B12345678' },
  { name: 'razon_social', label: 'Razón Social', type: 'text', required: true },
  { name: 'domicilio_fiscal', label: 'Domicilio Fiscal', type: 'text', required: true },
  { name: 'localidad', label: 'Localidad', type: 'text', required: true },
  { name: 'provincia', label: 'Provincia', type: 'text', required: true },
  { name: 'codigo_postal', label: 'Código Postal', type: 'text', required: true, placeholder: '28001' },
  { name: 'serie_factura', label: 'Serie de Factura', type: 'text', required: true, placeholder: 'F' },
]
