/**
 * WSFEv1 - Web Service de Facturación Electrónica de ARCA (ex-AFIP)
 *
 * Este módulo maneja la facturación electrónica:
 * - Consulta de último comprobante autorizado
 * - Solicitud de CAE
 * - Consulta de comprobantes
 */

import * as soap from 'soap';
import { WSAACredentials } from './wsaa';

// URLs de WSFE
const WSFE_URLS = {
  homologacion: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
  produccion: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
};

export interface WSFEConfig {
  cuit: string;
  credentials: WSAACredentials;
  production: boolean;
}

export interface FEAuthRequest {
  Token: string;
  Sign: string;
  Cuit: string;
}

export interface AlicuotaIva {
  Id: number;      // 3=0%, 4=10.5%, 5=21%, 6=27%, 8=5%, 9=2.5%
  BaseImp: number; // Base imponible
  Importe: number; // Importe del IVA
}

export interface Tributo {
  Id: number;      // Código de tributo
  Desc: string;    // Descripción
  BaseImp: number; // Base imponible
  Alic: number;    // Alícuota
  Importe: number; // Importe
}

export interface ComprobanteAsociado {
  Tipo: number;
  PtoVta: number;
  Nro: number;
  Cuit?: string;
  CbteFch?: string;
}

export interface FECAERequest {
  CbteTipo: number;      // Tipo de comprobante (1=Factura A, 6=Factura B, 11=Factura C, etc.)
  PtoVta: number;        // Punto de venta
  Concepto: number;      // 1=Productos, 2=Servicios, 3=Productos y Servicios
  DocTipo: number;       // Tipo documento receptor (80=CUIT, 86=CUIL, 96=DNI, 99=Consumidor Final)
  DocNro: string;        // Número de documento
  CondicionIVAReceptorId?: number; // Condición IVA receptor (RG 5616) - 1=RI, 5=CF, 6=Mono, etc.
  CbteDesde: number;     // Número de comprobante desde
  CbteHasta: number;     // Número de comprobante hasta
  CbteFch: string;       // Fecha comprobante YYYYMMDD
  ImpTotal: number;      // Importe total
  ImpTotConc: number;    // Importe total conceptos no gravados
  ImpNeto: number;       // Importe neto gravado
  ImpOpEx: number;       // Importe operaciones exentas
  ImpIVA: number;        // Importe total de IVA
  ImpTrib: number;       // Importe total de tributos
  MonId: string;         // Código de moneda (PES=Pesos)
  MonCotiz: number;      // Cotización (1 para pesos)
  FchServDesde?: string; // Fecha inicio servicio (solo concepto 2 o 3)
  FchServHasta?: string; // Fecha fin servicio (solo concepto 2 o 3)
  FchVtoPago?: string;   // Fecha vencimiento pago (solo concepto 2 o 3)
  Iva?: AlicuotaIva[];   // Array de alícuotas IVA
  Tributos?: Tributo[];  // Array de tributos
  CbtesAsoc?: ComprobanteAsociado[]; // Comprobantes asociados (para NC/ND)
}

export interface FECAEResponse {
  Resultado: 'A' | 'R' | 'P'; // A=Aprobado, R=Rechazado, P=Parcial
  CAE?: string;
  CAEFchVto?: string;
  CbteDesde: number;
  CbteHasta: number;
  Observaciones?: Array<{ Code: number; Msg: string }>;
  Errores?: Array<{ Code: number; Msg: string }>;
}

export interface ServerStatus {
  AppServer: string;
  DbServer: string;
  AuthServer: string;
}

/**
 * Crea el cliente SOAP para WSFE
 */
async function createWSFEClient(production: boolean): Promise<soap.Client> {
  const url = production ? WSFE_URLS.produccion : WSFE_URLS.homologacion;
  return await soap.createClientAsync(url);
}

/**
 * Crea el objeto Auth para las llamadas
 */
function createAuth(config: WSFEConfig): FEAuthRequest {
  return {
    Token: config.credentials.token,
    Sign: config.credentials.sign,
    Cuit: config.cuit.replace(/-/g, ''),
  };
}

/**
 * Obtiene el estado del servidor
 */
export async function getServerStatus(config: WSFEConfig): Promise<ServerStatus> {
  const client = await createWSFEClient(config.production);

  const result = await client.FEDummyAsync({});

  const response = result[0].FEDummyResult;

  return {
    AppServer: response.AppServer,
    DbServer: response.DbServer,
    AuthServer: response.AuthServer,
  };
}

