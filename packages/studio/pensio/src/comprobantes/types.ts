import type { TipoFactura, TipoDocumento, CondicionIva, AlicuotaIva } from '../afip/types'

export interface Comprobante {
  id: string
  org_id: string
  persona_id: string | null  // Cliente
  tipo: TipoFactura
  numero: string            // Formato: 00001-00000001
  fecha: Date
  fecha_vto: Date | null

  // Importes
  subtotal: number
  iva: number
  total: number

  // Items
  items: ComprobanteItem[]

  // AFIP
  cae: string | null
  cae_vto: Date | null
  afip_status: 'pendiente' | 'autorizada' | 'rechazada' | 'error'

  // Meta
  created_at: Date
  updated_at: Date
}

export interface ComprobanteItem {
  id: string
  comprobante_id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva_porcentaje: number
  subtotal: number
}

export interface CreateComprobante {
  org_id: string
  persona_id?: string
  tipo: TipoFactura
  items: Array<{
    descripcion: string
    cantidad: number
    precio_unitario: number
    iva_porcentaje?: number
  }>
  fecha?: Date
  fecha_vto?: Date
}

export interface ComprobanteConPersona extends Comprobante {
  persona_nombre: string | null
  persona_cuit: string | null
  persona_email: string | null
}
