export interface Animal {
  entidad_id: string
  nombre: string
  especie: 'canino' | 'felino' | 'equino' | 'bovino' | 'porcino' | 'ovino' | 'caprino' | 'ave' | 'reptil' | 'otro'
  raza: string | null
  sexo: 'macho' | 'hembra' | 'desconocido'
  fecha_nacimiento: string | null
  peso: number | null
  color: string | null
  numero_chip: string | null
  observaciones: string | null
  activo: boolean
  created_at: Date
  updated_at: Date
}

export interface AnimalConDueno extends Animal {
  contacto_nombre: string
  contacto_telefono: string | null
  contacto_id: string
}

export interface CreateAnimal {
  nombre: string
  especie?: string
  raza?: string
  sexo?: string
  fecha_nacimiento?: string
  peso?: number
  color?: string
  numero_chip?: string
  observaciones?: string
}

export interface UpdateAnimal {
  nombre?: string
  especie?: string
  raza?: string
  sexo?: string
  fecha_nacimiento?: string
  peso?: number
  color?: string
  numero_chip?: string
  observaciones?: string
  activo?: boolean
}

export interface AnimalFilters {
  especie?: string
  contacto_id?: string
  activo?: boolean
  search?: string
  limit?: number
  offset?: number
}
