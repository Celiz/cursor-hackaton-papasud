// Uno Schema - Tipos para catálogo de equipos médicos

// ============================================================================
// ENUMS
// ============================================================================

export type UnoDivision =
  | 'Laboratorios'
  | 'Veterinaria'
  | 'Investigacion'
  | 'Medica'
  | 'Estetica'
  | 'Rehabilitacion'

// ============================================================================
// EQUIPOS
// ============================================================================

/** @deprecated Use UnoEquipo. Will be renamed in Phase 3 of equipos unification. */
export interface UnoEquipoCatalogo {
  id: string
  org_id: string
  modelo: string
  marca: string
  tipo: string
  categoria: string
  division: string[]
  imagen_url: string | null
  imagenes: string[]
  detalle: string | null
  especificaciones: Record<string, unknown> | null
  caracteristicas: string[]
  aplicaciones: string[]
  disponible: boolean
  destacado: boolean
  orden: number | null
  lis_parser_tipo: string | null
  created_at: Date
  updated_at: Date
}

export interface UnoProducto {
  id: string
  org_id: string
  codigo: string
  nombre: string
  descripcion: string | null
  tipo: string // 'insumo' | 'accesorio' | 'repuesto'
  categoria: string | null
  marca: string | null
  division: string[]
  precio_lista: number | null
  precio_final: number | null
  moneda: string
  imagen_url: string | null
  disponible: boolean
  stock: number
  proveedor: string | null
  created_at: Date
  updated_at: Date
}

export interface UnoProductoEquipo {
  id: string
  equipo_id: string
  producto_id: string
  created_at: Date
}

// ============================================================================
// FEATURED / DESTACADOS
// ============================================================================

export interface UnoFeaturedEquipo {
  id: string
  org_id: string
  equipo_id: string
  division: string | null
  badge_text: string | null
  badge_color: string | null
  custom_features: string[]
  utilidad: string | null
  posicion: number
  activo: boolean
  created_at: Date
  updated_at: Date
}

// Vista materializada para featured equipos
export interface UnoFeaturedEquipoCompleta {
  equipo_id: string
  modelo: string
  marca: string
  categoria: string
  imagen_url: string | null
  division: string[]
  badge_text: string | null
  badge_color: string | null
  custom_features: string[]
  utilidad: string | null
  posicion: number
}

// ============================================================================
// TESTIMONIOS
// ============================================================================

export interface UnoTestimonio {
  id: string
  org_id: string
  nombre: string
  cargo: string | null
  empresa: string | null
  contenido: string
  imagen_url: string | null
  rating: number | null
  activo: boolean
  orden: number
  created_at: Date
}

// ============================================================================
// TIPOS CON RELACIONES
// ============================================================================

export interface UnoProductoBasico {
  id: string
  nombre: string
  codigo: string
  descripcion: string | null
  precio_lista: number | null
  precio_final: number | null
  categoria: string | null
  marca: string | null
  imagen_url: string | null
  disponible: boolean
  stock: number
  tipo: string
  moneda?: string
  proveedor?: string
}

export interface UnoEquipoConProductos extends UnoEquipoCatalogo {
  productos: UnoProductoBasico[]
}

export interface UnoEquipoConEmpresa extends UnoEquipoCatalogo {
  productos: UnoProductoBasico[]
  empresa: {
    id: string
    nombre: string
  } | null
}
