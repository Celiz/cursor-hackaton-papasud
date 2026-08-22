import type { Persona, PersonaWithOrgs } from '@locus/db'

export type { Persona, PersonaWithOrgs }

export type PersonaEtapa = 'idea' | 'construyendo' | 'creciendo' | 'consolidado'

export interface CreatePersona {
  documento_tipo?: string
  documento_nro?: string
  nombre: string
  email?: string
  telefono?: string
  fecha_nacimiento?: Date
}

export interface UpdatePersona {
  documento_tipo?: string
  documento_nro?: string
  nombre?: string
  email?: string
  telefono?: string
  fecha_nacimiento?: Date
  bio?: string
  que_construyo?: string
  etapa?: PersonaEtapa
  busco?: string
  tags?: string[]
  linkedin_url?: string
  instagram?: string
  website?: string
}

export interface PersonaFilters {
  search?: string
  documento_nro?: string
  email?: string
}
