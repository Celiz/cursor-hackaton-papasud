// Enums
export type Objetivo = 'bajar_peso' | 'mantener' | 'ganar_masa' | 'comer_mejor'
export type Estilo = 'omnivoro' | 'vegetariano' | 'vegano' | 'pescetariano' | 'keto' | 'mediterraneo' | 'personalizado'
export type NivelActividad = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo'
export type Momento = 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'snack'
export type CategoriaAlimento = 'verdura' | 'fruta' | 'carne_roja' | 'carne_blanca' | 'pescado' | 'huevo' | 'lacteo' | 'cereal' | 'legumbre' | 'fruto_seco' | 'aceite' | 'bebida' | 'procesado' | 'condimento'

// DB models
export type NutPerfil = {
  id: string
  persona_id: string
  altura_cm: number | null
  peso_kg: number | null
  fecha_nacimiento: string | null
  sexo: 'masculino' | 'femenino' | null
  objetivo: Objetivo | null
  estilo: Estilo | null
  restricciones: string[]
  nivel_actividad: NivelActividad | null
  comidas_por_dia: number
  calorias_objetivo: number | null
  proteinas_g: number | null
  carbohidratos_g: number | null
  grasas_g: number | null
  created_at: string
  updated_at: string
}

export type NutAlimento = {
  id: string
  nombre: string
  categoria: CategoriaAlimento | null
  calorias_100g: number
  proteinas_100g: number
  carbohidratos_100g: number
  grasas_100g: number
  fibra_100g: number
  hierro_mg: number | null
  calcio_mg: number | null
  vitamina_c_mg: number | null
  vitamina_b12_mcg: number | null
  sodio_mg: number | null
  porcion_tipica_g: number | null
  porcion_nombre: string | null
  tags: string[]
  creado_por: string | null
  created_at: string
}

export type NutComida = {
  id: string
  persona_id: string
  fecha: string
  momento: Momento
  nombre: string | null
  notas: string | null
  foto_url: string | null
  calorias_total: number
  proteinas_total: number
  carbohidratos_total: number
  grasas_total: number
  fibra_total: number
  origen: string
  created_at: string
  items?: NutComidaItem[]
}

export type NutComidaItem = {
  id: string
  comida_id: string
  alimento_id: string | null
  nombre: string
  cantidad_g: number | null
  calorias: number
  proteinas_g: number
  carbohidratos_g: number
  grasas_g: number
  fibra_g: number
}

export type NutPlan = {
  id: string
  persona_id: string
  semana_inicio: string
  estado: 'activo' | 'completado' | 'descartado'
  notas: string | null
  titulo: string | null
  asignado_por: string | null
  created_at: string
  dias?: NutPlanDia[]
}

export type TipoFeedback = 'like' | 'dislike' | 'nota' | 'sustitucion'

export type NutPlanFeedback = {
  id: string
  plan_id: string
  dia_semana: number
  momento: string
  tipo: TipoFeedback
  texto: string | null
  persona_id: string
  created_at: string
}

export type NutPlanDia = {
  id: string
  plan_id: string
  dia_semana: number
  comidas: PlanComida[]
  calorias_total: number
}

export type PlanComida = {
  momento: Momento
  nombre: string
  ingredientes: { nombre: string; cantidad_g: number; calorias: number; proteinas_g: number; carbohidratos_g: number; grasas_g: number }[]
  calorias_total: number
  proteinas_total: number
  carbohidratos_total: number
  grasas_total: number
}

export type NutReceta = {
  id: string
  persona_id: string
  nombre: string
  descripcion: string | null
  porciones: number
  tiempo_preparacion_min: number | null
  ingredientes: { nombre: string; cantidad_g: number; alimento_id?: string }[]
  pasos: string[]
  calorias_porcion: number | null
  proteinas_porcion: number | null
  carbohidratos_porcion: number | null
  grasas_porcion: number | null
  tags: string[]
  foto_url: string | null
  favorita: boolean
  created_at: string
}

export type NutListaCompras = {
  id: string
  plan_id: string | null
  persona_id: string
  items: { nombre: string; cantidad_g: number; categoria: string; checked: boolean }[]
  created_at: string
  updated_at: string
}

export type NutPesoRegistro = {
  id: string
  persona_id: string
  fecha: string
  peso_kg: number
  notas: string | null
  created_at: string
}

export type NutAguaRegistro = {
  id: string
  persona_id: string
  fecha: string
  vasos: number
  updated_at: string
}

// Dashboard aggregate type
export type NutDashboard = {
  perfil: NutPerfil | null
  comidas: NutComida[]
  agua: { vasos: number }
  resumen: {
    calorias: number
    proteinas: number
    carbohidratos: number
    grasas: number
    fibra: number
  }
  objetivos: {
    calorias: number
    proteinas: number
    carbohidratos: number
    grasas: number
  }
  sparkline: { fecha: string; calorias: number }[]
  peso: { ultimo: number | null; anterior: number | null } | null
  streak: number
  score: number
  plan_hoy: { momento: string; nombre: string }[] | null
  adherencia_semana: number
}

// Progress aggregate type
export type ProgresoResponse = {
  periodo: 'semana' | 'mes'
  fecha_inicio: string
  fecha_fin: string
  dias_registrados: number
  dias_totales: number
  adherencia_pct: number
  calorias: {
    promedio: number
    objetivo: number
    min: number
    max: number
  }
  macros: {
    proteinas_avg: number
    carbos_avg: number
    grasas_avg: number
  }
  peso: {
    inicio: number | null
    fin: number | null
    cambio: number | null
  }
  agua_avg: number
  score_avg: number
  daily: {
    fecha: string
    calorias: number
    score: number
    registros: number
  }[]
}

// Labels for display
export const MOMENTO_LABELS: Record<Momento, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
  snack: 'Snack',
}

export const MOMENTO_ICONS: Record<Momento, string> = {
  desayuno: '🌅',
  almuerzo: '🌞',
  merienda: '🍎',
  cena: '🌙',
  snack: '🍪',
}

export const OBJETIVO_LABELS: Record<Objetivo, string> = {
  bajar_peso: 'Bajar de peso',
  mantener: 'Mantener peso',
  ganar_masa: 'Ganar masa muscular',
  comer_mejor: 'Comer mejor',
}

export const ESTILO_LABELS: Record<Estilo, string> = {
  omnivoro: 'Omnívoro',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  pescetariano: 'Pescetariano',
  keto: 'Keto',
  mediterraneo: 'Mediterráneo',
  personalizado: 'Personalizado',
}

export const ACTIVIDAD_LABELS: Record<NivelActividad, string> = {
  sedentario: 'Sedentario',
  ligero: 'Actividad ligera',
  moderado: 'Actividad moderada',
  activo: 'Activo',
  muy_activo: 'Muy activo',
}
