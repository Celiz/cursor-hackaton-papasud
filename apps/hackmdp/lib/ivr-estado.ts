import { query as poolQuery } from '@/lib/db'

// Ejecutor mínimo: el pool (`@/lib/db` query) o el client de una transacción
// (getClient()). Permite recalcular el estado dentro o fuera de una transacción.
type Executor = { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }

// Recalcula estado + total_pagado de un IVR.
//
// La regla vive en la función SQL `ivr_recalcular_estado` (migración 1130), que es
// también la que disparan los triggers sobre cobros / cobros_aplicaciones /
// notas_credito_aplicaciones. Una sola definición: si el cálculo viviera acá además
// de en la base, los dos podrían discrepar y el último en escribir ganaría.
//
// Resumen de la regla: "cubierto" = cobros imputados + NC aplicadas; total_pagado
// guarda SOLO lo cobrado (una NC no es un pago); 'anulada' nunca se deriva.
//
// `exec` opcional: pasar el client de una transacción para recalcular dentro de ella.
export async function actualizarEstadoIvr(facturaId: string, exec?: Executor): Promise<void> {
  const run = (sql: string, params: any[]) => (exec ? exec.query(sql, params) : poolQuery(sql, params))
  await run(`SELECT ivr_recalcular_estado($1)`, [facturaId])
}
