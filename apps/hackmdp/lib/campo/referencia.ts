/**
 * Referencia agronómica por hallazgo.
 *
 * Cuando el modelo clasifica la foto, el sistema busca acá qué se sabe de esa
 * enfermedad y lo muestra al lado del diagnóstico. Es una consulta real a datos
 * locales, no una simulación: el agrónomo ve los signos que definen el cuadro y
 * puede contrastarlos con lo que tiene delante.
 *
 * Sirve para lo que más importa: distinguir tizón tardío de temprano, que se
 * confunden y se tratan distinto.
 */

import type { Hallazgo } from './vision'

/**
 * Imágenes de referencia por clase, tomadas del dataset PlantVillage
 * (spMohanty/PlantVillage-Dataset, subconjunto de papa).
 *
 * Se usan como REFERENCIA VISUAL, no como entrenamiento: son hojas
 * fotografiadas en laboratorio, y un clasificador entrenado sobre ellas se cae
 * con fotos de campo. Pero para que el agrónomo compare contra lo que tiene
 * delante sirven perfecto: son los cuadros de manual.
 */
export const IMAGENES_REFERENCIA: Partial<Record<Hallazgo, string[]>> = {
  tizon_tardio: [
    '/referencia/tizon_tardio-1.jpg',
    '/referencia/tizon_tardio-2.jpg',
    '/referencia/tizon_tardio-3.jpg',
  ],
  tizon_temprano: [
    '/referencia/tizon_temprano-1.jpg',
    '/referencia/tizon_temprano-2.jpg',
    '/referencia/tizon_temprano-3.jpg',
  ],
  sana: [
    '/referencia/sana-1.jpg',
    '/referencia/sana-2.jpg',
    '/referencia/sana-3.jpg',
  ],
}

export function imagenesDe(h: Hallazgo): string[] {
  return IMAGENES_REFERENCIA[h] ?? []
}

export interface Referencia {
  signos: string[]
  /** Con qué se confunde y cómo diferenciarlo. */
  diferencial: string | null
  /** Qué hacer, sin dosis: la dosis la decide el agrónomo. */
  manejo: string | null
  /** Días de referencia entre aplicaciones preventivas, si aplica. */
  ventana_dias: number | null
}

export const REFERENCIA: Partial<Record<Hallazgo, Referencia>> = {
  tizon_tardio: {
    signos: [
      'Manchas irregulares verde oscuro a marrón, de aspecto húmedo',
      'Halo clorótico difuso en el borde de la lesión',
      'Vello blanquecino en el envés con humedad alta',
      'Avanza rápido: puede tomar el lote en pocos días',
    ],
    diferencial:
      'Contra el temprano: el tardío no forma anillos concéntricos y las lesiones ' +
      'se ven mojadas. Empieza por hojas jóvenes, no por las viejas.',
    manejo:
      'Confirmar el mismo día y revisar los lotes vecinos. Condiciones de riesgo: ' +
      'noches húmedas con 10-20 °C. Priorizar los lotes de categoría inicial.',
    ventana_dias: 7,
  },
  tizon_temprano: {
    signos: [
      'Manchas circulares con anillos concéntricos, tipo diana',
      'Aparece primero en hojas basales, las más viejas',
      'Tejido alrededor amarillento',
      'Avanza de abajo hacia arriba de la planta',
    ],
    diferencial:
      'Contra el tardío: los anillos concéntricos son el signo que lo define, y ' +
      'las lesiones son secas. Suele venir con planta estresada o falta de nitrógeno.',
    manejo:
      'Monitorear la evolución. Revisar el estado nutricional del lote: se agrava ' +
      'con deficiencia de nitrógeno.',
    ventana_dias: 10,
  },
  virosis: {
    signos: [
      'Mosaico: zonas claras y oscuras en la misma hoja',
      'Enrollamiento de bordes hacia arriba',
      'Planta más chica que las vecinas, achaparrada',
    ],
    diferencial:
      'No se cura con aplicación: la planta queda infectada. Lo que se controla ' +
      'es el pulgón que lo transmite.',
    manejo:
      'En semilla fiscalizada es determinante: la tolerancia por categoría es ' +
      'baja. Marcar y aislar la planta, avisar al responsable de certificación.',
    ventana_dias: null,
  },
  estres_hidrico: {
    signos: [
      'Hojas plegadas sobre el nervio central',
      'Marchitez que revierte de noche',
      'Sin lesiones ni manchas',
    ],
    diferencial:
      'A diferencia de una enfermedad, el tejido no tiene lesión: la hoja está ' +
      'entera, solo perdió turgencia.',
    manejo: 'Revisar la vuelta del pivote y la lámina aplicada en ese tercio.',
    ventana_dias: null,
  },
  dano_por_insecto: {
    signos: [
      'Perforaciones o bordes comidos',
      'Minas o galerías dentro de la hoja',
      'Presencia del insecto o de sus deyecciones',
    ],
    diferencial:
      'El daño es mecánico: bordes netos, sin halo. Una lesión de hongo tiene ' +
      'tejido decolorado alrededor.',
    manejo: 'Identificar la plaga antes de decidir. Estimar el porcentaje de hoja afectada.',
    ventana_dias: null,
  },
  deficiencia_nutricional: {
    signos: [
      'Amarillamiento con patrón regular, no en manchas',
      'Suele empezar por las hojas viejas si es nitrógeno',
      'Nervaduras que se mantienen verdes',
    ],
    diferencial:
      'El patrón es simétrico y sigue la nervadura. Una enfermedad da manchas ' +
      'irregulares y salteadas.',
    manejo: 'Contrastar con el plan de fertilización de la campaña.',
    ventana_dias: null,
  },
  dano_por_herbicida: {
    signos: [
      'Deformación del brote nuevo',
      'Decoloración en franjas o por sectores del lote',
      'Coincide con el recorrido de la pulverizadora',
    ],
    diferencial:
      'El patrón sigue la aplicación, no una progresión biológica: bordes rectos, ' +
      'franjas paralelas.',
    manejo: 'Cruzar con las órdenes de trabajo recientes del lote.',
    ventana_dias: null,
  },
}

/** Qué sabe el sistema sobre este hallazgo. Null si no hay ficha. */
export function referenciaDe(h: Hallazgo): Referencia | null {
  return REFERENCIA[h] ?? null
}
