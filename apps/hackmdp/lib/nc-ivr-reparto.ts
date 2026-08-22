/**
 * Reparto puro de una NC de IVR sobre remitos pendientes — SIN DB, testeable con
 * node:test. La lógica con DB vive en app/api/notas-credito-ivr/route.ts.
 * Mismo criterio que el reparto de cobros: min(intención, pendiente, pool restante).
 */
export interface IvrPendienteInput {
  factura_id: string;
  /** total − cobros aplicados − NC aplicadas (>= 0). */
  pendiente: number;
}
export interface AplicacionCredito {
  factura_id: string;
  monto_aplicado: number;
}
export interface RepartoResultado {
  aplicaciones: AplicacionCredito[];
  totalAplicado: number;
  excedente: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Reparte `pool` sobre `items` en el orden dado (el caller ordena FIFO o manual).
 * `intenciones[factura_id]`: monto deseado; ausente/null → usar el pendiente del IVR.
 * El sobrante del pool queda como `excedente` (>= 0; una NC nunca consume crédito).
 */
export function repartirCredito(
  pool: number,
  items: IvrPendienteInput[],
  intenciones?: Record<string, number | null | undefined>
): RepartoResultado {
  let restante = Number(pool) || 0;
  const aplicaciones: AplicacionCredito[] = [];
  for (const it of items) {
    if (restante <= 0.005) break;
    const pend = Math.max(0, Number(it.pendiente) || 0);
    const intRaw = intenciones ? intenciones[it.factura_id] : undefined;
    const intencion = intRaw == null ? pend : Math.max(0, Number(intRaw) || 0);
    const aplicado = Math.min(intencion, pend, restante);
    if (aplicado > 0.005) {
      aplicaciones.push({ factura_id: it.factura_id, monto_aplicado: round2(aplicado) });
      restante -= aplicado;
    }
  }
  const totalAplicado = round2(aplicaciones.reduce((s, a) => s + a.monto_aplicado, 0));
  const excedente = round2(Math.max(0, (Number(pool) || 0) - totalAplicado));
  return { aplicaciones, totalAplicado, excedente };
}
