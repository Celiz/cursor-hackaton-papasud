// AFIP/ARCA Types

export type Ambiente = 'homologacion' | 'produccion'

export interface AfipConfig {
  cuit: string
  cert: string  // PEM certificate content
  key: string   // PEM private key content
  ambiente: Ambiente
  puntoVenta: number
}

export interface WSAACredentials {
  token: string
  sign: string
  generationTime: Date
  expirationTime: Date
}

export type TipoFactura = 'A' | 'B' | 'C'
export type TipoDocumento = 'CUIT' | 'CUIL' | 'DNI' | 'CI' | 'LE' | 'LC' | 'PASSPORT' | 'OTRO'
export type CondicionIva = 'responsable_inscripto' | 'monotributista' | 'exento' | 'consumidor_final'

export interface AlicuotaIva {
  id: number       // AFIP code: 3=0%, 4=10.5%, 5=21%, 6=27%
  baseImp: number  // Base imponible
  importe: number  // Monto IVA
}

export interface ComprobanteRequest {
  tipo: TipoFactura
  concepto: 1 | 2 | 3  // 1=Productos, 2=Servicios, 3=Ambos
  docTipo: number
  docNro: string
  condicionIvaReceptor: number
  impTotal: number
  impNeto: number
  impIva: number
  impTotConc?: number
  impOpEx?: number
  impTrib?: number
  moneda?: string
  cotizacion?: number
  alicuotas?: AlicuotaIva[]
  // Servicios (concepto 2 o 3)
  fechaServDesde?: Date
  fechaServHasta?: Date
  fechaVtoPago?: Date
}

export interface ComprobanteResponse {
  resultado: 'A' | 'R'  // Aprobado / Rechazado
  cae?: string
  caeFchVto?: string
  cbteDesde: number
  cbteHasta: number
  errores?: AfipError[]
  observaciones?: AfipObservacion[]
}

export interface AfipError {
  code: string
  msg: string
}

export interface AfipObservacion {
  code: string
  msg: string
}

// AFIP codes
export const TIPO_FACTURA_CODIGO: Record<TipoFactura, number> = {
  'A': 1,
  'B': 6,
  'C': 11,
}

export const TIPO_DOC_CODIGO: Record<TipoDocumento, number> = {
  'CUIT': 80,
  'CUIL': 86,
  'DNI': 96,
  'CI': 89,
  'LE': 89,
  'LC': 90,
  'PASSPORT': 94,
  'OTRO': 99,
}

export const CONDICION_IVA_CODIGO: Record<CondicionIva, number> = {
  'responsable_inscripto': 1,
  'monotributista': 6,
  'exento': 4,
  'consumidor_final': 5,
}

export const ALICUOTA_IVA: Record<number, number> = {
  0: 3,
  10.5: 4,
  21: 5,
  27: 6,
}
