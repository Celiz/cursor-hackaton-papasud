/**
 * WSPadron - Web Service de Consulta de Padrón de ARCA (ex-AFIP)
 *
 * Permite consultar datos de contribuyentes por CUIT:
 * - Razón social / Nombre
 * - Condición frente al IVA
 * - Domicilio fiscal
 * - Estado (activo/inactivo)
 * - Actividades económicas
 *
 * Servicios disponibles:
 * - ws_sr_padron_a4: Datos completos del contribuyente
 * - ws_sr_padron_a5: Constancia de inscripción (deprecado)
 * - ws_sr_padron_a13: Datos públicos básicos
 * - ws_sr_constancia_inscripcion: Reemplazo de a5
 */

import * as soap from 'soap';
import { WSAACredentials, getCredentials, isCredentialsValid } from './wsaa';

// URLs de WS Padrón
const PADRON_URLS = {
  // ws_sr_padron_a4 - Datos completos
  homologacion_a4: 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA4?wsdl',
  produccion_a4: 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA4?wsdl',
  // ws_sr_padron_a13 - Datos públicos
  homologacion_a13: 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA13?wsdl',
  produccion_a13: 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA13?wsdl',
};

export interface PadronConfig {
  cuit: string;
  credentials: WSAACredentials;
  production: boolean;
}

export interface DatosContribuyente {
  cuit: string;
  tipoPersona: 'FISICA' | 'JURIDICA';
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  nombreCompleto: string;
  condicionIva: string;
  condicionIvaCodigo: number;
  domicilioFiscal?: {
    direccion?: string;
    localidad?: string;
    provincia?: string;
    codigoPostal?: string;
  };
  estadoCuit: 'ACTIVO' | 'INACTIVO';
  fechaInscripcion?: string;
  actividadPrincipal?: {
    codigo: string;
    descripcion: string;
  };
  esMonotributista: boolean;
  esResponsableInscripto: boolean;
  esExento: boolean;
}

// Mapeo de códigos de condición IVA de AFIP
const CONDICION_IVA_MAP: Record<number, string> = {
  1: 'IVA Responsable Inscripto',
  2: 'IVA Responsable no Inscripto', // Deprecado
  3: 'IVA no Responsable',
  4: 'IVA Sujeto Exento',
  5: 'Consumidor Final',
  6: 'Responsable Monotributo',
  7: 'Sujeto no Categorizado',
  8: 'Proveedor del Exterior',
  9: 'Cliente del Exterior',
  10: 'IVA Liberado - Ley Nº 19.640',
  11: 'IVA Responsable Inscripto - Agente de Percepción',
  12: 'Pequeño Contribuyente Eventual',
  13: 'Monotributista Social',
  14: 'Pequeño Contribuyente Eventual Social',
};

// Cache de credenciales para padrón (servicio separado de wsfe)
let cachedPadronCredentials: WSAACredentials | null = null;

/**
 * Obtiene credenciales para el servicio de padrón
 */
async function getPadronCredentials(
  cert: string,
  key: string,
  production: boolean
): Promise<WSAACredentials> {
  // Verificar cache
  if (cachedPadronCredentials && isCredentialsValid(cachedPadronCredentials)) {
    return cachedPadronCredentials;
  }

  // Obtener nuevas credenciales para ws_sr_padron_a4
  cachedPadronCredentials = await getCredentials({
    cert,
    key,
    production,
    service: 'ws_sr_padron_a4',
  });

  return cachedPadronCredentials;
}

/**
 * Consulta datos de un contribuyente por CUIT usando ws_sr_padron_a4
 */
