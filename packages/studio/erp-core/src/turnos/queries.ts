import { query } from '@locus/db'
import type { Turno, TurnoConDetalles, CreateTurno, UpdateTurno, TurnoFilters, TurnosConfig, SlotDisponible } from './types'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

export async function getTurnos(org_id: string, filters: TurnoFilters = {}): Promise<{ turnos: TurnoConDetalles[]; total: number }> {
  const conditions = ['t.org_id = $1']
  const params: unknown[] = [org_id]
  let idx = 2

  if (filters.estado) {
    if (Array.isArray(filters.estado)) {
      conditions.push(`t.estado = ANY($${idx})`)
      params.push(filters.estado)
    } else {
      conditions.push(`t.estado = $${idx}`)
      params.push(filters.estado)
    }
    idx++
  }
  if (filters.tipo) {
    conditions.push(`t.tipo = $${idx}`)
    params.push(filters.tipo)
    idx++
  }
  if (filters.fecha_desde) {
    conditions.push(`t.fecha >= $${idx}`)
    params.push(filters.fecha_desde)
    idx++
  }
  if (filters.fecha_hasta) {
    conditions.push(`t.fecha <= $${idx}`)
    params.push(filters.fecha_hasta)
    idx++
  }
  if (filters.contacto_id) {
    conditions.push(`t.contacto_id = $${idx}`)
    params.push(filters.contacto_id)
    idx++
  }
  if (filters.profesional_id) {
    conditions.push(`t.profesional_id = $${idx}`)
    params.push(filters.profesional_id)
    idx++
  }

  const where = conditions.join(' AND ')
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM turnos t WHERE ${where}`, params
  )

  const result = await query<TurnoConDetalles>(
    `SELECT t.*,
       p.nombre as contacto_nombre, p.email as contacto_email, p.telefono as contacto_telefono,
       prof.nombre as profesional_nombre
     FROM turnos t
     JOIN org_contacts oc ON oc.id = t.contacto_id
     JOIN personas p ON p.id = oc.persona_id
     LEFT JOIN personas prof ON prof.id = t.profesional_id
     WHERE ${where}
     ORDER BY t.fecha DESC, t.hora_inicio DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  return { turnos: result.rows, total: parseInt(countResult.rows[0].count) }
}

export async function getTurno(org_id: string, id: string): Promise<TurnoConDetalles | null> {
  const result = await query<TurnoConDetalles>(
    `SELECT t.*,
       p.nombre as contacto_nombre, p.email as contacto_email, p.telefono as contacto_telefono,
       prof.nombre as profesional_nombre
     FROM turnos t
     JOIN org_contacts oc ON oc.id = t.contacto_id
     JOIN personas p ON p.id = oc.persona_id
     LEFT JOIN personas prof ON prof.id = t.profesional_id
     WHERE t.org_id = $1 AND t.id = $2`,
    [org_id, id]
  )
  return result.rows[0] || null
}

export async function createTurno(data: CreateTurno): Promise<Turno> {
  const result = await query<Turno>(
    `INSERT INTO turnos (org_id, contacto_id, profesional_id, tipo, fecha, hora_inicio, duracion_minutos, estado, motivo, notas, metadata, solicitada_por_portal, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
     RETURNING *`,
    [
      data.org_id, data.contacto_id, data.profesional_id || null,
      data.tipo, data.fecha, data.hora_inicio,
      data.duracion_minutos || 30, data.estado || 'solicitada',
      data.motivo || null, data.notas || null,
      JSON.stringify(data.metadata || {}),
      data.solicitada_por_portal || false, data.created_by || null,
    ]
  )
  return result.rows[0]
}

