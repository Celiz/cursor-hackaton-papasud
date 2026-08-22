import assert from "node:assert/strict";
import { normalizarRenglonesIvr } from "./ivr-renglones";

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

test("usa facturas_items cuando hay filas en la tabla", () => {
  const r = normalizarRenglonesIvr({
    facturas_items: [
      { descripcion: "Service mensual", cantidad: 1, precio_unitario: 70000, subtotal: 70000, producto_id: "8551" },
    ],
    detalles: { insumos: [{ nombre: "NO USAR", cantidad: 9, precio_unitario: 1, monto: 9 }] },
  });
  assert.deepEqual(r, [
    { descripcion: "Service mensual", cantidad: 1, precio_unitario: 70000, subtotal: 70000, producto_id: "8551" },
  ]);
});

test("cae a detalles.insumos cuando no hay facturas_items", () => {
  const r = normalizarRenglonesIvr({
    facturas_items: [],
    detalles: { insumos: [{ nombre: "PRESUPUESTO N°15999", cantidad: 1, precio_unitario: 11900, monto: 11900, producto_id: "8551" }] },
  });
  assert.deepEqual(r, [
    { descripcion: "PRESUPUESTO N°15999", cantidad: 1, precio_unitario: 11900, subtotal: 11900, producto_id: "8551" },
  ]);
});

test("subtotal de insumo cae a monto cuando no viene subtotal", () => {
  const r = normalizarRenglonesIvr({
    detalles: { insumos: [{ nombre: "X", cantidad: 2, precio_unitario: 50, monto: 100 }] },
  });
  assert.equal(r[0].subtotal, 100);
});

test("sin renglones en ninguna fuente devuelve []", () => {
  assert.deepEqual(normalizarRenglonesIvr({ facturas_items: [], detalles: { insumos: [] } }), []);
  assert.deepEqual(normalizarRenglonesIvr({}), []);
});

test("coacciona numeros que vienen como string", () => {
  const r = normalizarRenglonesIvr({
    facturas_items: [{ descripcion: "Y", cantidad: "2", precio_unitario: "100.5", subtotal: "201" }],
  });
  assert.equal(r[0].cantidad, 2);
  assert.equal(r[0].precio_unitario, 100.5);
  assert.equal(r[0].subtotal, 201);
});

test("acepta detalles como string JSON", () => {
  const r = normalizarRenglonesIvr({
    detalles: JSON.stringify({ insumos: [{ nombre: "Z", cantidad: 1, precio_unitario: 10, monto: 10 }] }),
  });
  assert.equal(r.length, 1);
  assert.equal(r[0].descripcion, "Z");
});

test("preserva un subtotal explícito en 0 (no lo recalcula)", () => {
  const r = normalizarRenglonesIvr({
    detalles: { insumos: [{ nombre: "Bonificado", cantidad: 1, precio_unitario: 5000, subtotal: 0, monto: 0 }] },
  });
  assert.equal(r[0].subtotal, 0);
});

console.log(`\ntodos pasaron (${pasaron})`);
