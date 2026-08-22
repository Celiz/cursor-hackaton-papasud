import { test } from "node:test";
import assert from "node:assert/strict";
import { repartirCredito } from "./nc-ivr-reparto.ts";

const items = [
  { factura_id: "a", pendiente: 100 },
  { factura_id: "b", pendiente: 50 },
  { factura_id: "c", pendiente: 30 },
];

test("FIFO llena en orden y calcula excedente cuando sobra", () => {
  const r = repartirCredito(200, items);
  assert.deepEqual(r.aplicaciones, [
    { factura_id: "a", monto_aplicado: 100 },
    { factura_id: "b", monto_aplicado: 50 },
    { factura_id: "c", monto_aplicado: 30 },
  ]);
  assert.equal(r.totalAplicado, 180);
  assert.equal(r.excedente, 20);
});

test("FIFO corta cuando se agota el pool (aplicación parcial)", () => {
  const r = repartirCredito(120, items);
  assert.deepEqual(r.aplicaciones, [
    { factura_id: "a", monto_aplicado: 100 },
    { factura_id: "b", monto_aplicado: 20 },
  ]);
  assert.equal(r.totalAplicado, 120);
  assert.equal(r.excedente, 0);
});

test("sin items: todo el pool es excedente", () => {
  const r = repartirCredito(75, []);
  assert.deepEqual(r.aplicaciones, []);
  assert.equal(r.totalAplicado, 0);
  assert.equal(r.excedente, 75);
});

test("intención manual se respeta y se topea por el pendiente", () => {
  const r = repartirCredito(200, items, { a: 40, b: 999 });
  // a: min(40,100,200)=40 ; b: min(999,50,160)=50 ; c: sin intención => min(pend 30, 110)=30
  assert.deepEqual(r.aplicaciones, [
    { factura_id: "a", monto_aplicado: 40 },
    { factura_id: "b", monto_aplicado: 50 },
    { factura_id: "c", monto_aplicado: 30 },
  ]);
  assert.equal(r.excedente, 80);
});

test("intención null = usar el pendiente del IVR", () => {
  const r = repartirCredito(1000, [{ factura_id: "a", pendiente: 100 }], { a: null });
  assert.deepEqual(r.aplicaciones, [{ factura_id: "a", monto_aplicado: 100 }]);
  assert.equal(r.excedente, 900);
});

test("pool 0: nada aplicado, sin excedente", () => {
  const r = repartirCredito(0, items);
  assert.deepEqual(r.aplicaciones, []);
  assert.equal(r.excedente, 0);
});

test("redondea a 2 decimales", () => {
  const r = repartirCredito(33.335, [{ factura_id: "a", pendiente: 10.005 }]);
  assert.equal(r.aplicaciones[0].monto_aplicado, 10.01);
  assert.equal(r.excedente, 23.33);
});
