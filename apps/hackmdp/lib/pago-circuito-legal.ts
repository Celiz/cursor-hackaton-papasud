import { NextResponse } from "next/server";

// LA TABLA `pagos` ES DEL CIRCUITO LEGAL. UN IVR NO ENTRA.
//
// Son dos libros distintos:
//
//   LEGAL (facturas AFIP)          -> la plata vive en `pagos`.
//   IVR   (remitos internos)       -> la plata vive en `cobros` (el recibo) +
//                                     `cobros_aplicaciones` (contra que remito se imputa).
//
// Un `pago` cuya factura es un IVR no lo lee NINGUN saldo (la vista legal filtra
// `tipo_factura <> 'IVR'`; la de IVR no mira `pagos` ni una vez): no es plata, es basura —— y
// encima bloquea el borrado del remito (pagos_factura_id_fkey es NO ACTION). La migracion 1140
// borro las 153 filas asi que habia y puso el candado en la base (trigger
// pagos_no_apuntan_a_ivr).
//
// Con el candado puesto, cualquier camino que igual intente escribir un pago sobre un IVR
// levanta una excepcion de Postgres. Sin este mapeo, esa excepcion le llega al usuario como un
// 500 con el texto crudo de la base. Es un 400: el pedido esta mal, y hay una accion clara que
// tomar en su lugar.

export const MENSAJE_PAGO_SOBRE_IVR =
  "Un IVR no lleva pagos: usá Cobros. Los pagos son del circuito de facturas legales (AFIP). " +
  "La plata de un remito interno vive en el recibo (Cobros) y su imputación al remito: para " +
  "cobrarlo usá Cobros de IVR, y para aplicarle crédito que el cliente ya tiene, la imputación " +
  "automática de saldo a favor.";

/**
 * ¿Es este error el del candado de la base que impide un pago sobre un IVR?
 * (trigger `pagos_no_apuntan_a_ivr`, migración 1140 — RAISE ... USING ERRCODE='check_violation').
 *
 * Se exige el código 23514 Y el texto del trigger: otras violaciones de CHECK sobre `pagos`
 * también son 23514, y no queremos convertirlas todas en "es un IVR".
 */
export function esErrorPagoSobreIvr(error: any): boolean {
  return (
    error?.code === "23514" &&
    typeof error?.message === "string" &&
    error.message.includes("es un IVR")
  );
}

/** El 400 en castellano, con el número del documento si lo tenemos. */
export function respuestaPagoSobreIvr(nroFactura?: string | null) {
  const quien = nroFactura ? `${nroFactura} es un IVR. ` : "";
  return NextResponse.json({ error: `${quien}${MENSAJE_PAGO_SOBRE_IVR}` }, { status: 400 });
}
