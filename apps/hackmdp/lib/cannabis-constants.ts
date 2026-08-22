// Cannabis domain color maps — shared across all cannabis module pages
// These represent domain concepts and are NOT theme-dependent

export const FASES_ORDER = [
  'germinacion', 'plantula', 'vegetativo', 'pre-floracion',
  'floracion', 'flush', 'cosecha', 'secado', 'curado', 'terminado',
] as const;

export const FASE_COLORS: Record<string, string> = {
  germinacion: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  plantula: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  vegetativo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'pre-floracion': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  floracion: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  flush: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cosecha: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  secado: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  curado: 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300',
  terminado: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export const FASE_BORDER_COLORS: Record<string, string> = {
  germinacion: 'border-lime-500',
  plantula: 'border-green-500',
  vegetativo: 'border-emerald-500',
  'pre-floracion': 'border-yellow-500',
  floracion: 'border-amber-500',
  flush: 'border-blue-500',
  cosecha: 'border-red-500',
  secado: 'border-orange-500',
  curado: 'border-stone-500',
  terminado: 'border-gray-500',
};

export const ESTADO_LOTE_COLORS: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cosechado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  descartado: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const TIPO_CEPA_COLORS: Record<string, string> = {
  indica: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  sativa: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  hibrida: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ruderalis: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export const DIFICULTAD_COLORS: Record<string, string> = {
  facil: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  dificil: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  experto: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const ESTADO_CEPA_COLORS: Record<string, string> = {
  activa: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  en_prueba: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  descatalogada: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300',
};

export const TIPO_SALA_COLORS: Record<string, string> = {
  indoor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  outdoor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  greenhouse: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  secado: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  curado: 'bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300',
  madres: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  clones: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
};

export const CALIDAD_COLORS: Record<string, string> = {
  premium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  C: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300',
  trim: 'bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300',
};

export const ESTADO_COSECHA_COLORS: Record<string, string> = {
  secando: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  curando: 'bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300',
  terminada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export const TIPO_CRUCE_COLORS: Record<string, string> = {
  F1: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  F2: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  BX: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  S1: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
};

export const ESTADO_CRUCE_COLORS: Record<string, string> = {
  planificado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  en_progreso: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  descartado: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const TIPO_SEMILLA_COLORS: Record<string, string> = {
  regular: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  feminizada: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  autofloreciente: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  cbd: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export const PARAMETRO_LABELS: Record<string, string> = {
  temperatura_c: 'Temperatura (°C)',
  humedad_relativa: 'Humedad (%)',
  vpd: 'VPD (kPa)',
  co2_ppm: 'CO2 (ppm)',
  ppfd: 'PPFD (µmol)',
};

export const CONDICION_LABELS: Record<string, string> = {
  mayor_que: 'Mayor que',
  menor_que: 'Menor que',
  igual_a: 'Igual a',
  fuera_rango: 'Fuera de rango',
};

// Row border color helpers
export function getLoteBorderColor(lote: { estado?: string; fase_actual?: string }): string | null {
  if (lote.estado === 'descartado') return 'border-l-4 border-red-500';
  if (lote.estado === 'cosechado') return 'border-l-4 border-emerald-500';
  if (lote.fase_actual) return `border-l-4 ${FASE_BORDER_COLORS[lote.fase_actual] || ''}`;
  return null;
}

export function getCruceBorderColor(cruce: { estado?: string }): string | null {
  const map: Record<string, string> = {
    planificado: 'border-l-4 border-blue-500',
    en_progreso: 'border-l-4 border-amber-500',
    completado: 'border-l-4 border-emerald-500',
    descartado: 'border-l-4 border-red-500',
  };
  return cruce.estado ? map[cruce.estado] || null : null;
}

export function getCosechaBorderColor(cosecha: { estado?: string }): string | null {
  const map: Record<string, string> = {
    secando: 'border-l-4 border-orange-500',
    curando: 'border-l-4 border-stone-500',
    terminada: 'border-l-4 border-emerald-500',
  };
  return cosecha.estado ? map[cosecha.estado] || null : null;
}

export function getSemillaBorderColor(semilla: { cantidad_disponible?: number; disponible_venta?: boolean }): string | null {
  if (semilla.cantidad_disponible != null && semilla.cantidad_disponible <= 0) return 'border-l-4 border-red-500';
  if (semilla.cantidad_disponible != null && semilla.cantidad_disponible <= 5) return 'border-l-4 border-orange-500';
  if (semilla.disponible_venta) return 'border-l-4 border-emerald-500';
  return null;
}

// Utility: days elapsed since a date
export function getDiasTranscurridos(fechaInicio: string | null | undefined): string {
  if (!fechaInicio) return '—';
  const start = new Date(fechaInicio);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${diff}d`;
}

// Utility: drying ratio
export function getRatioSecado(humedo: number | null, seco: number | null): string {
  if (!humedo || !seco || humedo === 0) return '—';
  return `${((seco / humedo) * 100).toFixed(1)}%`;
}

// Utility: stock level color
export function getStockColor(cantidad: number): string {
  if (cantidad <= 0) return 'text-red-600 font-semibold';
  if (cantidad <= 5) return 'text-orange-600 font-semibold';
  if (cantidad <= 20) return 'text-yellow-600 font-medium';
  return 'text-foreground';
}
