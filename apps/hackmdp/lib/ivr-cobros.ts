// Aviso al eliminar un IVR con plata cobrada.
//
// QUÉ PASA HOY AL BORRAR UN IVR (migración 1139 + DELETE /api/ivr):
//
// El recibo NO se borra. Un cobro es un RECIBO —— plata que el cliente pagó —— y borrar un
// remito no deshace un pago. Lo que se suelta son las IMPUTACIONES de ese recibo contra
// ESTE remito: esa plata vuelve a quedar como saldo a favor del cliente, lista para
// imputarse a otro. Las imputaciones del mismo recibo a OTROS remitos no se tocan.
//
// (Antes el DELETE hacía `DELETE FROM cobros WHERE factura_id = ...` y el FK era CASCADE:
// el recibo se destruía, y con él sus imputaciones a los otros remitos —— que volvían a
// figurar impagos. El aviso decía "los cobros también se eliminarán": era verdad, y era el
// desastre. Ahora dice lo que realmente pasa.)
//
// Este helper arma el texto y se comparte entre el botón fluido del detalle
// (IvrDetailSheet) y la confirmación de la fila (dashboard/ivr) para que digan exactamente
// lo mismo.
//
// Nota (cobros vs pagos): los IVR nuevos guardan los pagos en `cobros`; los viejos, en
// `pagos`. Contemplamos ambos.

export function cobrosDeIvr(ivr: any): { cantidad: number; monto: number } {
  const arr = ivr?.cobros ?? ivr?.pagos ?? [];
  const cantidad = Array.isArray(arr) ? arr.length : 0;
  const monto = Number(ivr?.total_cobrado ?? ivr?.total_pagado ?? 0) || 0;
  return { cantidad, monto };
}

/**
 * Texto de confirmación para borrar un IVR. Si tiene plata cobrada, avisa cuánto crédito va
 * a quedar liberado a favor del cliente. `formatMonto` es el formateador de moneda del
 * caller (useFormatCurrency) para respetar la config de la org.
 *
 * Se decide por el MONTO, no por la cantidad de filas de `cobros`: un remito puede estar
 * pagado por un recibo linkeado a OTRO remito (la plata le llega por cobros_aplicaciones).
 * En ese caso `ivr.cobros` viene vacío pero hay plata imputada igual, y el aviso tiene que
 * salir lo mismo.
 */
export function avisoBorrarIvr(ivr: any, formatMonto: (n: number) => string): string {
  const { monto } = cobrosDeIvr(ivr);
  if (monto > 0) {
    return `Este remito tiene ${formatMonto(monto)} cobrados. Al eliminarlo, esa plata vuelve a quedar como saldo a favor del cliente (el recibo no se borra). Esta acción no se puede deshacer.`;
  }
  return "Esta acción no se puede deshacer.";
}
