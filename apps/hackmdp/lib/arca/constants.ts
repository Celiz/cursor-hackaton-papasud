/**
 * Constantes para integración ARCA
 */

// URLs de Web Services ARCA
export const ARCA_URLS = {
  // Autenticación (WSAA)
  WSAA_HOMO: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  WSAA_PROD: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',

  // Facturación Electrónica (WSFEv1)
  WSFE_HOMO: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  WSFE_PROD: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',

  // Validación QR
  QR_URL: 'https://www.afip.gob.ar/fe/qr/',
} as const;

// Servicios disponibles
export const ARCA_SERVICES = {
  WSFE: 'wsfe', // Factura Electrónica
  WSMTXCA: 'wsmtxca', // Factura con detalle
  WSFEX: 'wsfex', // Factura Exportación
  WSBFE: 'wsbfe', // Bono Fiscal Electrónico
} as const;

// Conceptos de factura
export const CONCEPTOS = {
  1: 'Productos',
  2: 'Servicios',
  3: 'Productos y Servicios',
} as const;

// Tipos de CBU
export const TIPOS_CBU = {
  0: 'Sin CBU',
  1: 'CBU',
  2: 'CVU',
} as const;

// Opcionales disponibles
export const OPCIONALES_DISPONIBLES = {
  // RG 4004 - CBU/Alias
  2101: 'CBU del emisor',
  2102: 'Alias CBU del emisor',
  27: 'Forma de pago (descripción)',

  // RG 4540 - Transferencia de dominio
  10: 'Cód. Provincia receptor',
  1011: 'CUIT representado',

  // Otros
  91: 'Identificación del representado',
} as const;

// Tipos de tributos
export const TIPOS_TRIBUTOS = {
  1: 'Impuestos Nacionales',
  2: 'Impuestos Provinciales',
  3: 'Impuestos Municipales',
  4: 'Impuestos Internos',
  6: 'IIBB',
  7: 'Percepción IVA',
  8: 'Percepción IIBB',
  9: 'Otras Percepciones',
  99: 'Otros',
} as const;

// Formas de pago para el opcional 27
export const FORMAS_PAGO = {
  1: 'Contado',
  2: 'Tarjeta de Débito',
  3: 'Tarjeta de Crédito',
  4: 'Cuenta Corriente',
  5: 'Cheque',
  6: 'Transferencia Bancaria',
  7: 'Efectivo',
  8: 'MercadoPago',
  9: 'Otra',
} as const;

// Provincias Argentina (para opcionales)
export const PROVINCIAS = {
  0: 'Ciudad Autónoma de Buenos Aires',
  1: 'Buenos Aires',
  2: 'Catamarca',
  3: 'Córdoba',
  4: 'Corrientes',
  5: 'Entre Ríos',
  6: 'Jujuy',
  7: 'Mendoza',
  8: 'La Rioja',
  9: 'Salta',
  10: 'San Juan',
  11: 'San Luis',
  12: 'Santa Fe',
  13: 'Santiago del Estero',
  14: 'Tucumán',
  16: 'Chaco',
  17: 'Chubut',
  18: 'Formosa',
  19: 'Misiones',
  20: 'Neuquén',
  21: 'La Pampa',
  22: 'Río Negro',
  23: 'Santa Cruz',
  24: 'Tierra del Fuego',
} as const;

// Errores comunes de ARCA y sus significados
export const ERRORES_COMUNES: Record<string, string> = {
  '10000': 'Error de sistema interno de ARCA',
  '10001': 'El CUIT no está autorizado para el punto de venta',
  '10002': 'El punto de venta no está habilitado',
  '10003': 'El tipo de comprobante no es válido',
  '10004': 'Error en el formato de fecha',
  '10005': 'El importe total no coincide',
  '10006': 'El tipo de documento del receptor no es válido',
  '10007': 'El número de documento del receptor no es válido',
  '10008': 'El concepto no es válido',
  '10009': 'Faltan las fechas de servicio',
  '10010': 'El número de comprobante ya fue utilizado',
  '10013': 'El campo IVA es requerido',
  '10016': 'La suma de alícuotas no coincide con el IVA total',
  '10017': 'Error en los datos de IVA',
  '10018': 'El CUIT del receptor no es válido',
  '10019': 'El receptor no es Responsable Inscripto para Factura A',
  '10048': 'El CAE ya fue asignado para este comprobante',
  '600': 'No existe Token válido',
  '601': 'CUIT representado no autorizado',
  '602': 'Excedido el tiempo máximo de validez del ticket',
};

// Mensajes de éxito
export const MENSAJES_EXITO = {
  CAE_OBTENIDO: 'CAE obtenido correctamente',
  CONEXION_OK: 'Conexión con ARCA establecida',
  CONFIG_GUARDADA: 'Configuración guardada correctamente',
} as const;

// Mensajes de error del sistema
export const MENSAJES_ERROR = {
  SIN_CONFIG: 'No hay configuración de ARCA. Configure ARCA antes de facturar.',
  SIN_CERTIFICADO: 'No hay certificado configurado. Suba el certificado de ARCA.',
  TOKEN_EXPIRADO: 'El token de autenticación ha expirado',
  ERROR_CONEXION: 'Error de conexión con ARCA',
  FACTURA_NO_ENCONTRADA: 'Factura no encontrada',
  CLIENTE_SIN_CUIT: 'El cliente no tiene CUIT/CUIL configurado',
  TIPO_FACTURA_INVALIDO: 'Tipo de factura no válido para este cliente',
} as const;
