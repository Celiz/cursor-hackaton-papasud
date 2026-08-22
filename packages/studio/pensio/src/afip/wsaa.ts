/**
 * WSAA - Web Service de Autenticación y Autorización
 * Genera tickets de acceso para otros web services de AFIP
 */

import * as forge from 'node-forge'
import { WSAA_URLS, TOKEN_VALIDITY_HOURS } from './constants'
import type { Ambiente, WSAACredentials } from './types'

interface WSAAConfig {
  cert: string
  key: string
  ambiente: Ambiente
  service: string  // 'wsfe' for facturación
}

/**
 * Crea el Ticket de Requerimiento de Acceso (TRA)
 */
function createTRA(service: string): string {
  const now = new Date()
  const expiration = new Date(now.getTime() + TOKEN_VALIDITY_HOURS * 60 * 60 * 1000)

  const formatDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '-03:00')

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
    <generationTime>${formatDate(now)}</generationTime>
    <expirationTime>${formatDate(expiration)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`
}

/**
 * Firma el TRA con el certificado
 */
function signTRA(tra: string, cert: string, key: string): string {
  // Parse certificate and key
  const certificate = forge.pki.certificateFromPem(cert)
  const privateKey = forge.pki.privateKeyFromPem(key)

  // Create PKCS#7 signed data
  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer(tra, 'utf8')
  p7.addCertificate(certificate)
  p7.addSigner({
    key: privateKey,
    certificate: certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        // @ts-expect-error node-forge types expect string but actually accept Date
        value: new Date(),
      },
    ],
  })

  p7.sign()

  // Convert to DER and then base64
  const asn1 = p7.toAsn1()
  const der = forge.asn1.toDer(asn1).getBytes()
  return forge.util.encode64(der)
}

/**
 * Llama al web service WSAA para obtener credenciales
 */
async function callWSAA(cms: string, ambiente: Ambiente): Promise<WSAACredentials> {
  const url = WSAA_URLS[ambiente]

  // SOAP envelope
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    },
    body: soapEnvelope,
  })

  if (!response.ok) {
    throw new Error(`WSAA request failed: ${response.status} ${response.statusText}`)
  }

  const xml = await response.text()

  // Parse response - extract loginCmsReturn
  const returnMatch = xml.match(/<loginCmsReturn>([\s\S]*?)<\/loginCmsReturn>/)
  if (!returnMatch) {
    // Check for fault
    const faultMatch = xml.match(/<faultstring>([\s\S]*?)<\/faultstring>/)
    if (faultMatch) {
      throw new Error(`WSAA error: ${faultMatch[1]}`)
    }
    throw new Error('Invalid WSAA response')
  }

  // Decode HTML entities and parse the inner XML
  const innerXml = returnMatch[1]
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')

  // Extract credentials
  const tokenMatch = innerXml.match(/<token>([\s\S]*?)<\/token>/)
  const signMatch = innerXml.match(/<sign>([\s\S]*?)<\/sign>/)
  const expMatch = innerXml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/)
  const genMatch = innerXml.match(/<generationTime>([\s\S]*?)<\/generationTime>/)

  if (!tokenMatch || !signMatch) {
    throw new Error('Could not parse WSAA credentials')
  }

  return {
    token: tokenMatch[1].trim(),
    sign: signMatch[1].trim(),
    expirationTime: expMatch ? new Date(expMatch[1]) : new Date(Date.now() + TOKEN_VALIDITY_HOURS * 60 * 60 * 1000),
    generationTime: genMatch ? new Date(genMatch[1]) : new Date(),
  }
}

/**
 * Verifica si las credenciales aún son válidas
 */
export function isCredentialsValid(credentials: WSAACredentials): boolean {
  // Considerar inválido 5 minutos antes de expirar
  const margin = 5 * 60 * 1000
  return credentials.expirationTime.getTime() > Date.now() + margin
}

/**
 * Obtiene credenciales de WSAA
 */
export async function getCredentials(config: WSAAConfig): Promise<WSAACredentials> {
  // Create and sign TRA
  const tra = createTRA(config.service)
  const cms = signTRA(tra, config.cert, config.key)

  // Call WSAA
  return await callWSAA(cms, config.ambiente)
}
