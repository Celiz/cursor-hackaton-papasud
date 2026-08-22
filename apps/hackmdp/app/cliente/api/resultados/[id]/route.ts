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

  // Verify this orden belongs to this client
  const orden = await query(
    `SELECT ot.id, ot.numero, ot.fecha_ingreso as fecha, ot.estado, ot.paciente_id, ot.observaciones
     FROM vet_ordenes_trabajo ot
     JOIN org_contacts oc ON oc.persona_id = ot.cliente_id AND oc.org_id = ot.org_id
     WHERE ot.id = $1 AND ot.org_id = $2 AND oc.id = $3`,
    [id, session.org_id, session.contact_id]
  )

  if (!orden.rows[0]) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  }

  const o = orden.rows[0] as any

  // Get estudios with resultados
  const estudios = await query(
    `SELECT e.id, e.nombre, e.estado,
       COALESCE(json_agg(
         json_build_object(
           'parametro', r.parametro,
           'valor', r.valor,
           'unidad', r.unidad,
           'ref_min', r.valor_referencia_min,
           'ref_max', r.valor_referencia_max,
           'fuera_rango', r.fuera_rango
         ) ORDER BY r.orden
       ) FILTER (WHERE r.id IS NOT NULL), '[]') as resultados
     FROM vet_estudios e
     LEFT JOIN vet_resultados r ON r.estudio_id = e.id
     WHERE e.orden_id = $1
     GROUP BY e.id, e.nombre, e.estado
     ORDER BY e.nombre`,
    [id]
  )

  // Get parameter history across all orders for this patient
  const historial = await query(
    `SELECT r.parametro, r.valor, r.unidad, ot.fecha_ingreso as fecha
     FROM vet_resultados r
     JOIN vet_estudios e ON e.id = r.estudio_id
     JOIN vet_ordenes_trabajo ot ON ot.id = e.orden_id
     WHERE ot.paciente_id = $1 AND ot.org_id = $2
       AND r.valor IS NOT NULL AND r.valor != ''
     ORDER BY r.parametro, ot.fecha_ingreso ASC`,
    [o.paciente_id, session.org_id]
  )

  // Group history by parameter
  const historialByParam: Record<string, { valor: string; fecha: string }[]> = {}
  for (const row of historial.rows as any[]) {
    if (!historialByParam[row.parametro]) historialByParam[row.parametro] = []
    historialByParam[row.parametro].push({ valor: row.valor, fecha: row.fecha })
  }

  // Get paciente info
  const paciente = await query(
    `SELECT nombre, especie, raza, sexo, fecha_nacimiento, peso FROM vet_pacientes WHERE id = $1`,
    [o.paciente_id]
  )

  return NextResponse.json({
    orden: orden.rows[0],
    paciente: paciente.rows[0] || null,
    estudios: estudios.rows,
    historial: historialByParam,
  })
}
