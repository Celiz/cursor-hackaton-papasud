import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { personaId } = await params
  const orgId = session.org_id

  // 1. Persona + org_contact info
  const personaResult = await query(`
    SELECT
      p.id, p.nombre, p.apellido, p.email, p.telefono, p.direccion,
      p.ciudad, p.provincia, p.documento_tipo, p.documento_nro,
      oc.id as contact_id, oc.tipo, oc.notas, oc.condicion_iva,
      oc.created_at as cliente_desde
    FROM personas p
    LEFT JOIN org_contacts oc ON oc.persona_id = p.id AND oc.org_id = $2
    WHERE p.id = $1
  `, [personaId, orgId])

  if (personaResult.rows.length === 0) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
  }

  const persona = personaResult.rows[0]
  const contactId = persona.contact_id

  // 2. Account balance from vista_cuentas_corrientes
  let saldo = null
  if (contactId) {
    const saldoResult = await query(`
      SELECT
        total_facturado, total_pagado, total_notas_credito,
        saldo_actual, total_vencido, saldo_a_favor_legal
      FROM vista_cuentas_corrientes
      WHERE cliente_id = $1 AND org_id = $2
      LIMIT 1
    `, [contactId, orgId])
    if (saldoResult.rows.length > 0) saldo = saldoResult.rows[0]
  }

  // 3. Recent pedidos (last 10)
  const pedidosResult = await query(`
    SELECT id, numero, fecha, estado, total, created_at
    FROM pedidos
    WHERE org_id = $1 AND cliente_id = $2
    ORDER BY created_at DESC LIMIT 10
  `, [orgId, contactId])

  // 4. Recent servicios (last 10)
  const serviciosResult = await query(`
    SELECT s.id, s.descripcion, s.estado, s.tecnico, s.created_at,
      json_build_object('marca', e.marca, 'modelo', e.modelo) as equipo
    FROM servicios s
    LEFT JOIN equipos_unidades eu ON s.equipo_id = eu.id
    LEFT JOIN equipos e ON eu.equipo_id = e.id
    WHERE s.org_id = $1 AND s.cliente_id = $2
    ORDER BY s.created_at DESC LIMIT 10
  `, [orgId, contactId])

  // 5. Recent facturas (last 10)
  const facturasResult = await query(`
    SELECT id, tipo_comprobante, numero_comprobante, fecha_emision,
      total, estado, created_at
    FROM facturas
    WHERE org_id = $1 AND cliente_id = $2
    ORDER BY created_at DESC LIMIT 10
  `, [orgId, contactId])

  return NextResponse.json({
    persona: {
      id: persona.id,
      nombre: persona.nombre,
      apellido: persona.apellido,
      email: persona.email,
      telefono: persona.telefono,
      direccion: persona.direccion,
      ciudad: persona.ciudad,
      provincia: persona.provincia,
      documento_tipo: persona.documento_tipo,
      documento_nro: persona.documento_nro,
    },
    org_contact: contactId ? {
      id: contactId,
      tipo: persona.tipo,
      notas: persona.notas,
      condicion_iva: persona.condicion_iva,
      cliente_desde: persona.cliente_desde,
    } : null,
    saldo,
    pedidos: pedidosResult.rows,
    servicios: serviciosResult.rows,
    facturas: facturasResult.rows,
  })
}
