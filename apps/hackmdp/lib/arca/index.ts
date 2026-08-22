/**
 * ARCA (ex-AFIP) Integration Module
 * Facturación Electrónica Argentina
 *
 * @module lib/arca
 *
 * Uso:
 * ```typescript
 * import { solicitarCAE, testConnection, getArcaConfig } from '@/lib/arca';
 *
 * // Probar conexión
 * const { success, message } = await testConnection();
 *
 * // Solicitar CAE para una factura
 * const resultado = await solicitarCAE(facturaId);
 * ```
 */

// Cliente principal
export {
  getArcaConfig,
  saveArcaConfig,
  testConnection,
  getUltimoAutorizado,
  solicitarCAE,
  consultarComprobante,
  getPuntosVenta,
  getTiposComprobante,
} from './client';

// WSAA - Autenticación
export { getCredentials, isCredentialsValid } from './wsaa';
export type { WSAACredentials, WSAAConfig } from './wsaa';

// WSFE - Facturación
export * as wsfe from './wsfe';

// WSPadron - Consulta de contribuyentes
export {
  consultarCuit,
  consultarCuitPublico,
  validarCuit,
  formatearCuit,
  mapearCondicionIva,
} from './padron';
export type { DatosContribuyente, PadronConfig } from './padron';

// Tipos
export type {
  ArcaConfig,
  ArcaAmbiente,
  CondicionIVA,
  TipoComprobante,
  TipoDocumento,
  AlicuotaIVAId,
  CondicionIVAReceptor,
  Moneda,
  FacturaArcaRequest,
  FacturaArcaResponse,
  AlicuotaItem,
  TributoItem,
  ComprobanteAsociado,
  OpcionalesItem,
  ArcaError,
  ArcaObservacion,
  ArcaEvento,
  ArcaComprobanteLog,
  QRData,
} from './types';

// Constantes y mapeos
export {
  TIPOS_COMPROBANTE,
  TIPOS_DOCUMENTO,
  ALICUOTAS_IVA,
  CONDICIONES_IVA,
  MONEDAS,
  TIPO_FACTURA_A_CODIGO,
  TIPO_NC_A_CODIGO,
  TIPO_ND_A_CODIGO,
  TIPO_DOC_A_CODIGO,
  PORCENTAJE_A_ALICUOTA,
  CONDICION_IVA_A_CODIGO,
  determinarTipoFactura,
  formatFechaArca,
  parseFechaArca,
  calcularIVA,
  calcularNeto,
  generarQRData,
} from './types';

export {
  ARCA_URLS,
  ARCA_SERVICES,
  CONCEPTOS,
  TIPOS_CBU,
  OPCIONALES_DISPONIBLES,
  TIPOS_TRIBUTOS,
  FORMAS_PAGO,
  PROVINCIAS,
  ERRORES_COMUNES,
  MENSAJES_EXITO,
  MENSAJES_ERROR,
} from './constants';
