/** Matemática pura de la reasignación de un cobro entre IVR. Sin acceso a red ni DB. */

export type EstadoResultante = "pagada" | "parcial" | "pendiente";

export interface FilaReasignacion {
  factura_id: string;
  nro_factura: string;
  /** Saldo del IVR SIN contar este cobro (viene de /api/ivr?exclude_cobro_id). */
  saldo_sin_este_cobro: number;
  /** Cuánto de este cobro se le asigna a este IVR. */
  asignado: number;
}

export function parseMonto(v: string | number | null | undefined): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n as number) ? (n as number) : 0;
}

function round2(n: number): number {
  const r = Number(`${Math.round(Number(`${n}e2`))}e-2`);
  return Number.isFinite(r) ? r : 0;
}

export function resumen(
  montoCobro: number,
  filas: FilaReasignacion[]
): { totalAsignado: number; sinAsignar: number; excede: boolean } {
  const totalAsignado = round2(filas.reduce((s, f) => s + round2(parseMonto(f.asignado)), 0));
  const sinAsignar = round2(montoCobro - totalAsignado);
  return { totalAsignado, sinAsignar, excede: sinAsignar < -0.005 };
}

export function estadoResultante(
  saldoSinEsteCobro: number,
  asignado: number
): { estado: EstadoResultante; pendiente: number } {
  const saldo = parseMonto(saldoSinEsteCobro);
  const asig = parseMonto(asignado);
  const pendiente = round2(Math.max(0, saldo - asig));
  let estado: EstadoResultante;
  if (pendiente <= 0.005) estado = "pagada";
  else if (asig <= 0.005) estado = "pendiente";
  else estado = "parcial";
  return { estado, pendiente };
}

export function construirAplicaciones(
  filas: FilaReasignacion[]
): { factura_id: string; monto_aplicado: number }[] {
  return filas
    .map((f) => ({ factura_id: f.factura_id, monto_aplicado: round2(parseMonto(f.asignado)) }))
    .filter((a) => a.monto_aplicado > 0);
}
