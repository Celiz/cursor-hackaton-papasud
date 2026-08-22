export interface Turno {
  id: string
  org_id: string
  contacto_id: string
  profesional_id: string | null
  tipo: string
  fecha: string
  hora_inicio: string
  duracion_minutos: number
  estado: TurnoEstado
  motivo: string | null
  motivo_rechazo: string | null
  notas: string | null
  metadata: Record<string, unknown>
  solicitada_por_portal: boolean
  created_by: string | null
  created_at: Date
  updated_at: Date
}

export type TurnoEstado = 'solicitada' | 'confirmada' | 'en_curso' | 'completada' | 'cancelada' | 'no_asistio' | 'rechazada'

export interface TurnoConDetalles extends Turno {
  contacto_nombre: string
  contacto_email: string | null
  contacto_telefono: string | null
  profesional_nombre: string | null
}

export interface CreateTurno {
  org_id: string
  contacto_id: string
  profesional_id?: string
  tipo: string
  fecha: string
  hora_inicio: string
  duracion_minutos?: number
  estado?: TurnoEstado
  motivo?: string
  notas?: string
  metadata?: Record<string, unknown>
  solicitada_por_portal?: boolean
  created_by?: string
}

export interface UpdateTurno {
  profesional_id?: string | null
  tipo?: string
  fecha?: string
  hora_inicio?: string
  duracion_minutos?: number
  estado?: TurnoEstado
  motivo?: string
  motivo_rechazo?: string
  notas?: string
  metadata?: Record<string, unknown>
}

export interface TurnoFilters {
  estado?: TurnoEstado | TurnoEstado[]
  tipo?: string
  fecha_desde?: string
  fecha_hasta?: string
  contacto_id?: string
  profesional_id?: string
  limit?: number
  offset?: number
}

export interface TurnosConfig {
  org_id: string
  modo: 'self_service' | 'confirmacion'
  tipos_habilitados: string[]
  duracion_default: number
  anticipo_min_horas: number
  anticipo_max_dias: number
  horarios: Record<string, { inicio: string; fin: string } | null>
  profesionales_config: Record<string, unknown> | null
}

export interface SlotDisponible {
  hora: string
  disponible: boolean
}
