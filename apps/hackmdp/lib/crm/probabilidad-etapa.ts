// Probabilidad de cierre por etapa del pipeline (CRM). FUENTE ÚNICA de verdad: la usan
// el form de oportunidad (preview del valor ponderado) y el backend (`/api/oportunidades`,
// auto-set de `probabilidad_cierre` al cambiar de etapa). Antes había DOS mapas separados:
// el del backend con las etapas reales, y el del form con claves fantasma
// (lead/contactado/presupuestado/aprobado) que NO matcheaban → el form siempre mostraba 10%.
//
// Los valores son ESTIMACIONES de embudo, NO un estudio: no hay tasa por-etapa confiable
// todavía porque el log de cambios de etapa recién se está poblando
// (oportunidades_actividades.tipo='etapa_cambio', ~13/202 al 2026-06-26). Están ANCLADOS a la
// tasa de cierre REAL del negocio — ~88% histórico (104 ganadas / 118 decididas) — así que el
// techo (logística, última etapa abierta) se acerca a ese 88% real en vez de a un 90% genérico.
// Recalibrar desde el historial de etapas cuando haya volumen suficiente.
export const PROBABILIDAD_POR_ETAPA: Record<string, number> = {
  nuevo: 30,
  presupuestado: 50,
  propuesta: 60,
  logistica: 85,
  'interesados a futuro': 15,
  ganado: 100,
  finalizado: 100,
  perdido: 0,
};

/** Probabilidad de la etapa, o 10% si la etapa es desconocida/vacía. */
export function probabilidadDeEtapa(etapa: string | null | undefined): number {
  if (!etapa) return 10;
  const p = PROBABILIDAD_POR_ETAPA[etapa];
  return p === undefined ? 10 : p;
}
