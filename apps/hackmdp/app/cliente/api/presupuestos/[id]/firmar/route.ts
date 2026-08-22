import { NextRequest, NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getClienteSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const { accion, firma_nombre, firma_imagen, motivo_rechazo } = await request.json()

  // Verify ownership
  const presupuesto = await query(
    `SELECT p.id, p.estado FROM vet_presupuestos p
     JOIN org_contacts oc ON oc.persona_id = p.cliente_id AND oc.org_id = p.org_id
     WHERE p.id = $1 AND p.org_id = $2 AND oc.id = $3 AND p.deleted_at IS NULL`,
    [id, session.org_id, session.contact_id]
  )

  if (!presupuesto.rows[0]) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  const p = presupuesto.rows[0] as any
  if (!['enviado', 'visto'].includes(p.estado)) {
    return NextResponse.json({ error: 'Este presupuesto no se puede firmar' }, { status: 400 })
  }

  if (accion === 'aceptar') {
    await query(
      `UPDATE vet_presupuestos SET estado = 'aceptado', firmado = true, fecha_firma = NOW(),
         firma_nombre = $2, firma_imagen = $3, firma_ip = $4
       WHERE id = $1`,
      [id, firma_nombre || session.nombre, firma_imagen || null, request.headers.get('x-forwarded-for') || 'unknown']
    )
  } else if (accion === 'rechazar') {
    await query(
      `UPDATE vet_presupuestos SET estado = 'rechazado', motivo_rechazo = $2 WHERE id = $1`,
      [id, motivo_rechazo || null]
    )
  } else {
    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
