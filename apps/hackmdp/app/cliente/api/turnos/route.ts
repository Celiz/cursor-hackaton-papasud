import { NextRequest, NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { getTurnos, createTurno, getTurnosConfig } from '@studio/erp-core/turnos'
import { unsyncServiceFromCalendar } from '@/lib/google-calendar'

export const revalidate = 0

export async function GET(request: NextRequest) {
  const session = await getClienteSession()
  if (!session || session.scope === 'limited') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const { turnos, total } = await getTurnos(session.org_id, {
    contacto_id: session.contact_id,
    estado: (sp.get('estado') as any) || undefined,
    fecha_desde: sp.get('fecha_desde') || undefined,
    fecha_hasta: sp.get('fecha_hasta') || undefined,
    limit: Number(sp.get('limit')) || 20,
    offset: Number(sp.get('offset')) || 0,
  })

  return NextResponse.json({ turnos, total })
}

export async function POST(request: NextRequest) {
  const session = await getClienteSession()
  if (!session || session.scope === 'limited') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  if (!body.tipo || !body.fecha || !body.hora_inicio) {
    return NextResponse.json({ error: 'tipo, fecha y hora_inicio son requeridos' }, { status: 400 })
  }

  const config = await getTurnosConfig(session.org_id)
  const estado = config?.modo === 'self_service' ? 'confirmada' : 'solicitada'

  const turno = await createTurno({
    org_id: session.org_id,
    contacto_id: session.contact_id,
    tipo: body.tipo,
    fecha: body.fecha,
    hora_inicio: body.hora_inicio,
    duracion_minutos: body.duracion_minutos || config?.duracion_default || 30,
    estado,
    motivo: body.motivo,
    metadata: body.metadata || {},
    solicitada_por_portal: true,
  })

  return NextResponse.json(turno, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await getClienteSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { turno_id, accion } = await request.json()
  if (!turno_id || accion !== 'cancelar') {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  const { updateTurno, getTurno } = await import('@studio/erp-core/turnos')
  const turno = await getTurno(session.org_id, turno_id)
  if (!turno || turno.contacto_id !== session.contact_id) {
    return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
  }
  if (!['solicitada', 'confirmada'].includes(turno.estado)) {
    return NextResponse.json({ error: 'No se puede cancelar este turno' }, { status: 400 })
  }

  const updated = await updateTurno(session.org_id, turno_id, { estado: 'cancelada' })

  // Unsync from Google Calendar if profesional was assigned
  if (turno.profesional_id) {
    unsyncServiceFromCalendar(
      turno.profesional_id,
      'turno',
      turno.id,
      session.org_id
    ).catch(err => console.error('Google Calendar unsync error:', err))
  }

  return NextResponse.json(updated)
}
