// Regulatory Schema - Tipos para modulo regulatorio ANMAT/SENASA
// Tablas: reg_registros, reg_documentos, reg_tecnovigilancia,
//         reg_trazabilidad_equipos, reg_trazabilidad_reactivos, reg_alertas

// ============================================================================
// ENUMS
// ============================================================================

export type RegEntidad = 'anmat' | 'senasa'
export type RegTipoRegistro = 'producto_medico' | 'reactivo' | 'equipo_importado'
export type RegClaseRiesgo = 'I' | 'II' | 'III' | 'IV'
export type RegEstadoRegistro = 'vigente' | 'en_tramite' | 'vencido' | 'suspendido' | 'cancelado'

export type RegTipoDocumento = 'certificado_anmat' | 'certificado_calidad' | 'informe_tecnico' | 'disposicion' | 'protocolo' | 'acta_inspeccion' | 'calibracion' | 'otro'
export type RegReferenciaTipo = 'producto' | 'equipo_instancia' | 'lote' | 'reactivo' | 'evento'

export type RegTipoTecnovigilancia = 'evento_adverso' | 'accion_correctiva' | 'retiro_mercado'
export type RegGravedad = 'leve' | 'moderado' | 'grave' | 'muerte'
export type RegEstadoTecnovigilancia = 'detectado' | 'en_investigacion' | 'reportado' | 'cerrado'

export type RegTipoEventoEquipo = 'venta' | 'instalacion' | 'calibracion' | 'mantenimiento_preventivo' | 'mantenimiento_correctivo' | 'traslado' | 'retiro' | 'baja'
export type RegTipoEventoReactivo = 'recepcion' | 'almacenamiento' | 'uso' | 'descarte' | 'devolucion'

export type RegTipoAlerta = 'vencimiento_registro' | 'vencimiento_documento' | 'vencimiento_reactivo' | 'tecnovigilancia_pendiente' | 'calibracion_vencida' | 'cumplimiento_bajo'
export type RegSeveridad = 'info' | 'warning' | 'critical'

export type RegAlertaReferenciaTipo = 'registro' | 'documento' | 'equipo' | 'reactivo' | 'evento'

// ============================================================================
// REGISTROS ANTE ANMAT/SENASA
// ============================================================================

export interface RegRegistro {
  id: string
  org_id: string
  entidad: RegEntidad
  tipo_registro: RegTipoRegistro
  numero_registro: string
  clase_riesgo: RegClaseRiesgo | null
  estado: RegEstadoRegistro
  fecha_otorgamiento: string | null
  fecha_vencimiento: string | null
  titular: string | null
  producto_id: string | null
  descripcion: string | null
  disposicion: string | null
  notas: string | null
  created_at: string
  updated_at: string
  // computed / joined
  dias_para_vencer?: number | null
  producto_nombre?: string | null
}

// ============================================================================
// DOCUMENTOS — Certificados, informes, disposiciones
// ============================================================================

export interface RegDocumento {
  id: string
  org_id: string
  tipo: RegTipoDocumento
  nombre: string
  url: string | null
  fecha_emision: string | null
  fecha_vencimiento: string | null
  registro_id: string | null
  referencia_tipo: RegReferenciaTipo | null
  referencia_id: string | null
  notas: string | null
  created_at: string
  // computed / joined
  dias_para_vencer?: number | null
  registro_numero?: string | null
}

// ============================================================================
// TECNOVIGILANCIA — Eventos adversos y acciones correctivas
// ============================================================================

export interface RegTecnovigilancia {
  id: string
  org_id: string
  tipo: RegTipoTecnovigilancia
  gravedad: RegGravedad
  registro_id: string | null
  producto_id: string | null
  equipo_instancia_id: string | null
  descripcion: string
  fecha_evento: string
  fecha_deteccion: string
  fecha_reporte: string | null
  estado: RegEstadoTecnovigilancia
  accion_tomada: string | null
  institucion: string | null
  contacto: string | null
  reportado_por: string | null
  notas: string | null
  created_at: string
  updated_at: string
  // computed / joined
  registro_numero?: string | null
  producto_nombre?: string | null
  reportado_por_nombre?: string | null
}

// ============================================================================
// TRAZABILIDAD DE EQUIPOS — Historial por numero de serie
// ============================================================================

export interface RegTrazabilidadEquipo {
  id: string
  org_id: string
  equipo_instancia_id: string
  tipo_evento: RegTipoEventoEquipo
  fecha: string
  institucion: string | null
  tecnico_id: string | null
  registro_id: string | null
  documento_id: string | null
  observaciones: string | null
  proxima_fecha: string | null
  created_at: string
  // computed / joined
  tecnico_nombre?: string | null
  registro_numero?: string | null
  documento_nombre?: string | null
}

// ============================================================================
// TRAZABILIDAD DE REACTIVOS — Trazabilidad SENASA
// ============================================================================

export interface RegTrazabilidadReactivo {
  id: string
  org_id: string
  reactivo_id: string
  tipo_evento: RegTipoEventoReactivo
  numero_lote: string | null
  codigo_trazabilidad: string | null
  cantidad: number | null
  unidad: string | null
  fecha: string
  proveedor: string | null
  condiciones: string | null
  estudio_id: string | null
  operador_id: string | null
  observaciones: string | null
  created_at: string
  // computed / joined
  reactivo_nombre?: string | null
  operador_nombre?: string | null
}

// ============================================================================
// ALERTAS REGULATORIAS
// ============================================================================

export interface RegAlerta {
  id: string
  org_id: string
  tipo: RegTipoAlerta
  severidad: RegSeveridad
  titulo: string
  mensaje: string | null
  referencia_tipo: RegAlertaReferenciaTipo | null
  referencia_id: string | null
  fecha_limite: string | null
  leida: boolean
  descartada: boolean
  created_at: string
}

// ============================================================================
// DASHBOARD — Compliance overview (computed, not a table)
// ============================================================================

export interface RegDashboard {
  score_global: number
  areas: {
    registros: { score: number; total: number; vigentes: number; por_vencer: number; vencidos: number }
    documentos: { score: number; total: number; vigentes: number; por_vencer: number; vencidos: number }
    trazabilidad: { score: number; total: number; completos: number }
    tecnovigilancia: { score: number; total: number; reportados: number; pendientes: number } | null
  }
  proximos_vencimientos: Array<{
    tipo: string
    descripcion: string
    fecha: string
    dias: number
    referencia_tipo: string
    referencia_id: string
  }>
  alertas_criticas: number
  actividad_reciente: Array<{
    accion: string
    usuario: string
    fecha: string
    referencia_tipo?: string
    referencia_id?: string
  }>
}
