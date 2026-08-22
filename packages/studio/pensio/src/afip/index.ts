export type {
  Ambiente,
  AfipConfig,
  WSAACredentials,
  TipoFactura,
  TipoDocumento,
  CondicionIva,
  AlicuotaIva,
  ComprobanteRequest,
  ComprobanteResponse,
  AfipError,
  AfipObservacion,
} from './types'

export {
  TIPO_FACTURA_CODIGO,
  TIPO_DOC_CODIGO,
  CONDICION_IVA_CODIGO,
  ALICUOTA_IVA,
} from './types'

export {
  WSAA_URLS,
  WSFE_URLS,
  PADRON_URLS,
  TOKEN_VALIDITY_HOURS,
  MENSAJES_ERROR,
} from './constants'

export {
  getCredentials,
  isCredentialsValid,
} from './wsaa'

export {
  getServerStatus,
  getLastVoucher,
  getSalesPoints,
  getVoucherTypes,
  requestCAE,
  getVoucher,
  type WSFEConfig,
} from './wsfe'
