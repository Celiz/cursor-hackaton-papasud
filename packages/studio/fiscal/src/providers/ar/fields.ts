import type { FormFieldDef, TaxCondition } from '../../types'

export const AR_TAX_CONDITIONS: TaxCondition[] = [
  { id: 'ri', label: 'Responsable Inscripto' },
  { id: 'monotributista', label: 'Monotributista' },
  { id: 'exento', label: 'Exento' },
  { id: 'consumidor_final', label: 'Consumidor Final' },
]

export const AR_CLIENT_FIELDS: FormFieldDef[] = [
  { name: 'razon_social', label: 'Razón Social', type: 'text', required: true },
  { name: 'cuit', label: 'CUIT', type: 'text', required: false, placeholder: 'XX-XXXXXXXX-X' },
  {
    name: 'condicion_iva',
    label: 'Condición IVA',
    type: 'select',
    required: true,
    options: AR_TAX_CONDITIONS.map((c) => ({ value: c.id, label: c.label })),
  },
  { name: 'email', label: 'Email', type: 'email', required: false },
  { name: 'telefono', label: 'Teléfono', type: 'tel', required: false },
  { name: 'direccion', label: 'Dirección', type: 'text', required: false },
  { name: 'localidad', label: 'Localidad', type: 'text', required: false },
  {
    name: 'provincia',
    label: 'Provincia',
    type: 'select',
    required: false,
    options: [
      'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
      'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
      'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
      'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
      'Tierra del Fuego', 'Tucumán',
    ].map((p) => ({ value: p, label: p })),
  },
  { name: 'cp', label: 'Código Postal', type: 'text', required: false },
]

export const AR_ORG_FIELDS: FormFieldDef[] = [
  { name: 'cuit', label: 'CUIT', type: 'text', required: true, placeholder: 'XX-XXXXXXXX-X' },
  { name: 'razon_social', label: 'Razón Social', type: 'text', required: true },
  { name: 'domicilio', label: 'Domicilio Comercial', type: 'text', required: true },
  {
    name: 'condicion_iva',
    label: 'Condición IVA',
    type: 'select',
    required: true,
    options: AR_TAX_CONDITIONS.filter((c) => c.id !== 'consumidor_final').map((c) => ({
      value: c.id,
      label: c.label,
    })),
  },
  { name: 'punto_venta', label: 'Punto de Venta', type: 'number', required: true, placeholder: '1' },
  {
    name: 'ambiente',
    label: 'Ambiente AFIP',
    type: 'select',
    required: true,
    options: [
      { value: 'testing', label: 'Testing (Homologación)' },
      { value: 'production', label: 'Producción' },
    ],
  },
]