export async function consultarCuit(
  cuit: string,
  cert: string,
  key: string,
  production: boolean = false
): Promise<DatosContribuyente> {
  // Limpiar CUIT (solo números)
  const cuitLimpio = cuit.replace(/\D/g, '');

  if (cuitLimpio.length !== 11) {
    throw new Error('El CUIT debe tener 11 dígitos');
  }

  // Validar dígito verificador
  if (!validarCuit(cuitLimpio)) {
    throw new Error('El CUIT no es válido (dígito verificador incorrecto)');
  }

  // Obtener credenciales
  const credentials = await getPadronCredentials(cert, key, production);

  // Crear cliente SOAP
  const url = production ? PADRON_URLS.produccion_a4 : PADRON_URLS.homologacion_a4;
  const client = await soap.createClientAsync(url);

  // Llamar al servicio
  const args = {
    token: credentials.token,
    sign: credentials.sign,
    cuitRepresentada: cuitLimpio, // CUIT del emisor (quien consulta)
    idPersona: cuitLimpio, // CUIT a consultar
  };

  try {
    const result = await client.getPersonaAsync(args);
    const persona = result[0]?.personaReturn?.persona;

    if (!persona) {
      throw new Error('No se encontró información para el CUIT indicado');
    }

    return parsearDatosPersona(persona, cuitLimpio);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Manejar errores conocidos
    if (errorMsg.includes('No existe persona')) {
      throw new Error(`No existe persona registrada con CUIT ${formatearCuit(cuitLimpio)}`);
    }

    throw error;
  }
}

/**
 * Consulta datos públicos de un contribuyente (ws_sr_padron_a13)
 * Este servicio tiene menos datos pero es más permisivo
 */
export async function consultarCuitPublico(
  cuit: string,
  cert: string,
  key: string,
  production: boolean = false
): Promise<DatosContribuyente> {
  const cuitLimpio = cuit.replace(/\D/g, '');

  if (cuitLimpio.length !== 11) {
    throw new Error('El CUIT debe tener 11 dígitos');
  }

  if (!validarCuit(cuitLimpio)) {
    throw new Error('El CUIT no es válido (dígito verificador incorrecto)');
  }

  // Para a13 necesitamos credenciales específicas
  const credentials = await getCredentials({
    cert,
    key,
    production,
    service: 'ws_sr_padron_a13',
  });

  const url = production ? PADRON_URLS.produccion_a13 : PADRON_URLS.homologacion_a13;
  const client = await soap.createClientAsync(url);

  const args = {
    token: credentials.token,
    sign: credentials.sign,
    cuitRepresentada: cuitLimpio,
    idPersona: cuitLimpio,
  };

  try {
    const result = await client.getPersonaAsync(args);
    const persona = result[0]?.personaReturn?.persona;

    if (!persona) {
      throw new Error('No se encontró información para el CUIT indicado');
    }

    return parsearDatosPersona(persona, cuitLimpio);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes('No existe persona')) {
      throw new Error(`No existe persona registrada con CUIT ${formatearCuit(cuitLimpio)}`);
    }

    throw error;
  }
}

/**
 * Parsea la respuesta del WS a nuestro formato
 */
