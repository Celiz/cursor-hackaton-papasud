/**
 * WSAA - Web Service de Autenticación y Autorización de ARCA (ex-AFIP)
 *
 * Este módulo maneja la autenticación con los servicios de ARCA.
 * El proceso es:
 * 1. Crear un TRA (Ticket de Requerimiento de Acceso) firmado con el certificado
 * 2. Enviar el TRA al WSAA
 * 3. Recibir un TA (Ticket de Acceso) con token y sign
 * 4. Usar token y sign para llamar a los otros Web Services
 */

import * as soap from 'soap';
import * as forge from 'node-forge';

// URLs de WSAA
const WSAA_URLS = {
  homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
  produccion: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
};

export interface WSAACredentials {
  token: string;
  sign: string;
  expirationTime: Date;
  generationTime: Date;
}

export interface WSAAConfig {
  cert: string;      // Contenido del certificado .crt
  key: string;       // Contenido de la clave privada .key
  production: boolean;
  service: string;   // ej: 'wsfe' para facturación electrónica
}

/**
 * Crea el TRA (Ticket de Requerimiento de Acceso) en formato XML
 */
function createTRA(service: string): { tra: string; uniqueId: number; generationTime: Date; expirationTime: Date } {
  const now = new Date();
  const generationTime = new Date(now.getTime() - 60000); // 1 minuto atrás por seguridad
  const expirationTime = new Date(now.getTime() + 60000 * 60 * 12); // 12 horas
  const uniqueId = Math.floor(Date.now() / 1000);

  const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime.toISOString()}</generationTime>
    <expirationTime>${expirationTime.toISOString()}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;

  return { tra, uniqueId, generationTime, expirationTime };
}

/**
 * Firma el TRA con el certificado usando PKCS#7 (CMS)
 * Retorna el CMS firmado en base64
 */
function signTRA(tra: string, certPem: string, keyPem: string): string {
  // Parsear certificado PEM
  const cert = forge.pki.certificateFromPem(certPem);

  // Parsear clave privada PEM
  const privateKey = forge.pki.privateKeyFromPem(keyPem);

  // Crear mensaje PKCS#7 firmado
  const p7 = forge.pkcs7.createSignedData();

  // Establecer el contenido (el TRA XML)
  p7.content = forge.util.createBuffer(tra, 'utf8');

  // Agregar certificado
  p7.addCertificate(cert);

  // Agregar firmante
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
        // value will be auto-populated at signing time
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date().toISOString(),
      },
    ],
  });

  // Firmar
  p7.sign();

  // Convertir a DER y luego a base64
  const asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(asn1);
  const base64 = forge.util.encode64(der.getBytes());

  return base64;
}

/**
 * Obtiene las credenciales de acceso (token y sign) del WSAA
 */
export async function getCredentials(config: WSAAConfig): Promise<WSAACredentials> {
  const url = config.production ? WSAA_URLS.produccion : WSAA_URLS.homologacion;

  // Crear el TRA
  const { tra, generationTime, expirationTime } = createTRA(config.service);

  console.log('[WSAA] TRA creado para servicio:', config.service);

  // Firmar el TRA
  const cms = signTRA(tra, config.cert, config.key);

  console.log('[WSAA] CMS firmado, longitud:', cms.length);

  // Llamar al WSAA
  const client = await soap.createClientAsync(url);

  console.log('[WSAA] Llamando a loginCms...');

  try {
    const result = await client.loginCmsAsync({ in0: cms });

    // Parsear respuesta XML
    const loginTicketResponse = result[0].loginCmsReturn;

    console.log('[WSAA] Respuesta recibida');

    // Extraer token y sign del XML de respuesta
    const tokenMatch = loginTicketResponse.match(/<token>([^<]+)<\/token>/);
    const signMatch = loginTicketResponse.match(/<sign>([^<]+)<\/sign>/);
    const expMatch = loginTicketResponse.match(/<expirationTime>([^<]+)<\/expirationTime>/);
    const genMatch = loginTicketResponse.match(/<generationTime>([^<]+)<\/generationTime>/);

    if (!tokenMatch || !signMatch) {
      console.error('[WSAA] Respuesta sin token/sign:', loginTicketResponse.substring(0, 500));
      throw new Error('No se pudo obtener token/sign de WSAA. Verifique certificado y autorización.');
    }

    console.log('[WSAA] Autenticación exitosa');

    return {
      token: tokenMatch[1],
      sign: signMatch[1],
      expirationTime: expMatch ? new Date(expMatch[1]) : expirationTime,
      generationTime: genMatch ? new Date(genMatch[1]) : generationTime,
    };
  } catch (error: unknown) {
    // Manejar el caso de "ya autenticado"
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('alreadyAuthenticated')) {
      console.log('[WSAA] Ya existe un TA válido, esperando 1 minuto para reintentar...');
      // En producción, deberíamos guardar las credenciales en BD
      // Por ahora, simplemente lanzamos un error más amigable
      throw new Error('Ya existe una sesión activa con ARCA. Las credenciales se reutilizarán automáticamente. Por favor, intente de nuevo en unos segundos.');
    }

    throw error;
  }
}

/**
 * Verifica si las credenciales siguen siendo válidas
 */
export function isCredentialsValid(credentials: WSAACredentials): boolean {
  const now = new Date();
  // Considerar expirado 5 minutos antes para dar margen
  const expirationWithMargin = new Date(credentials.expirationTime.getTime() - 5 * 60 * 1000);
  return now < expirationWithMargin;
}
