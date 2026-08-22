// AFIP/ARCA Web Service URLs

export const WSAA_URLS = {
  homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  produccion: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
}

export const WSFE_URLS = {
  homologacion: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
  produccion: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
}

export const PADRON_URLS = {
  homologacion: 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5?WSDL',
  produccion: 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5?WSDL',
}

// Token validity (12 hours, but we refresh at 10 to be safe)
export const TOKEN_VALIDITY_HOURS = 10

// Error messages
export const MENSAJES_ERROR = {
  SIN_CONFIG: 'No hay configuración de AFIP. Configure el certificado y datos del emisor.',
  SIN_CERTIFICADO: 'Falta el certificado o la clave privada.',
  TOKEN_EXPIRADO: 'El token de autenticación expiró. Reintentando...',
  CONEXION_FALLIDA: 'No se pudo conectar con AFIP. Verifique su conexión.',
  COMPROBANTE_RECHAZADO: 'AFIP rechazó el comprobante.',
}
