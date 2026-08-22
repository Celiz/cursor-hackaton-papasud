/**
 * Ajuste de precio por cliente. Fuente de verdad = clientes.factor_precio
 * (multiplicador). La UI trabaja siempre en porcentaje con signo.
 *   factor = 1 + pct/100 ; pct = round((factor-1)*100)
 *
 * OJO: las columnas `numeric` de Postgres llegan como STRING vía node-pg
 * (p.ej. "0.9500"), por eso todas las funciones coercen number|string.
 */
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Coerce number|string a number; null/""/NaN → fallback. */
function toNum(v: number | string | null | undefined, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** -5 → 0.95, +20 → 1.20, 0 → 1.0 (redondeado a 4 decimales, como numeric(5,4)). */
export function pctToFactor(pct: number | string): number {
  return round4(1 + toNum(pct, 0) / 100);
}

/** 0.95 → -5, 1.20 → 20, 1/"1.0000"/null/undefined → 0. */
export function factorToPct(factor: number | string | null | undefined): number {
  return Math.round((toNum(factor, 1) - 1) * 100);
}

/** Total ajustado: base × factor (factor null ⇒ sin cambio). */
export function aplicarAjuste(base: number, factor: number | string | null | undefined): number {
  return base * toNum(factor, 1);
}

/**
 * Monto del ajuste (negativo = descuento, positivo = recargo).
 * Se deriva del total ajustado (aplicarAjuste - base) para que
 * `montoAjuste + base === aplicarAjuste` y evitar ruido de punto flotante.
 */
export function montoAjuste(base: number, factor: number | string | null | undefined): number {
  return aplicarAjuste(base, factor) - base;
}
