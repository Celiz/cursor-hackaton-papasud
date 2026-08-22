/**
 * Tipos TypeScript para integración con ARCA (ex-AFIP)
 * Facturación Electrónica Argentina
 */

// ========================================
// CONFIGURACIÓN
// ========================================
export interface ArcaConfig {
  id: string;
  cuit_emisor: string;
  razon_social: string;
  domicilio_comercial?: string;
  condicion_iva: CondicionIVA;
  punto_venta: string;
  ambiente: ArcaAmbiente;
  certificado_crt?: string;
  certificado_key?: string;
  certificado_crt_prod?: string;
  certificado_key_prod?: string;
  token_wsaa?: string;
  token_sign?: string;
  token_expira?: string;
  inicio_actividades?: string;
  iibb?: string;
  created_at: string;
  updated_at: string;
}

export type ArcaAmbiente = 'homologacion' | 'produccion';

export type CondicionIVA =
  | 'responsable_inscripto'
  | 'monotributista'
  | 'exento'
  | 'consumidor_final'
  | 'responsable_no_inscripto'
  | 'sujeto_no_categorizado';

// ========================================
// TIPOS DE COMPROBANTE
// ========================================
export const TIPOS_COMPROBANTE = {
  1: { codigo: 1, nombre: 'Factura A', letra: 'A' },
  2: { codigo: 2, nombre: 'Nota de Débito A', letra: 'A' },
  3: { codigo: 3, nombre: 'Nota de Crédito A', letra: 'A' },
  6: { codigo: 6, nombre: 'Factura B', letra: 'B' },
  7: { codigo: 7, nombre: 'Nota de Débito B', letra: 'B' },
  8: { codigo: 8, nombre: 'Nota de Crédito B', letra: 'B' },
  11: { codigo: 11, nombre: 'Factura C', letra: 'C' },
  12: { codigo: 12, nombre: 'Nota de Débito C', letra: 'C' },
  13: { codigo: 13, nombre: 'Nota de Crédito C', letra: 'C' },
  51: { codigo: 51, nombre: 'Factura M', letra: 'M' },
  52: { codigo: 52, nombre: 'Nota de Débito M', letra: 'M' },
  53: { codigo: 53, nombre: 'Nota de Crédito M', letra: 'M' },
} as const;

export type TipoComprobante = keyof typeof TIPOS_COMPROBANTE;

// Mapeo de tipo_factura (A, B, C) a código ARCA
export const TIPO_FACTURA_A_CODIGO: Record<string, number> = {
  A: 1,
  B: 6,
  C: 11,
};

export const TIPO_NC_A_CODIGO: Record<string, number> = {
  A: 3,
  B: 8,
  C: 13,
};

export const TIPO_ND_A_CODIGO: Record<string, number> = {
  A: 2,
  B: 7,
  C: 12,
};

// ========================================
// TIPOS DE DOCUMENTO
// ========================================
export const TIPOS_DOCUMENTO = {
  80: { codigo: 80, nombre: 'CUIT' },
  86: { codigo: 86, nombre: 'CUIL' },
  96: { codigo: 96, nombre: 'DNI' },
  87: { codigo: 87, nombre: 'CDI' },
  89: { codigo: 89, nombre: 'LE' },
  90: { codigo: 90, nombre: 'LC' },
  91: { codigo: 91, nombre: 'CI Extranjera' },
  92: { codigo: 92, nombre: 'en trámite' },
  93: { codigo: 93, nombre: 'Acta Nacimiento' },
  94: { codigo: 94, nombre: 'Pasaporte' },
  95: { codigo: 95, nombre: 'CI Buenos Aires' },
  99: { codigo: 99, nombre: 'Doc. (Otro)' },
  0: { codigo: 0, nombre: 'CI Policía Federal' },
} as const;

export type TipoDocumento = keyof typeof TIPOS_DOCUMENTO;

// Mapeo de tipo_documento texto a código ARCA
export const TIPO_DOC_A_CODIGO: Record<string, number> = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  CDI: 87,
  LE: 89,
  LC: 90,
  PASAPORTE: 94,
  OTRO: 99,
};

// ========================================
// ALÍCUOTAS IVA
// ========================================
export const ALICUOTAS_IVA = {
  3: { id: 3, descripcion: '0%', porcentaje: 0 },
  4: { id: 4, descripcion: '10.5%', porcentaje: 10.5 },
  5: { id: 5, descripcion: '21%', porcentaje: 21 },
  6: { id: 6, descripcion: '27%', porcentaje: 27 },
  8: { id: 8, descripcion: '5%', porcentaje: 5 },
  9: { id: 9, descripcion: '2.5%', porcentaje: 2.5 },
} as const;

