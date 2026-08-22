// ==================== ENUMS ====================

export type TipoAgencia = 'presencia' | 'atencion' | 'ventas' | 'creacion' | 'diseno' | 'flujo'

export type EstadoEmpresaAgencia = 'setup' | 'activa' | 'pausada'

export type EstadoPlan = 'borrador' | 'activo' | 'completado' | 'archivado'

export type EstadoTarea = 'idea' | 'borrador' | 'aprobado' | 'programado' | 'publicado' | 'cancelado'

export type TipoTareaPresencia =
  | 'post_redes'
  | 'carousel'
  | 'reel_guion'
  | 'newsletter'
  | 'email_campana'

export type TipoCanal = 'instagram' | 'facebook' | 'linkedin' | 'email' | 'whatsapp'

export type TipoRecurso = 'imagen' | 'video' | 'documento' | 'otro'

export type TipoReporte = 'semanal' | 'mensual' | 'custom'

// ==================== INTERFACES ====================

export interface Agencia {
  id: string
  tipo: TipoAgencia
  nombre: string
  descripcion: string | null
  icono: string | null
  color: string | null
  orden: number
  activa: boolean
  created_at: string
  updated_at: string
}

export interface EmpresaAgencia {
  id: string
  org_id: string
  agencia_id: string
  estado: EstadoEmpresaAgencia
  config: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined fields
  agencia?: Agencia
}

export interface PlanObjetivo {
  titulo: string
  metrica: string
  valor_actual: number
  valor_target: number
}

export interface PlanEstrategia {
  mensaje_central?: string
  pilares_contenido?: string[]
  mix_formatos?: {
    posts_estaticos?: number
    carousels?: number
    reels?: number
    stories?: number
    newsletters?: number
  }
  frecuencia?: {
    posts_por_semana?: number
    emails_por_mes?: number
  }
}

export interface AgPlan {
  id: string
  org_id: string
  agencia_id: string
  nombre: string
  descripcion: string | null
  periodo_inicio: string
  periodo_fin: string
  estado: EstadoPlan
  objetivos: PlanObjetivo[]
  estrategia: PlanEstrategia
  notas: string | null
  created_at: string
  updated_at: string
  // Computed
  tareas_count?: number
}

export interface AgTarea {
  id: string
  org_id: string
  agencia_id: string
  plan_id: string | null
  titulo: string
  descripcion: string | null
  contenido: string | null
  tipo: string
  estado: EstadoTarea
  fecha_programada: string | null
  fecha_publicacion: string | null
  canal: string | null
  canal_id: string | null
  email_campana_id: string | null
  etiquetas: string[]
  metadata: Record<string, unknown>
  orden: number
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  recursos?: AgRecurso[]
  plan_nombre?: string
}

export interface AgRecurso {
  id: string
  org_id: string
  tarea_id: string
  nombre: string
  tipo: TipoRecurso
  url: string | null
  tamano: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgCanal {
  id: string
  org_id: string
  tipo: TipoCanal
  nombre: string
  config: Record<string, unknown>
  activo: boolean
  created_at: string
  updated_at: string
}

export interface AgMetrica {
  id: string
  org_id: string
  agencia_id: string
  canal: string | null
  fecha: string
  datos: Record<string, number>
  created_at: string
}

export interface AgReporte {
  id: string
  org_id: string
  agencia_id: string
  tipo: TipoReporte
  periodo_inicio: string
  periodo_fin: string
  titulo: string
  contenido: Record<string, unknown>
  resumen: string | null
  created_at: string
}

// ==================== CONSTANTS ====================

export const ESTADO_TAREA_ORDER: Record<EstadoTarea, number> = {
  idea: 0,
  borrador: 1,
  aprobado: 2,
  programado: 3,
  publicado: 4,
  cancelado: 5,
}

export const ESTADO_TAREA_LABELS: Record<EstadoTarea, string> = {
  idea: 'Idea',
  borrador: 'Borrador',
  aprobado: 'Aprobado',
  programado: 'Programado',
  publicado: 'Publicado',
  cancelado: 'Cancelado',
}

export const TIPO_TAREA_PRESENCIA_LABELS: Record<TipoTareaPresencia, string> = {
  post_redes: 'Post',
  carousel: 'Carousel',
  reel_guion: 'Reel/Video',
  newsletter: 'Newsletter',
  email_campana: 'Email Campaña',
}

export const TIPO_CANAL_LABELS: Record<TipoCanal, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  email: 'Email',
  whatsapp: 'WhatsApp',
}
