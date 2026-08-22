/**
 * Cliente ARCA - Implementación propia
 * Maneja autenticación y facturación electrónica con ARCA (ex-AFIP)
 */

import { query } from '@/lib/db';
import type {
  ArcaConfig,
  ArcaAmbiente,
  FacturaArcaResponse,
  ArcaError,
  AlicuotaItem,
} from './types';
import {
  TIPO_FACTURA_A_CODIGO,
  TIPO_DOC_A_CODIGO,
  formatFechaArca,
  generarQRData,
} from './types';
import { MENSAJES_ERROR } from './constants';
import { getCredentials, isCredentialsValid, WSAACredentials } from './wsaa';
import * as wsfe from './wsfe';

// Cache de credenciales
let cachedCredentials: WSAACredentials | null = null;

/**
 * Obtiene la configuración de ARCA desde la BD
 */
export async function getArcaConfig(orgId?: string): Promise<ArcaConfig | null> {
  if (orgId) {
    const result = await query('SELECT * FROM arca_config WHERE org_id = $1 LIMIT 1', [orgId]);
    return result.rows[0] || null;
  }
  const result = await query('SELECT * FROM arca_config LIMIT 1');
  return result.rows[0] || null;
}

/**
 * Guarda la configuración de ARCA
 */
export async function saveArcaConfig(config: Partial<ArcaConfig>, orgId?: string): Promise<ArcaConfig> {
  const existingConfig = await getArcaConfig(orgId);

  if (existingConfig) {
    // Update
    const result = await query(
      `UPDATE arca_config SET
        cuit_emisor = COALESCE($1, cuit_emisor),
        razon_social = COALESCE($2, razon_social),
        domicilio_comercial = COALESCE($3, domicilio_comercial),
        condicion_iva = COALESCE($4, condicion_iva),
        punto_venta = COALESCE($5, punto_venta),
        ambiente = COALESCE($6, ambiente),
        certificado_crt = COALESCE($7, certificado_crt),
        certificado_key = COALESCE($8, certificado_key),
        inicio_actividades = COALESCE($9, inicio_actividades),
        iibb = COALESCE($10, iibb),
        certificado_crt_prod = COALESCE($13, certificado_crt_prod),
        certificado_key_prod = COALESCE($14, certificado_key_prod),
        updated_at = NOW()
      WHERE id = $11 AND org_id = $12
      RETURNING *`,
      [
        config.cuit_emisor,
        config.razon_social,
        config.domicilio_comercial,
        config.condicion_iva,
        config.punto_venta,
        config.ambiente,
        config.certificado_crt,
        config.certificado_key,
        config.inicio_actividades,
        config.iibb,
        existingConfig.id,
        orgId,
        config.certificado_crt_prod,
        config.certificado_key_prod,
      ]
    );
    return result.rows[0];
  } else {
    // Insert
    const result = await query(
      `INSERT INTO arca_config (
        cuit_emisor, razon_social, domicilio_comercial, condicion_iva,
        punto_venta, ambiente, certificado_crt, certificado_key,
        inicio_actividades, iibb, org_id, certificado_crt_prod, certificado_key_prod
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        config.cuit_emisor,
        config.razon_social,
        config.domicilio_comercial || null,
        config.condicion_iva || 'responsable_inscripto',
        config.punto_venta || '00001',
        config.ambiente || 'homologacion',
        config.certificado_crt || null,
        config.certificado_key || null,
        config.inicio_actividades || null,
        config.iibb || null,
        orgId,
        config.certificado_crt_prod || null,
        config.certificado_key_prod || null,
      ]
    );
    return result.rows[0];
  }
}

/**
 * Guarda las credenciales en la base de datos
 */
async function saveCredentialsToDB(credentials: WSAACredentials, orgId?: string): Promise<void> {
  if (orgId) {
    await query(
      `UPDATE arca_config SET
        token_wsaa = $1,
        token_sign = $2,
        token_expira = $3,
        updated_at = NOW()
      WHERE org_id = $4`,
      [
        credentials.token,
        credentials.sign,
        credentials.expirationTime.toISOString(),
        orgId,
      ]
    );
  } else {
    await query(
      `UPDATE arca_config SET
        token_wsaa = $1,
        token_sign = $2,
        token_expira = $3,
        updated_at = NOW()`,
      [
        credentials.token,
        credentials.sign,
        credentials.expirationTime.toISOString(),
      ]
    );
  }
}

/**
 * Obtiene credenciales de la base de datos si son válidas
 */
async function getCredentialsFromDB(orgId?: string): Promise<WSAACredentials | null> {
  const result = orgId
    ? await query(
        'SELECT token_wsaa, token_sign, token_expira FROM arca_config WHERE token_wsaa IS NOT NULL AND org_id = $1 LIMIT 1',
        [orgId]
      )
    : await query(
        'SELECT token_wsaa, token_sign, token_expira FROM arca_config WHERE token_wsaa IS NOT NULL LIMIT 1'
      );

  if (result.rows.length === 0 || !result.rows[0].token_wsaa) {
    return null;
  }

  const row = result.rows[0];
  const credentials: WSAACredentials = {
    token: row.token_wsaa,
    sign: row.token_sign,
    expirationTime: new Date(row.token_expira),
    generationTime: new Date(), // No guardamos esto, usar fecha actual
  };

  // Verificar si aún es válido
  if (isCredentialsValid(credentials)) {
    return credentials;
  }

  return null;
}

/**
 * Obtiene credenciales de autenticación (con cache en memoria y BD)
 */
async function getAuthCredentials(config: ArcaConfig, orgId?: string): Promise<WSAACredentials> {
  // 1. Primero verificar cache en memoria
  if (cachedCredentials && isCredentialsValid(cachedCredentials)) {
    console.log('[ARCA] Usando credenciales del cache en memoria');
    return cachedCredentials;
  }

  // 2. Luego verificar en base de datos
  const dbCredentials = await getCredentialsFromDB(orgId);
  if (dbCredentials) {
    console.log('[ARCA] Usando credenciales guardadas en BD');
    cachedCredentials = dbCredentials;
    return dbCredentials;
  }

  // 3. Si no hay credenciales válidas, obtener nuevas
  console.log('[ARCA] Obteniendo nuevas credenciales de WSAA...');
  const isProduction = config.ambiente === 'produccion';
  const cert = isProduction ? (config.certificado_crt_prod || config.certificado_crt || '') : (config.certificado_crt || '');
  const key = isProduction ? (config.certificado_key_prod || config.certificado_key || '') : (config.certificado_key || '');
  cachedCredentials = await getCredentials({
    cert,
    key,
    production: isProduction,
    service: 'wsfe',
  });

  // Guardar en BD para persistir entre requests
  await saveCredentialsToDB(cachedCredentials, orgId);

  return cachedCredentials;
}

/**
 * Crea la configuración de WSFE
 */
async function createWSFEConfig(config: ArcaConfig, orgId?: string): Promise<wsfe.WSFEConfig> {
  const credentials = await getAuthCredentials(config, orgId);

  return {
    cuit: config.cuit_emisor,
    credentials,
    production: config.ambiente === 'produccion',
  };
}

/**
 * Prueba la conexión con ARCA
 */
export async function testConnection(orgId?: string): Promise<{
  success: boolean;
  message: string;
  serverStatus?: string;
  puntosVenta?: string;
  ultimoComprobante?: string;
}> {
  try {
    const config = await getArcaConfig(orgId);

    if (!config) {
      throw new Error(MENSAJES_ERROR.SIN_CONFIG);
    }

    const isProduction = config.ambiente === 'produccion';
    const hasCerts = isProduction
      ? (config.certificado_crt_prod || config.certificado_crt) && (config.certificado_key_prod || config.certificado_key)
      : config.certificado_crt && config.certificado_key;

    if (!hasCerts) {
      throw new Error(MENSAJES_ERROR.SIN_CERTIFICADO);
    }

    // Limpiar cache para forzar re-autenticación con el ambiente correcto
    cachedCredentials = null;

    // Crear configuración WSFE (esto autentica con WSAA)
    const wsfeConfig = await createWSFEConfig(config, orgId);

    // Obtener estado del servidor
    const serverStatus = await wsfe.getServerStatus(wsfeConfig);

    // Si llegamos aquí, la autenticación funcionó
    let puntosVenta: unknown[] = [];
    let ultimoComprobante = 0;

    // Intentar obtener puntos de venta (puede fallar si no hay configurados)
    try {
      puntosVenta = await wsfe.getSalesPoints(wsfeConfig);
    } catch (e) {
      // Error 602 = Sin resultados (normal en homologación)
      console.log('[ARCA] Sin puntos de venta configurados');
    }

    // Intentar obtener último comprobante del punto de venta configurado
    try {
      const ptoVta = parseInt(config.punto_venta) || 1;
      ultimoComprobante = await wsfe.getLastVoucher(wsfeConfig, ptoVta, 6); // 6 = Factura B
    } catch (e) {
      console.log('[ARCA] Error obteniendo último comprobante:', e);
    }

    return {
      success: true,
      message: `Conexión exitosa con ARCA (${config.ambiente})`,
      serverStatus: JSON.stringify(serverStatus),
      puntosVenta: JSON.stringify(puntosVenta),
      ultimoComprobante: `Último comprobante Factura B: ${ultimoComprobante}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene el último número de comprobante autorizado
 */
export async function getUltimoAutorizado(
  tipoComprobante: number,
  puntoVenta?: number,
  orgId?: string
): Promise<number> {
  const config = await getArcaConfig(orgId);

  if (!config) {
    throw new Error(MENSAJES_ERROR.SIN_CONFIG);
  }

  const wsfeConfig = await createWSFEConfig(config, orgId);
  const ptoVta = puntoVenta || parseInt(config.punto_venta);

  return await wsfe.getLastVoucher(wsfeConfig, ptoVta, tipoComprobante);
}

/**
 * Solicita CAE para una factura
 */
export async function solicitarCAE(
  facturaId: string,
  orgId?: string
): Promise<FacturaArcaResponse> {
  const config = await getArcaConfig(orgId);

  if (!config) {
    throw new Error(MENSAJES_ERROR.SIN_CONFIG);
  }

  const wsfeConfig = await createWSFEConfig(config, orgId);

  // Obtener datos de la factura con cliente
  const facturaResult = orgId
    ? await query(
        `SELECT f.*, c.nombre as cliente_nombre, c.cuit as cliente_cuit,
                c.condicion_iva as cliente_condicion_iva, c.tipo_documento as cliente_tipo_doc,
                c.numero_documento as cliente_numero_doc, c.dni as cliente_dni
         FROM facturas f
         LEFT JOIN clientes c ON f.cliente_id = c.id
         WHERE f.id = $1 AND f.org_id = $2`,
        [facturaId, orgId]
      )
    : await query(
        `SELECT f.*, c.nombre as cliente_nombre, c.cuit as cliente_cuit,
                c.condicion_iva as cliente_condicion_iva, c.tipo_documento as cliente_tipo_doc,
                c.numero_documento as cliente_numero_doc, c.dni as cliente_dni
         FROM facturas f
         LEFT JOIN clientes c ON f.cliente_id = c.id
         WHERE f.id = $1`,
        [facturaId]
      );

  if (facturaResult.rows.length === 0) {
    throw new Error(MENSAJES_ERROR.FACTURA_NO_ENCONTRADA);
  }

  const factura = facturaResult.rows[0];

  // Obtener items de la factura
  const itemsResult = await query(
    `SELECT * FROM facturas_items WHERE factura_id = $1`,
    [facturaId]
  );

  // Usar items de tabla facturas_items o de campo JSONB detalles
  let items = itemsResult.rows;

  if (items.length === 0 && factura.detalles) {
    // Parsear detalles JSONB si no hay items en tabla separada
    let detallesRaw = factura.detalles;
    if (typeof detallesRaw === 'string') {
      detallesRaw = JSON.parse(detallesRaw);
    }

    // Los detalles pueden venir como array directo o dentro de { items: [...] }
    const detalles = Array.isArray(detallesRaw)
      ? detallesRaw
      : (detallesRaw.items || []);

    items = detalles.map((d: {
      descripcion?: string;
      cantidad?: number;
      precio_unitario?: number;
      subtotal?: number;
      iva_porcentaje?: number;
      alicuota_iva?: number; // Campo alternativo usado en algunas facturas
    }) => {
      // Obtener porcentaje de IVA (puede venir como iva_porcentaje o alicuota_iva)
      const ivaPorcentaje = d.iva_porcentaje ?? d.alicuota_iva ?? 21;
      const precioUnitario = d.precio_unitario || d.subtotal || 0;
      const cantidad = d.cantidad || 1;

      // Calcular neto e IVA
      // Si el precio ya incluye IVA, calcular el neto
      const precioNeto = precioUnitario / (1 + ivaPorcentaje / 100);
      const montoIva = precioUnitario - precioNeto;

      return {
        descripcion: d.descripcion,
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        subtotal: d.subtotal || precioUnitario * cantidad,
        iva_porcentaje: ivaPorcentaje,
        // Calcular alícuota ARCA según porcentaje
        alicuota_iva_id: ivaPorcentaje === 0 ? 3 :
                         ivaPorcentaje === 10.5 ? 4 :
                         ivaPorcentaje === 21 ? 5 :
                         ivaPorcentaje === 27 ? 6 : 5,
        // Precio neto e IVA calculados
        precio_neto: precioNeto,
        monto_iva: montoIva,
      };
    });
  }

  // Determinar tipo de comprobante
  const tipoFactura = factura.tipo_factura || 'B';
  const tipoComprobante = TIPO_FACTURA_A_CODIGO[tipoFactura] || 6;

  // ========== VALIDACIONES PREVIAS ==========
  // Validar requisitos según tipo de factura ANTES de enviar a ARCA

  // Factura A: Solo para clientes con CUIT y Responsable Inscripto
  if (tipoFactura === 'A') {
    if (!factura.cliente_cuit) {
      throw new Error(
        'Factura A requiere que el cliente tenga CUIT. ' +
        'Las facturas tipo A solo se pueden emitir a Responsables Inscriptos con CUIT válido.'
      );
    }
    if (factura.cliente_condicion_iva && factura.cliente_condicion_iva !== 'responsable_inscripto') {
      throw new Error(
        `Factura A solo se puede emitir a Responsables Inscriptos. ` +
        `El cliente "${factura.cliente_nombre}" tiene condición IVA: ${factura.cliente_condicion_iva}. ` +
        `Cambie el tipo de factura a B o C según corresponda.`
      );
    }
  }

  // Factura B: Puede ser a cualquier cliente (Consumidor Final, Exento, etc.)
  // No requiere CUIT si es consumidor final

  // Factura C: Similar a B (para Monotributistas emisores)
  // ========== FIN VALIDACIONES ==========

  // Determinar tipo y número de documento del receptor
  let docTipo = 99; // Consumidor Final por defecto
  let docNro = '0';
  // Condición IVA del receptor (RG 5616) - requerido desde enero 2025
  // 1=RI, 4=Exento, 5=Consumidor Final, 6=Monotributo
  let condicionIvaReceptor = 5; // Consumidor Final por defecto

  if (factura.cliente_cuit) {
    docTipo = 80; // CUIT
    docNro = factura.cliente_cuit.replace(/-/g, '');
    // Determinar condición IVA según tipo de factura
    if (tipoFactura === 'A') {
      condicionIvaReceptor = 1; // Responsable Inscripto (factura A)
    } else if (factura.cliente_condicion_iva) {
      // Mapear condición IVA del cliente
      const condicionesMap: Record<string, number> = {
        'responsable_inscripto': 1,
        'monotributista': 6,
        'exento': 4,
        'consumidor_final': 5,
        'monotributo_social': 13,
      };
      condicionIvaReceptor = condicionesMap[factura.cliente_condicion_iva] || 5;
    }
  } else if (factura.cliente_tipo_doc && factura.cliente_tipo_doc !== 'CUIT') {
    docTipo = TIPO_DOC_A_CODIGO[factura.cliente_tipo_doc] || 99;
    // Usar numero_documento o dni como docNro
    docNro = factura.cliente_numero_doc || factura.cliente_dni || '0';
    // Limpiar caracteres no numéricos
    docNro = docNro.toString().replace(/\D/g, '') || '0';
  }

  // Preparar alícuotas IVA
  const alicuotasMap = new Map<number, { baseImp: number; importe: number }>();

  console.log('[ARCA] Items para procesar:', JSON.stringify(items, null, 2));

  for (const item of items) {
    // Convertir valores a número explícitamente (PostgreSQL puede retornar strings para numeric)
    const alicuotaId = Number(item.alicuota_iva_id) || 5; // 21% por defecto
    const precioUnitario = Number(item.precio_unitario) || 0;
    const precioNetoRaw = Number(item.precio_neto);
    const precioNeto = precioNetoRaw > 0 ? precioNetoRaw : precioUnitario / 1.21;
    const cantidad = Number(item.cantidad) || 1;
    const baseImp = precioNeto * cantidad;
    const montoIvaRaw = Number(item.monto_iva);
    const montoIva = montoIvaRaw > 0 ? montoIvaRaw : baseImp * 0.21;

    console.log('[ARCA] Item procesado:', {
      descripcion: item.descripcion,
      precioUnitario,
      precioNeto,
      cantidad,
      baseImp,
      montoIva,
      alicuotaId,
    });

    const current = alicuotasMap.get(alicuotaId) || { baseImp: 0, importe: 0 };
    alicuotasMap.set(alicuotaId, {
      baseImp: current.baseImp + baseImp,
      importe: current.importe + montoIva,
    });
  }

  const alicuotas: AlicuotaItem[] = Array.from(alicuotasMap.entries()).map(
    ([id, data]) => ({
      id,
      base_imp: Math.round(data.baseImp * 100) / 100,
      importe: Math.round(data.importe * 100) / 100,
    })
  );

  console.log('[ARCA] Alícuotas calculadas:', JSON.stringify(alicuotas, null, 2));

  // Calcular totales
  // IMPORTANTE: Para ARCA, ImpTotal = ImpNeto + ImpIVA + ImpTotConc + ImpOpEx + ImpTrib
  // Los importes deben cuadrar exactamente, sino ARCA rechaza el comprobante
  const impNeto = Math.round(alicuotas.reduce((sum, a) => sum + a.base_imp, 0) * 100) / 100;
  const impIva = Math.round(alicuotas.reduce((sum, a) => sum + a.importe, 0) * 100) / 100;
  // Siempre calcular el total desde los componentes para que cuadre
  const impTotal = Math.round((impNeto + impIva) * 100) / 100;

  // Obtener último número
  const puntoVenta = parseInt(config.punto_venta);
  const ultimoNumero = await wsfe.getLastVoucher(wsfeConfig, puntoVenta, tipoComprobante);
  const nuevoNumero = ultimoNumero + 1;

  // Construir request
  const fechaHoy = formatFechaArca(new Date());

  const request: wsfe.FECAERequest = {
    CbteTipo: tipoComprobante,
    PtoVta: puntoVenta,
    Concepto: 1, // Productos (TODO: detectar si hay servicios)
    DocTipo: docTipo,
    DocNro: docNro,
    CondicionIVAReceptorId: condicionIvaReceptor, // RG 5616 - obligatorio
    CbteDesde: nuevoNumero,
    CbteHasta: nuevoNumero,
    CbteFch: fechaHoy,
    ImpTotal: impTotal,
    ImpTotConc: 0,
    ImpNeto: impNeto,
    ImpOpEx: 0,
    ImpIVA: impIva,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
  };

  // Agregar alícuotas solo si hay y no es factura C
  if (alicuotas.length > 0 && tipoFactura !== 'C') {
    request.Iva = alicuotas.map((a) => ({
      Id: a.id,
      BaseImp: a.base_imp,
      Importe: a.importe,
    }));
  }

  console.log('[ARCA] Request final:', JSON.stringify(request, null, 2));

  // Log del request
  await logComprobante({
    factura_id: facturaId,
    tipo_comprobante: tipoComprobante,
    punto_venta: config.punto_venta,
    numero_comprobante: nuevoNumero,
    ambiente: config.ambiente,
    request_xml: JSON.stringify(request),
    org_id: orgId,
  });

  try {
    // Llamar a ARCA
    const response = await wsfe.requestCAE(wsfeConfig, request);

    // Procesar respuesta
    const resultado: FacturaArcaResponse = {
      resultado: response.Resultado,
      cae: response.CAE,
      cae_fch_vto: response.CAEFchVto,
      cbte_desde: response.CbteDesde,
      cbte_hasta: response.CbteHasta,
    };

    // Generar QR si fue aprobado
    let qrData: string | null = null;
    if (resultado.cae) {
      const qr = generarQRData({
        fecha: new Date(),
        cuit: config.cuit_emisor,
        puntoVenta: puntoVenta,
        tipoComprobante: tipoComprobante,
        numeroComprobante: nuevoNumero,
        importe: impTotal,
        moneda: 'PES',
        cotizacion: 1,
        tipoDocReceptor: docTipo,
        nroDocReceptor: docNro,
        cae: resultado.cae,
      });
      qrData = JSON.stringify(qr);
    }

    // Actualizar factura
    await query(
      orgId
        ? `UPDATE facturas SET
            nro_factura = $1,
            cae = $2,
            cae_vto = $3,
            afip_resultado = $4,
            afip_status = $5,
            qr_data = $6
          WHERE id = $7 AND org_id = $8`
        : `UPDATE facturas SET
            nro_factura = $1,
            cae = $2,
            cae_vto = $3,
            afip_resultado = $4,
            afip_status = $5,
            qr_data = $6
          WHERE id = $7`,
      orgId
        ? [
            `${puntoVenta.toString().padStart(5, '0')}-${nuevoNumero.toString().padStart(8, '0')}`,
            resultado.cae,
            resultado.cae_fch_vto
              ? `${resultado.cae_fch_vto.slice(0, 4)}-${resultado.cae_fch_vto.slice(4, 6)}-${resultado.cae_fch_vto.slice(6, 8)}`
              : null,
            JSON.stringify({ resultado: resultado.resultado, cae: resultado.cae }),
            resultado.resultado === 'A' ? 'autorizada' : 'rechazada',
            qrData,
            facturaId,
            orgId,
          ]
        : [
            `${puntoVenta.toString().padStart(5, '0')}-${nuevoNumero.toString().padStart(8, '0')}`,
            resultado.cae,
            resultado.cae_fch_vto
              ? `${resultado.cae_fch_vto.slice(0, 4)}-${resultado.cae_fch_vto.slice(4, 6)}-${resultado.cae_fch_vto.slice(6, 8)}`
              : null,
            JSON.stringify({ resultado: resultado.resultado, cae: resultado.cae }),
            resultado.resultado === 'A' ? 'autorizada' : 'rechazada',
            qrData,
            facturaId,
          ]
    );

    // Log del response
    await logComprobante({
      factura_id: facturaId,
      tipo_comprobante: tipoComprobante,
      punto_venta: config.punto_venta,
      numero_comprobante: nuevoNumero,
      cae: resultado.cae,
      cae_vto: resultado.cae_fch_vto,
      resultado: resultado.resultado,
      ambiente: config.ambiente,
      response_xml: JSON.stringify(response),
      org_id: orgId,
    });

    return resultado;
  } catch (error) {
    // Log del error
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';

    await logComprobante({
      factura_id: facturaId,
      tipo_comprobante: tipoComprobante,
      punto_venta: config.punto_venta,
      ambiente: config.ambiente,
      resultado: 'R',
      errores: [{ code: 'ERROR', msg: errorMsg }],
      response_xml: JSON.stringify({ error: errorMsg }),
      org_id: orgId,
    });

    // Actualizar factura con error
    await query(
      orgId
        ? `UPDATE facturas SET
            afip_resultado = $1,
            afip_status = 'error',
            afip_errores = $2
          WHERE id = $3 AND org_id = $4`
        : `UPDATE facturas SET
            afip_resultado = $1,
            afip_status = 'error',
            afip_errores = $2
          WHERE id = $3`,
      orgId
        ? [
            JSON.stringify({ resultado: 'R', error: errorMsg }),
            JSON.stringify([{ code: 'ERROR', msg: errorMsg }]),
            facturaId,
            orgId,
          ]
        : [
            JSON.stringify({ resultado: 'R', error: errorMsg }),
            JSON.stringify([{ code: 'ERROR', msg: errorMsg }]),
            facturaId,
          ]
    );

    throw error;
  }
}

/**
 * Consulta un comprobante por número
 */
export async function consultarComprobante(
  tipoComprobante: number,
  puntoVenta: number,
  numeroComprobante: number,
  orgId?: string
): Promise<unknown> {
  const config = await getArcaConfig(orgId);

  if (!config) {
    throw new Error(MENSAJES_ERROR.SIN_CONFIG);
  }

  const wsfeConfig = await createWSFEConfig(config, orgId);

  return await wsfe.getVoucher(wsfeConfig, puntoVenta, tipoComprobante, numeroComprobante);
}

/**
 * Obtiene los puntos de venta habilitados
 */
export async function getPuntosVenta(orgId?: string): Promise<unknown[]> {
  const config = await getArcaConfig(orgId);

  if (!config) {
    throw new Error(MENSAJES_ERROR.SIN_CONFIG);
  }

  const wsfeConfig = await createWSFEConfig(config, orgId);
  return await wsfe.getSalesPoints(wsfeConfig);
}

/**
 * Obtiene los tipos de comprobante habilitados
 */
export async function getTiposComprobante(orgId?: string): Promise<unknown[]> {
  const config = await getArcaConfig(orgId);

  if (!config) {
    throw new Error(MENSAJES_ERROR.SIN_CONFIG);
  }

  const wsfeConfig = await createWSFEConfig(config, orgId);
  return await wsfe.getVoucherTypes(wsfeConfig);
}

/**
 * Registra una transacción en el log
 */
async function logComprobante(data: {
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
  observaciones?: unknown[];
  ambiente: ArcaAmbiente;
  org_id?: string;
}): Promise<void> {
  await query(
    `INSERT INTO arca_comprobantes_log (
      factura_id, tipo_comprobante, punto_venta, numero_comprobante,
      cae, cae_vto, resultado, request_xml, response_xml,
      errores, observaciones, ambiente, org_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      data.factura_id || null,
      data.tipo_comprobante,
      data.punto_venta,
      data.numero_comprobante || null,
      data.cae || null,
      data.cae_vto || null,
      data.resultado || null,
      data.request_xml || null,
      data.response_xml || null,
      data.errores ? JSON.stringify(data.errores) : null,
      data.observaciones ? JSON.stringify(data.observaciones) : null,
      data.ambiente,
      data.org_id || null,
    ]
  );
}