export type AlicuotaIVAId = keyof typeof ALICUOTAS_IVA;

// Mapeo de porcentaje a código ARCA
export const PORCENTAJE_A_ALICUOTA: Record<number, number> = {
  0: 3,
  2.5: 9,
  5: 8,
  10.5: 4,
  21: 5,
  27: 6,
};

// ========================================
// CONDICIÓN IVA RECEPTOR
// ========================================
export const CONDICIONES_IVA = {
  1: { codigo: 1, nombre: 'IVA Responsable Inscripto', facturas: ['A', 'M'] },
  4: { codigo: 4, nombre: 'IVA Sujeto Exento', facturas: ['A', 'M'] },
  5: { codigo: 5, nombre: 'Consumidor Final', facturas: ['B'] },
  6: { codigo: 6, nombre: 'Responsable Monotributo', facturas: ['B'] },
  8: { codigo: 8, nombre: 'Proveedor del Exterior', facturas: ['B'] },
  9: { codigo: 9, nombre: 'Cliente del Exterior', facturas: ['B'] },
  10: { codigo: 10, nombre: 'IVA Liberado – Ley Nº 19.640', facturas: ['B'] },
  13: { codigo: 13, nombre: 'Monotributista Social', facturas: ['B'] },
  15: { codigo: 15, nombre: 'IVA No Alcanzado', facturas: ['B'] },
} as const;

export type CondicionIVAReceptor = keyof typeof CONDICIONES_IVA;

// Mapeo de condicion_iva texto a código ARCA
export const CONDICION_IVA_A_CODIGO: Record<string, number> = {
  responsable_inscripto: 1,
  monotributista: 6,
  exento: 4,
  consumidor_final: 5,
  responsable_no_inscripto: 5,
  sujeto_no_categorizado: 5,
};

// ========================================
// MONEDAS
// ========================================
export const MONEDAS = {
  PES: { codigo: 'PES', nombre: 'Pesos Argentinos', cotizacion: 1 },
  DOL: { codigo: 'DOL', nombre: 'Dólar Estadounidense', cotizacion: null },
  '012': { codigo: '012', nombre: 'Real', cotizacion: null },
  '014': { codigo: '014', nombre: 'Peso Uruguayo', cotizacion: null },
  '018': { codigo: '018', nombre: 'Corona Sueca', cotizacion: null },
  '019': { codigo: '019', nombre: 'Corona Noruega', cotizacion: null },
  '021': { codigo: '021', nombre: 'Euro', cotizacion: null },
  '060': { codigo: '060', nombre: 'Peso Chileno', cotizacion: null },
} as const;

export type Moneda = keyof typeof MONEDAS;

// ========================================
// REQUEST/RESPONSE FACTURACIÓN
// ========================================
export interface FacturaArcaRequest {
  // Datos del comprobante
  tipo_comprobante: number;
  punto_venta: number;
  concepto: 1 | 2 | 3; // 1=Productos, 2=Servicios, 3=Productos y Servicios

  // Datos del receptor
  doc_tipo: number;
  doc_nro: string;

  // Importes
  imp_total: number;
  imp_neto: number; // Base imponible
  imp_iva: number;
  imp_trib?: number; // Otros tributos
  imp_op_ex?: number; // Operaciones exentas
  imp_tot_conc?: number; // No gravado

  // Fechas
  fecha_cbte: string; // YYYYMMDD
  fecha_serv_desde?: string; // Para concepto 2 o 3
  fecha_serv_hasta?: string; // Para concepto 2 o 3
  fecha_vto_pago?: string; // Para concepto 2 o 3

  // Moneda
  mon_id: string;
  mon_cotiz: number;

  // Alícuotas IVA (array)
  iva?: AlicuotaItem[];

  // Tributos (array)
  tributos?: TributoItem[];

  // Comprobantes asociados (para NC/ND)
  cbtes_asoc?: ComprobanteAsociado[];

  // Opcionales
  opcionales?: OpcionalesItem[];
}

export interface AlicuotaItem {
  id: number; // Código de alícuota (3, 4, 5, 6, 8, 9)
  base_imp: number; // Base imponible para esta alícuota
  importe: number; // Importe de IVA
}

export interface TributoItem {
  id: number; // Tipo de tributo
  desc: string;
  base_imp: number;
  alic: number;
  importe: number;
}

