import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const revalidate = 0

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parcelaId = searchParams.get('parcela_id')
  const origen = searchParams.get('origen')

  const params: unknown[] = [session.org_id]
  let where = 'o.org_id = $1'
  if (parcelaId) {
    params.push(parcelaId)
    where += ` AND o.parcela_id = $${params.length}`
  }
  if (origen) {
    params.push(origen)
    where += ` AND o.origen = $${params.length}`
  }

  const { rows } = await query(
    `SELECT o.*, p.codigo AS parcela_codigo, p.nombre AS parcela_nombre,
            e.nombre AS establecimiento,
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', i.id, 'insumo_nombre', i.insumo_nombre, 'cantidad', i.cantidad,
                'unidad', i.unidad, 'dosis_ha', i.dosis_ha, 'fuera_de_rango', i.fuera_de_rango
              ) ORDER BY i.created_at)
              FROM pap_ot_insumos i WHERE i.orden_id = o.id
            ), '[]'::json) AS insumos
       FROM pap_ordenes_trabajo o
       LEFT JOIN pap_parcelas p ON p.id = o.parcela_id
       LEFT JOIN pap_establecimientos e ON e.id = p.establecimiento_id
      WHERE ${where}
      ORDER BY o.fecha DESC, o.numero DESC
      LIMIT 200`,
    params
  )

  return NextResponse.json({ ordenes: rows })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const {
    parcela_id, tarea, tarea_tipo_id, descripcion, fecha,
    responsable_nombre, maquinaria, horas, superficie_ha,
    estado, origen, origen_texto, extraccion, insumos,
  } = body

  if (!tarea) {
    return NextResponse.json({ error: 'La tarea es obligatoria' }, { status: 400 })
  }

  const campana = await query(
    `SELECT id FROM pap_campanas WHERE org_id = $1 ORDER BY anio DESC LIMIT 1`,
    [session.org_id]
  )

  const { rows } = await query(
    `INSERT INTO pap_ordenes_trabajo
       (org_id, parcela_id, campana_id, tarea, tarea_tipo_id, descripcion, fecha,
        responsable_nombre, maquinaria, horas, superficie_ha, estado, origen,
        origen_texto, extraccion)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE),$8,$9,$10,$11,
             COALESCE($12,'registrada'), COALESCE($13,'manual'), $14, $15)
     RETURNING *`,
    [
      session.org_id, parcela_id ?? null, campana.rows[0]?.id ?? null, tarea,
      tarea_tipo_id ?? null, descripcion ?? null, fecha ?? null,
      responsable_nombre ?? null, maquinaria ?? null, horas ?? null,
      superficie_ha ?? null, estado ?? null, origen ?? null,
      origen_texto ?? null, extraccion ? JSON.stringify(extraccion) : null,
    ]
  )

  const orden = rows[0]

  for (const i of (insumos ?? [])) {
    if (!i?.insumo_nombre) continue
    await query(
      `INSERT INTO pap_ot_insumos
         (orden_id, insumo_id, insumo_nombre, cantidad, unidad, dosis_ha, fuera_de_rango)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,false))`,
      [orden.id, i.insumo_id ?? null, i.insumo_nombre, i.cantidad ?? null,
       i.unidad ?? null, i.dosis_ha ?? null, i.fuera_de_rango ?? false]
    )
  }

  return NextResponse.json({ orden }, { status: 201 })
}
