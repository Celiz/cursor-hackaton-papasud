// Entidades Schema - Universal node types for the Aeterna network

// ============================================================================
// ENUMS
// ============================================================================

export type EntidadTipo = 'persona' | 'animal' | 'equipo'
export type RelacionTipo = 'tutor' | 'cuidador' | 'responsable' | 'custom'
export type OrgEntidadTipo = 'paciente' | 'equipo' | 'recurso'

// ============================================================================
// ENTIDADES (Universal Node)
// ============================================================================

export interface Entidad {
  id: string
  tipo: EntidadTipo
  nombre_display: string
  created_at: Date
  updated_at: Date
}

// ============================================================================
// ANIMALES (Entity Subtype)
// ============================================================================


export interface Animal {
  entidad_id: string
  especie: Especie
  raza: string | null
  sexo: Sexo
  fecha_nacimiento: Date | null
  peso: number | null
  color: string | null
  numero_chip: string | null
  observaciones: string | null
  activo: boolean
  created_at: Date
  updated_at: Date
}

export interface AnimalConEntidad extends Animal {
  nombre_display: string
}

export interface AnimalConTutores extends AnimalConEntidad {
  tutores: Array<{
    entidad_id: string
    nombre: string
    tipo: RelacionTipo
    rol_custom: string | null
  }>
}

// ============================================================================
// ORG_ENTIDADES (Organization-Entity Junction)
// ============================================================================

export interface OrgEntidad {
  id: string
  org_id: string
  entidad_id: string
  tipo: OrgEntidadTipo
  datos_extra: Record<string, unknown> | null
  activo: boolean
  created_at: Date
}

// ============================================================================
// ENTIDAD_RELACIONES (Entity Relationships)
// ============================================================================

export interface EntidadRelacion {
  id: string
  entidad_a_id: string
  entidad_b_id: string
  tipo: RelacionTipo
  rol_custom: string | null
  metadata: Record<string, unknown>
  activo: boolean
  created_at: Date
}

export interface EntidadRelacionConNombres extends EntidadRelacion {
  entidad_a_nombre: string
  entidad_a_tipo: EntidadTipo
  entidad_b_nombre: string
  entidad_b_tipo: EntidadTipo
}
