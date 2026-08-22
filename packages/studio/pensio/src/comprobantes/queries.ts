import { query } from '@locus/db'
import type { Comprobante, ComprobanteItem, CreateComprobante, ComprobanteConPersona } from './types'

// Note: These queries assume a `comprobantes` and `comprobante_items` table exists
// The migration for these tables should be added to @locus/db

export async function getComprobanteById(id: string): Promise<Comprobante | null> {
  const result = await query<Comprobante>(
    `SELECT c.*,
      (SELECT json_agg(i.*) FROM comprobante_items i WHERE i.comprobante_id = c.id) as items
     FROM comprobantes c
     WHERE c.id = $1`,
    [id]
  )
  return result.rows[0] || null
}

export async function getComprobantesByOrg(
  org_id: string,
  options?: {
    tipo?: string
    status?: string
    desde?: Date
    hasta?: Date
    limit?: number
    offset?: number
  }
): Promise<ComprobanteConPersona[]> {
  const conditions = ['c.org_id = $1']
  const params: unknown[] = [org_id]
  let paramIndex = 2

  if (options?.tipo) {
    conditions.push(`c.tipo = $${paramIndex++}`)
    params.push(options.tipo)
  }

  if (options?.status) {
    conditions.push(`c.afip_status = $${paramIndex++}`)
    params.push(options.status)
  }

  if (options?.desde) {
    conditions.push(`c.fecha >= $${paramIndex++}`)
    params.push(options.desde)
  }

  if (options?.hasta) {
    conditions.push(`c.fecha <= $${paramIndex++}`)
    params.push(options.hasta)
  }

  const limit = options?.limit || 50
  const offset = options?.offset || 0

  params.push(limit, offset)

  const result = await query<ComprobanteConPersona>(
    `SELECT c.*,
      p.nombre as persona_nombre,
      p.documento_nro as persona_cuit,
      p.email as persona_email
     FROM comprobantes c
     LEFT JOIN personas p ON p.id = c.persona_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.fecha DESC, c.numero DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  )

  return result.rows
}

export async function getNextNumero(org_id: string, tipo: string, puntoVenta: number): Promise<number> {
  const prefix = puntoVenta.toString().padStart(5, '0')

  const result = await query<{ numero: string }>(
    `SELECT numero FROM comprobantes
     WHERE org_id = $1 AND tipo = $2 AND numero LIKE $3
     ORDER BY numero DESC LIMIT 1`,
    [org_id, tipo, `${prefix}-%`]
  )

  if (result.rows.length === 0) {
    return 1
  }

  const lastNumero = result.rows[0].numero
  const lastNum = parseInt(lastNumero.split('-')[1])
  return lastNum + 1
}

export async function createComprobante(
  data: CreateComprobante,
  puntoVenta: number
): Promise<Comprobante> {
  const numero = await getNextNumero(data.org_id, data.tipo, puntoVenta)
  const numeroFormatted = `${puntoVenta.toString().padStart(5, '0')}-${numero.toString().padStart(8, '0')}`

  // Calculate totals
  let subtotal = 0
  let ivaTotal = 0

  const itemsProcessed = data.items.map(item => {
    const ivaPct = item.iva_porcentaje ?? 21
    const itemSubtotal = item.cantidad * item.precio_unitario
    const itemIva = itemSubtotal * (ivaPct / 100)

    subtotal += itemSubtotal
    ivaTotal += itemIva

    return {
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      iva_porcentaje: ivaPct,
      subtotal: itemSubtotal,
    }
  })

  const total = subtotal + ivaTotal

  // Insert comprobante
  const comprobanteResult = await query<Comprobante>(
    `INSERT INTO comprobantes (
      org_id, persona_id, tipo, numero, fecha, fecha_vto,
      subtotal, iva, total, afip_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      data.org_id,
      data.persona_id || null,
      data.tipo,
      numeroFormatted,
      data.fecha || new Date(),
      data.fecha_vto || null,
      subtotal,
      ivaTotal,
      total,
      'pendiente',
    ]
  )

  const comprobante = comprobanteResult.rows[0]

  // Insert items
  for (const item of itemsProcessed) {
    await query(
      `INSERT INTO comprobante_items (
        comprobante_id, descripcion, cantidad, precio_unitario, iva_porcentaje, subtotal
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [comprobante.id, item.descripcion, item.cantidad, item.precio_unitario, item.iva_porcentaje, item.subtotal]
    )
  }

  // Fetch with items
  return (await getComprobanteById(comprobante.id))!
}

export async function updateComprobanteAfip(
  id: string,
  data: {
    cae?: string
    cae_vto?: Date
    afip_status: 'autorizada' | 'rechazada' | 'error'
    afip_response?: Record<string, unknown>
  }
): Promise<Comprobante | null> {
  const result = await query<Comprobante>(
    `UPDATE comprobantes SET
      cae = COALESCE($1, cae),
      cae_vto = COALESCE($2, cae_vto),
      afip_status = $3,
      afip_response = COALESCE($4, afip_response),
      updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      data.cae || null,
      data.cae_vto || null,
      data.afip_status,
      data.afip_response ? JSON.stringify(data.afip_response) : null,
      id,
    ]
  )

  return result.rows[0] || null
}