/**
 * Obtiene el último número de comprobante autorizado
 */
export async function getLastVoucher(
  config: WSFEConfig,
  ptoVta: number,
  cbteTipo: number
): Promise<number> {
  const client = await createWSFEClient(config.production);

  const args = {
    Auth: createAuth(config),
    PtoVta: ptoVta,
    CbteTipo: cbteTipo,
  };

  const result = await client.FECompUltimoAutorizadoAsync(args);

  const response = result[0].FECompUltimoAutorizadoResult;

  if (response.Errors) {
    const error = response.Errors.Err[0];
    throw new Error(`WSFE Error ${error.Code}: ${error.Msg}`);
  }

  return response.CbteNro;
}

/**
 * Solicita CAE para un comprobante
 */
export async function requestCAE(
  config: WSFEConfig,
  request: FECAERequest
): Promise<FECAEResponse> {
  const client = await createWSFEClient(config.production);

  // Construir estructura FECAERequest según WSDL
  const feDetReq: Record<string, unknown> = {
    Concepto: request.Concepto,
    DocTipo: request.DocTipo,
    DocNro: request.DocNro,
    CondicionIVAReceptorId: request.CondicionIVAReceptorId || 5, // Consumidor Final por defecto (RG 5616)
    CbteDesde: request.CbteDesde,
    CbteHasta: request.CbteHasta,
    CbteFch: request.CbteFch,
    ImpTotal: request.ImpTotal,
    ImpTotConc: request.ImpTotConc,
    ImpNeto: request.ImpNeto,
    ImpOpEx: request.ImpOpEx,
    ImpIVA: request.ImpIVA,
    ImpTrib: request.ImpTrib,
    MonId: request.MonId,
    MonCotiz: request.MonCotiz,
  };

  // Agregar fechas de servicio si aplica
  if (request.Concepto >= 2) {
    feDetReq.FchServDesde = request.FchServDesde;
    feDetReq.FchServHasta = request.FchServHasta;
    feDetReq.FchVtoPago = request.FchVtoPago;
  }

  // Agregar IVA si hay
  if (request.Iva && request.Iva.length > 0) {
    feDetReq.Iva = {
      AlicIva: request.Iva.map((iva) => ({
        Id: iva.Id,
        BaseImp: iva.BaseImp,
        Importe: iva.Importe,
      })),
    };
  }

  // Agregar tributos si hay
  if (request.Tributos && request.Tributos.length > 0) {
    feDetReq.Tributos = {
      Tributo: request.Tributos.map((t) => ({
        Id: t.Id,
        Desc: t.Desc,
        BaseImp: t.BaseImp,
        Alic: t.Alic,
        Importe: t.Importe,
      })),
    };
  }

  // Agregar comprobantes asociados si hay
  if (request.CbtesAsoc && request.CbtesAsoc.length > 0) {
    feDetReq.CbtesAsoc = {
      CbteAsoc: request.CbtesAsoc.map((c) => ({
        Tipo: c.Tipo,
        PtoVta: c.PtoVta,
        Nro: c.Nro,
        Cuit: c.Cuit,
        CbteFch: c.CbteFch,
      })),
    };
  }

  const args = {
    Auth: createAuth(config),
    FeCAEReq: {
      FeCabReq: {
        CantReg: 1,
        PtoVta: request.PtoVta,
        CbteTipo: request.CbteTipo,
      },
      FeDetReq: {
        FECAEDetRequest: feDetReq,
      },
    },
  };

  const result = await client.FECAESolicitarAsync(args);

  const response = result[0].FECAESolicitarResult;

  // Verificar errores globales
  if (response.Errors) {
    const errors = Array.isArray(response.Errors.Err)
      ? response.Errors.Err
      : [response.Errors.Err];
    throw new Error(
      `WSFE Errors: ${errors.map((e: { Code: number; Msg: string }) => `${e.Code}: ${e.Msg}`).join(', ')}`
    );
  }

  // Obtener detalle de respuesta
  // FECAEDetResponse puede ser un objeto o un array
  const detResponseRaw = response.FeDetResp.FECAEDetResponse;
  const detResponse = Array.isArray(detResponseRaw) ? detResponseRaw[0] : detResponseRaw;

  const resultado: FECAEResponse = {
    Resultado: detResponse.Resultado,
    CAE: detResponse.CAE || undefined,
    CAEFchVto: detResponse.CAEFchVto || undefined,
    CbteDesde: detResponse.CbteDesde,
    CbteHasta: detResponse.CbteHasta,
  };

  // Agregar observaciones si hay
  if (detResponse.Observaciones) {
    const obs = detResponse.Observaciones.Obs;
    resultado.Observaciones = Array.isArray(obs) ? obs : [obs];
  }

  return resultado;
}

