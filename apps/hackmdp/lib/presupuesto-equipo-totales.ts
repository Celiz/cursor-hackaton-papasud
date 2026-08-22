// Agrupación de totales por moneda para presupuestos de equipos.
//
// Un presupuesto de equipos puede mezclar equipos en USD y ARS. Cada línea cotiza
// en SU moneda nativa (equipos.precio_lista_moneda) y NO se convierte: los totales
// se reportan por moneda (ej. "Total USD: US$1.800 · Total ARS: $500.000"), no
// sumados en una sola. Esta es la fuente de verdad compartida por el editor, el PDF
// y el listado para que los tres muestren lo mismo.

export type MonedaPresupuesto = "ARS" | "USD";

export interface LineaPresupuestoEquipo {
  /** Subtotal de la línea (cantidad × precio × (1 − desc%)), SIN IVA, en su moneda nativa. */
  subtotal: number;
  /** Alícuota de IVA de la línea en % (0 / 10,5 / 21 / 27). */
  ivaPorcentaje: number;
  /** Moneda nativa de la línea. */
  moneda: MonedaPresupuesto;
}

export interface TotalPorMoneda {
  moneda: MonedaPresupuesto;
  subtotal: number;
  iva: number;
  total: number;
}

// Orden estable de presentación: USD primero, luego ARS.
const ORDEN_MONEDA: MonedaPresupuesto[] = ["USD", "ARS"];

/** Normaliza un valor de moneda libre (puede venir null o en minúsculas) a USD/ARS. */
export function normalizarMoneda(
  valor: string | null | undefined,
  fallback: MonedaPresupuesto = "USD",
): MonedaPresupuesto {
  return String(valor).toUpperCase() === "ARS" ? "ARS" : String(valor).toUpperCase() === "USD" ? "USD" : fallback;
}

/**
 * Agrupa líneas por moneda y devuelve subtotal / IVA / total por cada moneda
 * presente. No convierte entre monedas. El orden es estable (USD, ARS).
 */
export function agruparTotalesPorMoneda(
  lineas: LineaPresupuestoEquipo[],
): TotalPorMoneda[] {
  const acc = new Map<MonedaPresupuesto, TotalPorMoneda>();
  for (const l of lineas) {
    const sub = Number.isFinite(l.subtotal) ? l.subtotal : 0;
    const pct = Number.isFinite(l.ivaPorcentaje) ? l.ivaPorcentaje : 0;
    const iva = sub * (pct / 100);
    const g = acc.get(l.moneda) ?? { moneda: l.moneda, subtotal: 0, iva: 0, total: 0 };
    g.subtotal += sub;
    g.iva += iva;
    g.total += sub + iva;
    acc.set(l.moneda, g);
  }
  return ORDEN_MONEDA.filter((m) => acc.has(m)).map((m) => acc.get(m)!);
}

/** True si las líneas mezclan más de una moneda. */
export function esMixto(totales: TotalPorMoneda[]): boolean {
  return totales.length > 1;
}

/** La moneda con mayor total (para el `total`/`moneda` del header, retrocompat). null si no hay líneas. */
export function monedaDominante(
  totales: TotalPorMoneda[],
): MonedaPresupuesto | null {
  if (totales.length === 0) return null;
  return totales.reduce((best, t) => (t.total > best.total ? t : best)).moneda;
}
