import type { Objetivo, NivelActividad } from './types'

const FACTORES_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
}

// TMB (Harris-Benedict revised)
export function calcularTMB(peso: number, altura: number, edad: number, sexo: 'masculino' | 'femenino'): number {
  if (sexo === 'masculino') {
    return Math.round(88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * edad))
  }
  return Math.round(447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * edad))
}

// TDEE = TMB * factor actividad
export function calcularTDEE(tmb: number, actividad: NivelActividad): number {
  return Math.round(tmb * FACTORES_ACTIVIDAD[actividad])
}

// Calorias objetivo segun meta
export function calcularCaloriasObjetivo(tdee: number, objetivo: Objetivo): number {
  switch (objetivo) {
    case 'bajar_peso': return Math.round(tdee - 500)
    case 'ganar_masa': return Math.round(tdee + 300)
    default: return tdee
  }
}

// Macros en gramos
export function calcularMacros(calorias: number, objetivo: Objetivo): { proteinas: number; carbohidratos: number; grasas: number } {
  let protRatio = 0.25, carbRatio = 0.50, fatRatio = 0.25
  if (objetivo === 'ganar_masa') { protRatio = 0.30; carbRatio = 0.45; fatRatio = 0.25 }
  if (objetivo === 'bajar_peso') { protRatio = 0.30; carbRatio = 0.40; fatRatio = 0.30 }
  if (objetivo === 'comer_mejor') { protRatio = 0.25; carbRatio = 0.50; fatRatio = 0.25 }
  return {
    proteinas: Math.round((calorias * protRatio) / 4),
    carbohidratos: Math.round((calorias * carbRatio) / 4),
    grasas: Math.round((calorias * fatRatio) / 9),
  }
}

// Edad desde fecha de nacimiento
export function calcularEdad(fechaNacimiento: string): number {
  const birth = new Date(fechaNacimiento)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// Score del dia (0-100)
export function calcularScoreDia(
  consumido: { calorias: number; proteinas: number; carbohidratos: number; grasas: number },
  objetivo: { calorias: number; proteinas: number; carbohidratos: number; grasas: number }
): number {
  if (objetivo.calorias === 0) return 0

  // Each macro scores based on proximity to target (100% = perfect)
  function proximityScore(actual: number, target: number): number {
    if (target === 0) return 100
    const ratio = actual / target
    // Perfect at 1.0, drops off for over/under
    if (ratio >= 0.8 && ratio <= 1.1) return 100
    if (ratio >= 0.6 && ratio <= 1.3) return 75
    if (ratio >= 0.4 && ratio <= 1.5) return 50
    return 25
  }

  const calScore = proximityScore(consumido.calorias, objetivo.calorias)
  const protScore = proximityScore(consumido.proteinas, objetivo.proteinas)
  const carbScore = proximityScore(consumido.carbohidratos, objetivo.carbohidratos)
  const fatScore = proximityScore(consumido.grasas, objetivo.grasas)

  // Weighted: calories 40%, protein 25%, carbs 20%, fat 15%
  return Math.round(calScore * 0.4 + protScore * 0.25 + carbScore * 0.2 + fatScore * 0.15)
}

// Calculate all from profile data
export function calcularTodoDesdeProfile(perfil: {
  peso_kg: number; altura_cm: number; fecha_nacimiento: string;
  sexo: 'masculino' | 'femenino'; nivel_actividad: NivelActividad; objetivo: Objetivo
}) {
  const edad = calcularEdad(perfil.fecha_nacimiento)
  const tmb = calcularTMB(perfil.peso_kg, perfil.altura_cm, edad, perfil.sexo)
  const tdee = calcularTDEE(tmb, perfil.nivel_actividad)
  const calorias = calcularCaloriasObjetivo(tdee, perfil.objetivo)
  const macros = calcularMacros(calorias, perfil.objetivo)
  return { tmb, tdee, calorias, ...macros, edad }
}
