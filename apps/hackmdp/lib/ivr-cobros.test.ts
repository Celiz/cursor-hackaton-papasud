import assert from "node:assert/strict";
import { avisoBorrarIvr, cobrosDeIvr } from "./ivr-cobros";

let pasaron = 0;
function test(nombre: string, fn: () => void) {
  try {
    fn();
    pasaron++;
    console.log(`  ok  ${nombre}`);
  } catch (e) {
    console.error(`  FALLA  ${nombre}`);
    throw e;
  }
}

// El formateador de la org, fingido: nos importa que el monto llegue al texto, no la coma.
const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

test("sin plata cobrada: aviso generico, sin hablar de saldo a favor", () => {
  const texto = avisoBorrarIvr({ total_cobrado: 0, cobros: [] }, fmt);
  assert.equal(texto, "Esta acción no se puede deshacer.");
});

test("con plata cobrada: avisa el monto que vuelve como saldo a favor", () => {
  const texto = avisoBorrarIvr({ total_cobrado: 27000, cobros: [{ monto: 27000 }] }, fmt);
  assert.match(texto, /\$27\.000 cobrados/);
  assert.match(texto, /saldo a favor del cliente/);
});

// La regla del dueño: el recibo es plata que entró y NO se destruye. El aviso no puede
// seguir diciendo que los cobros "se eliminan" — eso era la descripción del bug.
test("el aviso NO promete que se borran los cobros", () => {
  const texto = avisoBorrarIvr({ total_cobrado: 500000, cobros: [{ monto: 500000 }] }, fmt);
  assert.doesNotMatch(texto, /se eliminar/i);
  assert.match(texto, /el recibo no se borra/i);
});

// El caso que el chequeo viejo (cantidad > 0) se comía: el remito está pagado por un recibo
// linkeado a OTRO remito, así que `cobros` viene vacío pero hay plata imputada igual. Sin
// este aviso, el usuario borra un remito pagado creyendo que no tenía plata encima.
test("plata imputada desde otro recibo (cobros vacio) igual dispara el aviso", () => {
  const texto = avisoBorrarIvr({ total_cobrado: 139863, cobros: [] }, fmt);
  assert.match(texto, /\$139\.863 cobrados/);
  assert.match(texto, /saldo a favor del cliente/);
});

test("cae a total_pagado cuando el IVR no trae total_cobrado (IVR viejos)", () => {
  assert.equal(cobrosDeIvr({ total_pagado: "1234.5", pagos: [{}] }).monto, 1234.5);
  const texto = avisoBorrarIvr({ total_pagado: 1000, pagos: [{ monto: 1000 }] }, fmt);
  assert.match(texto, /saldo a favor del cliente/);
});

console.log(`\n${pasaron} tests OK`);
