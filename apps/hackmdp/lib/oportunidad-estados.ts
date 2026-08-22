// Única definición de qué significa que una oportunidad esté abierta, ganada,
// perdida o cerrada.
//
// Existe porque el filtro de "abiertas" estaba escrito por descarte
// (estado NOT IN ('finalizado','perdido','cancelado')) y no excluía 'ganado'.
// Las oportunidades ganadas se contaban como pipeline abierto y como ganadas a
// la vez: el pipeline mostraba 199 oportunidades cuando eran 91, y $295M cuando
// eran $76M. Definir por inclusión evita que agregar un estado nuevo mañana
// vuelva a contaminar el pipeline en silencio.
//
// Estados reales en la base (2026-07-30): abierto 91, ganado 108, perdido 18,
// cancelado 2. 'finalizado' no tiene filas pero el código histórico lo trata
// como ganado, así que se conserva.

export type EstadoOportunidad =
  | "abierto"
  | "ganado"
  | "perdido"
  | "cancelado"
  | "finalizado";

/** Pipeline vivo: lo que todavía se puede ganar o perder. */
export const ESTADOS_ABIERTOS = ["abierto"] as const;

/** Cerradas con venta. */
export const ESTADOS_GANADOS = ["ganado", "finalizado"] as const;

/** Cerradas sin venta. */
export const ESTADOS_PERDIDOS = ["perdido"] as const;

/**
 * Cerradas: las que llegaron a una decisión. 'cancelado' queda afuera a
 * propósito — no se decidió, se abandonó — así que no ensucia la tasa de
 * conversión ni por arriba ni por abajo.
 */
export const ESTADOS_CERRADOS = [
  ...ESTADOS_GANADOS,
  ...ESTADOS_PERDIDOS,
] as const;

function incluye(lista: readonly string[], estado: string | null | undefined) {
  return estado != null && lista.includes(estado);
}

export function esAbierta(estado: string | null | undefined): boolean {
  return incluye(ESTADOS_ABIERTOS, estado);
}

export function esGanada(estado: string | null | undefined): boolean {
  return incluye(ESTADOS_GANADOS, estado);
}

export function esPerdida(estado: string | null | undefined): boolean {
  return incluye(ESTADOS_PERDIDOS, estado);
}

export function esCerrada(estado: string | null | undefined): boolean {
  return incluye(ESTADOS_CERRADOS, estado);
}
