import { NextRequest, NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { query } from '@/lib/db'

export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getClienteSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const presupuesto = await query(
    `SELECT p.*, per.nombre as veterinario_nombre,
       vp.nombre as paciente_nombre, vp.especie as paciente_especie
     FROM vet_presupuestos p
     JOIN org_contacts oc ON oc.persona_id = p.cliente_id AND oc.org_id = p.org_id
     LEFT JOIN personas per ON per.id = p.veterinario_id
     LEFT JOIN vet_pacientes vp ON vp.id = p.paciente_id
     WHERE p.id = $1 AND p.org_id = $2 AND oc.id = $3 AND p.deleted_at IS NULL`,
    [id, session.org_id, session.contact_id]
  )

  if (!presupuesto.rows[0]) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  // Mark as visto if enviado
  const p = presupuesto.rows[0] as any
  if (p.estado === 'enviado') {
    await query(
      `UPDATE vet_presupuestos SET estado = 'visto', fecha_visto = NOW() WHERE id = $1`,
      [id]
    )
    p.estado = 'visto'
  }

  const items = await query(
    `SELECT id, tipo, descripcion, cantidad, precio_unitario, subtotal
     FROM vet_presupuesto_items
     WHERE presupuesto_id = $1
     ORDER BY orden, id`,
    [id]
  )

  return NextResponse.json({
    presupuesto: p,
    items: items.rows,
  })
}
