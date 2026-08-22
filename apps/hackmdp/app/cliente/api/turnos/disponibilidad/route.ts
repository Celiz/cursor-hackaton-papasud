import { NextRequest, NextResponse } from 'next/server'
import { getClienteSession } from '@/lib/client-session'
import { getDisponibilidad, getTurnosConfig } from '@studio/erp-core/turnos'

export const revalidate = 0

export async function GET(request: NextRequest) {
  const session = await getClienteSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const fecha = request.nextUrl.searchParams.get('fecha')
  if (!fecha) {
    return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
  }

  const config = await getTurnosConfig(session.org_id)
  const slots = await getDisponibilidad(session.org_id, fecha)
  return NextResponse.json({ slots, config: config ? { tipos_habilitados: config.tipos_habilitados, modo: config.modo } : null })
}