/**
 * Consulta un comprobante por número
 */
export async function getVoucher(
  config: WSFEConfig,
  ptoVta: number,
  cbteTipo: number,
  cbteNro: number
): Promise<Record<string, unknown>> {
  const client = await createWSFEClient(config.production);

  const args = {
    Auth: createAuth(config),
    FeCompConsReq: {
      PtoVta: ptoVta,
      CbteTipo: cbteTipo,
      CbteNro: cbteNro,
    },
  };

  const result = await client.FECompConsultarAsync(args);

  const response = result[0].FECompConsultarResult;

  if (response.Errors) {
    const error = response.Errors.Err[0];
    throw new Error(`WSFE Error ${error.Code}: ${error.Msg}`);
  }

  return response.ResultGet;
}

/**
 * Obtiene los puntos de venta habilitados
 */
export async function getSalesPoints(config: WSFEConfig): Promise<Array<{ Nro: number; Bloqueado: string; FchBaja?: string }>> {
  const client = await createWSFEClient(config.production);

  const args = {
    Auth: createAuth(config),
  };

  const result = await client.FEParamGetPtosVentaAsync(args);

  const response = result[0].FEParamGetPtosVentaResult;

  if (response.Errors) {
    const error = response.Errors.Err[0];
    throw new Error(`WSFE Error ${error.Code}: ${error.Msg}`);
  }

  if (!response.ResultGet) {
    return [];
  }

  const pts = response.ResultGet.PtoVenta;
  return Array.isArray(pts) ? pts : [pts];
}

/**
 * Obtiene los tipos de comprobante habilitados
 */
export async function getVoucherTypes(config: WSFEConfig): Promise<Array<{ Id: number; Desc: string; FchDesde: string; FchHasta?: string }>> {
  const client = await createWSFEClient(config.production);

  const args = {
    Auth: createAuth(config),
  };

  const result = await client.FEParamGetTiposCbteAsync(args);

  const response = result[0].FEParamGetTiposCbteResult;

  if (response.Errors) {
    const error = response.Errors.Err[0];
    throw new Error(`WSFE Error ${error.Code}: ${error.Msg}`);
  }

  const tipos = response.ResultGet.CbteTipo;
  return Array.isArray(tipos) ? tipos : [tipos];
}

/**
 * Obtiene los tipos de documento
 */
export async function getDocumentTypes(config: WSFEConfig): Promise<Array<{ Id: number; Desc: string }>> {
  const client = await createWSFEClient(config.production);

  const args = {
    Auth: createAuth(config),
  };

  const result = await client.FEParamGetTiposDocAsync(args);

  const response = result[0].FEParamGetTiposDocResult;

  if (response.Errors) {
    const error = response.Errors.Err[0];
    throw new Error(`WSFE Error ${error.Code}: ${error.Msg}`);
  }

  const tipos = response.ResultGet.DocTipo;
  return Array.isArray(tipos) ? tipos : [tipos];
}

/**
 * Obtiene las alícuotas de IVA
 */
export async function getIvaTypes(config: WSFEConfig): Promise<Array<{ Id: number; Desc: string }>> {
  const client = await createWSFEClient(config.production);

  const args = {
    Auth: createAuth(config),
  };

  const result = await client.FEParamGetTiposIvaAsync(args);

  const response = result[0].FEParamGetTiposIvaResult;

  if (response.Errors) {
    const error = response.Errors.Err[0];
    throw new Error(`WSFE Error ${error.Code}: ${error.Msg}`);
  }

  const tipos = response.ResultGet.IvaTipo;
  return Array.isArray(tipos) ? tipos : [tipos];
}

/**
 * Obtiene las monedas disponibles
 */
export async function getCurrencies(config: WSFEConfig): Promise<Array<{ Id: string; Desc: string }>> {
  const client = await createWSFEClient(config.production);

  const args = {
    Auth: createAuth(config),
  };

  const result = await client.FEParamGetTiposMonedasAsync(args);

  const response = result[0].FEParamGetTiposMonedasResult;

  if (response.Errors) {
    const error = response.Errors.Err[0];
    throw new Error(`WSFE Error ${error.Code}: ${error.Msg}`);
  }

  const monedas = response.ResultGet.Moneda;
  return Array.isArray(monedas) ? monedas : [monedas];
}
