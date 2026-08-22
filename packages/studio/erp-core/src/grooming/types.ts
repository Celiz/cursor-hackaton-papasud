export interface ServicioGrooming {
  id: string
  org_id: string
  turno_id: string | null
  animal_id: string
  contacto_id: string
  tipo_servicio: 'bano' | 'corte' | 'unas' | 'oidos' | 'completo'
  precio: number | null
  notas: string | null
  estado: 'pendiente' | 'en_curso' | 'completado' | 'cancelado'
  created_at: Date
  updated_at: Date
}

export interface ServicioGroomingConDetalles extends ServicioGrooming {
  mascota_nombre: string
  mascota_especie: string
  mascota_raza: string | null
  contacto_nombre: string
  contacto_telefono: string | null
}

export interface CreateServicioGrooming {
  org_id: string
  turno_id?: string
  animal_id: string
  contacto_id: string
  tipo_servicio: string
  precio?: number
  notas?: string
}

export interface UpdateServicioGrooming {
  tipo_servicio?: string
  precio?: number
  notas?: string
  estado?: string
}

export interface ServicioGroomingFilters {
  estado?: string
  tipo_servicio?: string
  animal_id?: string
  contacto_id?: string
  fecha_desde?: string
  fecha_hasta?: string
  limit?: number
  offset?: number
}