export async function updateTurno(org_id: string, id: string, data: UpdateTurno): Promise<Turno | null> {
  const sets: string[] = ['updated_at = NOW()']
  const params: unknown[] = [org_id, id]
  let idx = 3

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (key === 'metadata') {
        sets.push(`${key} = $${idx}::jsonb`)
        params.push(JSON.stringify(value))
      } else {
        sets.push(`${key} = $${idx}`)
        params.push(value)
      }
      idx++
    }
  }

  const result = await query<Turno>(
    `UPDATE turnos SET ${sets.join(', ')} WHERE org_id = $1 AND id = $2 RETURNING *`,
    params
  )
  return result.rows[0] || null
}

export async function getTurnosConfig(org_id: string): Promise<TurnosConfig | null> {
  const result = await query<TurnosConfig>(
    `SELECT * FROM turnos_config WHERE org_id = $1`, [org_id]
  )
  return result.rows[0] || null
}

export async function upsertTurnosConfig(org_id: string, config: Partial<TurnosConfig>): Promise<TurnosConfig> {
  const result = await query<TurnosConfig>(
    `INSERT INTO turnos_config (org_id, modo, tipos_habilitados, duracion_default, anticipo_min_horas, anticipo_max_dias, horarios, profesionales_config)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
     ON CONFLICT (org_id) DO UPDATE SET
       modo = COALESCE($2, turnos_config.modo),
       tipos_habilitados = COALESCE($3, turnos_config.tipos_habilitados),
       duracion_default = COALESCE($4, turnos_config.duracion_default),
       anticipo_min_horas = COALESCE($5, turnos_config.anticipo_min_horas),
       anticipo_max_dias = COALESCE($6, turnos_config.anticipo_max_dias),
       horarios = COALESCE($7::jsonb, turnos_config.horarios),
       profesionales_config = COALESCE($8::jsonb, turnos_config.profesionales_config),
       updated_at = NOW()
     RETURNING *`,
    [
      org_id, config.modo || 'confirmacion',
      config.tipos_habilitados || [], config.duracion_default || 30,
      config.anticipo_min_horas || 2, config.anticipo_max_dias || 30,
      JSON.stringify(config.horarios || {}),
      config.profesionales_config ? JSON.stringify(config.profesionales_config) : null,
    ]
  )
  return result.rows[0]
}

export async function getDisponibilidad(org_id: string, fecha: string, tipo?: string): Promise<SlotDisponible[]> {
  const config = await getTurnosConfig(org_id)
  if (!config) return []

  const date = new Date(fecha + 'T12:00:00')
  const diaSemana = DIAS_SEMANA[date.getDay()]
  const horario = config.horarios[diaSemana]
  if (!horario) return []

  const [inicioH, inicioM] = horario.inicio.split(':').map(Number)
  const [finH, finM] = horario.fin.split(':').map(Number)
  const inicioMin = inicioH * 60 + inicioM
  const finMin = finH * 60 + finM
  const duracion = config.duracion_default || 30

  const now = new Date()
  const fechaDate = new Date(fecha + 'T00:00:00')
  const horasHastaFecha = (fechaDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (horasHastaFecha < config.anticipo_min_horas) return []
  const diasHastaFecha = horasHastaFecha / 24
  if (diasHastaFecha > config.anticipo_max_dias) return []

  const existing = await query<{ hora_inicio: string; duracion_minutos: number }>(
    `SELECT hora_inicio::text, duracion_minutos FROM turnos
     WHERE org_id = $1 AND fecha = $2
       AND estado NOT IN ('cancelada', 'no_asistio', 'rechazada')`,
    [org_id, fecha]
  )

  const slots: SlotDisponible[] = []
  for (let min = inicioMin; min + duracion <= finMin; min += duracion) {
    const h = String(Math.floor(min / 60)).padStart(2, '0')
    const m = String(min % 60).padStart(2, '0')
    const hora = `${h}:${m}`
    const slotEnd = min + duracion

    const occupied = existing.rows.some((c) => {
      const [ch, cm] = c.hora_inicio.split(':').map(Number)
      const cStart = ch * 60 + cm
      const cEnd = cStart + (c.duracion_minutos || 30)
      return min < cEnd && slotEnd > cStart
    })

    slots.push({ hora, disponible: !occupied })
  }

  return slots
}