export interface ComprobanteAsociado {
  tipo: number;
  pto_vta: number;
  nro: number;
  cuit?: string;
  fecha?: string;
}

export interface OpcionalesItem {
  id: string;
  valor: string;
}

export interface FacturaArcaResponse {
  // Resultado
  resultado: 'A' | 'R' | 'P'; // Aprobado, Rechazado, Parcial
  cae?: string;
  cae_fch_vto?: string; // YYYYMMDD

  // Números
  cbte_desde: number;
  cbte_hasta: number;

  // Errores y observaciones
  errores?: ArcaError[];
  observaciones?: ArcaObservacion[];

  // Evento
  eventos?: ArcaEvento[];
}

export interface ArcaError {
  code: string;
  msg: string;
}

export interface ArcaObservacion {
  code: string;
  msg: string;
}

export interface ArcaEvento {
  code: string;
  msg: string;
}

// ========================================
// LOG DE COMPROBANTES
// ========================================
export interface ArcaComprobanteLog {
  id: string;
  factura_id?: string;
  tipo_comprobante: number;
  punto_venta: string;
  numero_comprobante?: number;
  cae?: string;
  cae_vto?: string;
  resultado?: string;
  request_xml?: string;
  response_xml?: string;
  errores?: ArcaError[];
  observaciones?: ArcaObservacion[];
  ambiente: ArcaAmbiente;
  created_at: string;
}

// ========================================
// QR DATA
// ========================================
export interface QRData {
  ver: 1;
  fecha: string; // YYYY-MM-DD
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda: string;
  ctz: number;
  tipoDocRec: number;
  nroDocRec: number;
  tipoCodAut: 'E' | 'A'; // E=CAE, A=CAEA
  codAut: number;
}

// ========================================
// HELPERS
// ========================================

/**
 * Determina el tipo de factura según la condición IVA del emisor y receptor
 */
export function determinarTipoFactura(
  condicionEmisor: CondicionIVA,
  condicionReceptor: string
): 'A' | 'B' | 'C' {
  // Monotributistas siempre emiten C
  if (condicionEmisor === 'monotributista') {
    return 'C';
  }

  // Exentos siempre emiten C
  if (condicionEmisor === 'exento') {
    return 'C';
  }

  // Responsable Inscripto
  if (condicionEmisor === 'responsable_inscripto') {
    const receptorCodigo = CONDICION_IVA_A_CODIGO[condicionReceptor];

    // A otro RI o Exento -> Factura A
    if (receptorCodigo === 1 || receptorCodigo === 4) {
      return 'A';
    }

    // A CF, Monotributista, etc -> Factura B
    return 'B';
  }

  // Default B
  return 'B';
}

/**
 * Formatea fecha para ARCA (YYYYMMDD)
 */
export function formatFechaArca(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Parsea fecha de ARCA (YYYYMMDD) a Date
 */
export function parseFechaArca(fecha: string): Date {
  const year = parseInt(fecha.slice(0, 4));
  const month = parseInt(fecha.slice(4, 6)) - 1;
  const day = parseInt(fecha.slice(6, 8));
  return new Date(year, month, day);
}

/**
 * Calcula el importe IVA desde el neto
 */
export function calcularIVA(neto: number, porcentaje: number): number {
  return Math.round(neto * (porcentaje / 100) * 100) / 100;
}

/**
 * Calcula el neto desde el total con IVA
 */
export function calcularNeto(total: number, porcentaje: number): number {
  return Math.round((total / (1 + porcentaje / 100)) * 100) / 100;
}

/**
 * Genera el JSON para el código QR según especificación ARCA
 */
export function generarQRData(params: {
  fecha: Date;
  cuit: string;
  puntoVenta: number;
  tipoComprobante: number;
  numeroComprobante: number;
  importe: number;
  moneda: string;
  cotizacion: number;
  tipoDocReceptor: number;
  nroDocReceptor: string;
  cae: string;
}): QRData {
  return {
    ver: 1,
    fecha: params.fecha.toISOString().slice(0, 10),
    cuit: parseInt(params.cuit.replace(/-/g, '')),
    ptoVta: params.puntoVenta,
    tipoCmp: params.tipoComprobante,
    nroCmp: params.numeroComprobante,
    importe: params.importe,
    moneda: params.moneda,
    ctz: params.cotizacion,
    tipoDocRec: params.tipoDocReceptor,
    nroDocRec: parseInt(params.nroDocReceptor.replace(/-/g, '')),
    tipoCodAut: 'E',
    codAut: parseInt(params.cae),
  };
}
