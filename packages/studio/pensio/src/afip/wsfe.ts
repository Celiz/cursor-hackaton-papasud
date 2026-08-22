/**
 * WSFE - Web Service de Facturación Electrónica
 * Permite emitir comprobantes electrónicos
 */

import * as soap from 'soap'
import { WSFE_URLS } from './constants'
import type {
  Ambiente,
  WSAACredentials,
  ComprobanteRequest,
  ComprobanteResponse,
  AlicuotaIva,
  TIPO_FACTURA_CODIGO,
} from './types'

export interface WSFEConfig {
  cuit: string
  credentials: WSAACredentials
  ambiente: Ambiente
}

interface WSFEAuth {
  Token: string
  Sign: string
  Cuit: string
}

let soapClient: soap.Client | null = null
let clientAmbiente: Ambiente | null = null

async function getClient(ambiente: Ambiente): Promise<soap.Client> {
  if (soapClient && clientAmbiente === ambiente) {
    return soapClient
  }

  const url = WSFE_URLS[ambiente]
  soapClient = await soap.createClientAsync(url)
  clientAmbiente = ambiente
  return soapClient
}

function getAuth(config: WSFEConfig): WSFEAuth {
  return {
    Token: config.credentials.token,
    Sign: config.credentials.sign,
    Cuit: config.cuit,
  }
}

/**
 * Obtiene el estado del servidor
 */
export async function getServerStatus(config: WSFEConfig): Promise<{ AppServer: string; DbServer: string; AuthServer: string }> {
  const client = await getClient(config.ambiente)

  const [result] = await client.FEDummyAsync({})
  return result.FEDummyResult
}

/**
 * Obtiene el último número de comprobante autorizado
 */
export async function getLastVoucher(
  config: WSFEConfig,
  puntoVenta: number,
  tipoComprobante: number
): Promise<number> {
  const client = await getClient(config.ambiente)

  const [result] = await client.FECompUltimoAutorizadoAsync({
    Auth: getAuth(config),
    PtoVta: puntoVenta,
    CbteTipo: tipoComprobante,
  })

  const response = result.FECompUltimoAutorizadoResult

  if (response.Errors) {
    const error = response.Errors.Err[0]
    throw new Error(`AFIP Error ${error.Code}: ${error.Msg}`)
  }

  return response.CbteNro
}

/**
 * Obtiene los puntos de venta habilitados
 */
export async function getSalesPoints(config: WSFEConfig): Promise<unknown[]> {
  const client = await getClient(config.ambiente)

  const [result] = await client.FEParamGetPtosVentaAsync({
    Auth: getAuth(config),
  })

  const response = result.FEParamGetPtosVentaResult

  if (response.Errors) {
    const error = response.Errors.Err[0]
    throw new Error(`AFIP Error ${error.Code}: ${error.Msg}`)
  }

  return response.ResultGet?.PtoVenta || []
}

/**
 * Obtiene los tipos de comprobante
 */
export async function getVoucherTypes(config: WSFEConfig): Promise<unknown[]> {
  const client = await getClient(config.ambiente)

  const [result] = await client.FEParamGetTiposCbteAsync({
    Auth: getAuth(config),
  })

  const response = result.FEParamGetTiposCbteResult

  if (response.Errors) {
    const error = response.Errors.Err[0]
    throw new Error(`AFIP Error ${error.Code}: ${error.Msg}`)
  }

  return response.ResultGet?.CbteTipo || []
}

/**
 * Solicita CAE para un comprobante
 */
export async function requestCAE(
  config: WSFEConfig,
  puntoVenta: number,
  tipoComprobante: number,
  request: {
    CbteDesde: number
    CbteHasta: number
    CbteFch: string
    Concepto: number
    DocTipo: number
    DocNro: string
    ImpTotal: number
    ImpTotConc: number
    ImpNeto: number
    ImpOpEx: number
    ImpIVA: number
    ImpTrib: number
    MonId: string
    MonCotiz: number
    CondicionIVAReceptorId?: number
    FchServDesde?: string
    FchServHasta?: string
    FchVtoPago?: string
    Iva?: Array<{ Id: number; BaseImp: number; Importe: number }>
  }
): Promise<ComprobanteResponse> {
  const client = await getClient(config.ambiente)

  const feDetReq: Record<string, unknown> = {
    Concepto: request.Concepto,
    DocTipo: request.DocTipo,
    DocNro: request.DocNro,
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
  }

  // Condición IVA receptor (RG 5616)
  if (request.CondicionIVAReceptorId) {
    feDetReq.CondicionIVAReceptorId = request.CondicionIVAReceptorId
  }

  // Fechas para servicios
  if (request.FchServDesde) feDetReq.FchServDesde = request.FchServDesde
  if (request.FchServHasta) feDetReq.FchServHasta = request.FchServHasta
  if (request.FchVtoPago) feDetReq.FchVtoPago = request.FchVtoPago

  // Alícuotas IVA
  if (request.Iva && request.Iva.length > 0) {
    feDetReq.Iva = {
      AlicIva: request.Iva,
    }
  }

  const [result] = await client.FECAESolicitarAsync({
    Auth: getAuth(config),
    FeCAEReq: {
      FeCabReq: {
        CantReg: 1,
        PtoVta: puntoVenta,
        CbteTipo: tipoComprobante,
      },
      FeDetReq: {
        FECAEDetRequest: feDetReq,
      },
    },
  })

  const response = result.FECAESolicitarResult

  // Check for general errors
  if (response.Errors) {
    const error = response.Errors.Err[0]
    throw new Error(`AFIP Error ${error.Code}: ${error.Msg}`)
  }

  // Get detail response
  const detResponse = response.FeDetResp?.FECAEDetResponse?.[0]

  if (!detResponse) {
    throw new Error('No se recibió respuesta del comprobante')
  }

  const resultado: ComprobanteResponse = {
    resultado: detResponse.Resultado,
    cae: detResponse.CAE,
    caeFchVto: detResponse.CAEFchVto,
    cbteDesde: detResponse.CbteDesde,
    cbteHasta: detResponse.CbteHasta,
  }

  // Add errors if any
  if (detResponse.Observaciones?.Obs) {
    resultado.observaciones = detResponse.Observaciones.Obs.map((o: { Code: string; Msg: string }) => ({
      code: o.Code,
      msg: o.Msg,
    }))
  }

  return resultado
}

/**
 * Consulta un comprobante emitido
 */
export async function getVoucher(
  config: WSFEConfig,
  puntoVenta: number,
  tipoComprobante: number,
  numeroComprobante: number
): Promise<unknown> {
  const client = await getClient(config.ambiente)

  const [result] = await client.FECompConsultarAsync({
    Auth: getAuth(config),
    FeCompConsReq: {
      CbteTipo: tipoComprobante,
      CbteNro: numeroComprobante,
      PtoVta: puntoVenta,
    },
  })

  const response = result.FECompConsultarResult

  if (response.Errors) {
    const error = response.Errors.Err[0]
    throw new Error(`AFIP Error ${error.Code}: ${error.Msg}`)
  }

  return response.ResultGet
}