function parsearDatosPersona(persona: Record<string, unknown>, cuit: string): DatosContribuyente {
  const tipoPersona = persona.tipoPersona === 'FISICA' ? 'FISICA' : 'JURIDICA';

  // Nombre según tipo de persona
  let nombreCompleto: string;
  if (tipoPersona === 'FISICA') {
    const nombre = (persona.nombre as string) || '';
    const apellido = (persona.apellido as string) || '';
    nombreCompleto = `${apellido}, ${nombre}`.trim();
  } else {
    nombreCompleto = (persona.razonSocial as string) || '';
  }

  // Condición IVA
  const datosGenerales = persona.datosGenerales as Record<string, unknown> | undefined;
  const impuestos = persona.datosRegimenGeneral as Record<string, unknown> | undefined;
  const monotributo = persona.datosMonotributo as Record<string, unknown> | undefined;

  let condicionIvaCodigo = 5; // Consumidor Final por defecto
  let esMonotributista = false;
  let esResponsableInscripto = false;
  let esExento = false;

  // Verificar si es monotributista
  if (monotributo && (monotributo.categoriaMonotributo || monotributo.actividadMonotributista)) {
    condicionIvaCodigo = 6;
    esMonotributista = true;
  }

  // Verificar inscripciones en impuestos
  if (impuestos) {
    const regimenes = impuestos.regimen as unknown[];
    if (Array.isArray(regimenes)) {
      for (const reg of regimenes as Record<string, unknown>[]) {
        // Impuesto 30 = IVA
        if (reg.idImpuesto === 30 && reg.estado === 'ACTIVO') {
          condicionIvaCodigo = 1;
          esResponsableInscripto = true;
          break;
        }
      }
    }
  }

  // Verificar si es exento
  if (datosGenerales?.caracterizacion) {
    const caract = datosGenerales.caracterizacion as Record<string, unknown>[];
    if (Array.isArray(caract)) {
      for (const c of caract) {
        // Caracterización 40 = Exento
        if (c.idCaracterizacion === 40) {
          condicionIvaCodigo = 4;
          esExento = true;
          break;
        }
      }
    }
  }

  // Domicilio fiscal
  let domicilioFiscal: DatosContribuyente['domicilioFiscal'];
  const domicilios = persona.domicilio as Record<string, unknown>[] | undefined;
  if (Array.isArray(domicilios)) {
    const fiscal = domicilios.find((d) => d.tipoDomicilio === 'FISCAL');
    if (fiscal) {
      domicilioFiscal = {
        direccion: `${fiscal.direccion || ''} ${fiscal.numero || ''}`.trim(),
        localidad: fiscal.localidad as string,
        provincia: fiscal.descripcionProvincia as string,
        codigoPostal: fiscal.codPostal as string,
      };
    }
  }

  // Actividad principal
  let actividadPrincipal: DatosContribuyente['actividadPrincipal'];
  const actividades = datosGenerales?.actividad as Record<string, unknown>[] | undefined;
  if (Array.isArray(actividades) && actividades.length > 0) {
    const principal = actividades.find((a) => a.orden === 1) || actividades[0];
    actividadPrincipal = {
      codigo: String(principal.idActividad || ''),
      descripcion: (principal.descripcionActividad as string) || '',
    };
  }

  // Estado del CUIT
  const estadoCuit = (datosGenerales?.estadoClave as string) === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO';

  return {
    cuit: formatearCuit(cuit),
    tipoPersona,
    nombre: tipoPersona === 'FISICA' ? (persona.nombre as string) : undefined,
    apellido: tipoPersona === 'FISICA' ? (persona.apellido as string) : undefined,
    razonSocial: tipoPersona === 'JURIDICA' ? (persona.razonSocial as string) : undefined,
    nombreCompleto,
    condicionIva: CONDICION_IVA_MAP[condicionIvaCodigo] || 'Desconocido',
    condicionIvaCodigo,
    domicilioFiscal,
    estadoCuit,
    fechaInscripcion: datosGenerales?.fechaContratoSocial as string | undefined,
    actividadPrincipal,
    esMonotributista,
    esResponsableInscripto,
    esExento,
  };
}

/**
 * Valida el dígito verificador de un CUIT
 */
export function validarCuit(cuit: string): boolean {
  const cuitLimpio = cuit.replace(/\D/g, '');

  if (cuitLimpio.length !== 11) {
    return false;
  }

  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < 10; i++) {
    suma += parseInt(cuitLimpio[i]) * multiplicadores[i];
  }

  const resto = suma % 11;
  const digitoVerificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;

  return digitoVerificador === parseInt(cuitLimpio[10]);
}

/**
 * Formatea un CUIT con guiones (XX-XXXXXXXX-X)
 */
export function formatearCuit(cuit: string): string {
  const cuitLimpio = cuit.replace(/\D/g, '');

  if (cuitLimpio.length !== 11) {
    return cuit;
  }

  return `${cuitLimpio.slice(0, 2)}-${cuitLimpio.slice(2, 10)}-${cuitLimpio.slice(10)}`;
}

/**
 * Mapea condición IVA de AFIP a nuestro formato interno
 */
export function mapearCondicionIva(codigo: number): string {
  const mapa: Record<number, string> = {
    1: 'responsable_inscripto',
    4: 'exento',
    5: 'consumidor_final',
    6: 'monotributista',
    13: 'monotributo_social',
  };

  return mapa[codigo] || 'consumidor_final';
}
