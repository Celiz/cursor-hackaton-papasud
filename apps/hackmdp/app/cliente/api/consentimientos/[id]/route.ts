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

  const result = await query(
    `SELECT c.*, per.nombre as veterinario_nombre,
       vp.nombre as paciente_nombre, vp.especie as paciente_especie
     FROM vet_consentimientos c
     JOIN org_contacts oc ON oc.persona_id = c.cliente_id AND oc.org_id = c.org_id
     LEFT JOIN personas per ON per.id = c.veterinario_id
     LEFT JOIN vet_pacientes vp ON vp.id = c.paciente_id
     WHERE c.id = $1 AND c.org_id = $2 AND oc.id = $3 AND c.deleted_at IS NULL`,
    [id, session.org_id, session.contact_id]
  )

  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Consentimiento no encontrado' }, { status: 404 })
  }

  const c = result.rows[0] as any

  // Mark as visto if enviado
  if (c.estado === 'enviado') {
    await query(
      `UPDATE vet_consentimientos SET estado = 'visto', fecha_visto = NOW() WHERE id = $1`,
      [id]
    )
    c.estado = 'visto'
  }

  return NextResponse.json({ consentimiento: c })
}
