import assert from "node:assert/strict";
import { test } from "node:test";
import { validarFilas } from "./ia-validacion";
import type { FilaExtraida } from "./ia-tipos";

const base = (o: Partial<FilaExtraida>): FilaExtraida => ({
  codigo: null, nombre: "X", descripcion: null, precio: 100,
  precio_con_iva: null, moneda: "ARS", categoria: null, ...o,
});

test("descarta filas sin nombre o sin ningún precio, y lo alerta", () => {
  const r = validarFilas([
    base({ nombre: "" }),
    base({ nombre: "SoloNombre", precio: null, precio_con_iva: null }),
    base({ nombre: "OK", precio: 50 }),
  ]);
  assert.equal(r.filas.length, 1);
  assert.equal(r.filas[0].nombre, "OK");
  assert.ok(r.alertas.some((a) => /descart/i.test(a)));
});

test("dedupe por codigo (o nombre si no hay codigo)", () => {
  const r = validarFilas([
    base({ codigo: "A", nombre: "Uno", precio: 10 }),
    base({ codigo: "A", nombre: "Uno dup", precio: 10 }),
    base({ codigo: null, nombre: "Dos", precio: 20 }),
    base({ codigo: null, nombre: "Dos", precio: 20 }),
  ]);
  assert.equal(r.filas.length, 2);
  assert.ok(r.alertas.some((a) => /duplicad/i.test(a)));
});

test("alerta precio<=0", () => {
  const r = validarFilas([base({ nombre: "Z", precio: 0 })]);
  assert.equal(r.filas.length, 0); // 0 no es precio válido → descartada
  assert.ok(r.alertas.some((a) => /descart/i.test(a)));
});

test("alerta si precio_con_iva < precio", () => {
  const r = validarFilas([base({ nombre: "Z", precio: 100, precio_con_iva: 90 })]);
  assert.equal(r.filas.length, 1);
  assert.ok(r.alertas.some((a) => /IVA/i.test(a)));
});

test("alerta moneda desconocida (null)", () => {
  const r = validarFilas([base({ nombre: "Z", precio: 5, moneda: null })]);
  assert.ok(r.alertas.some((a) => /moneda/i.test(a)));
});

test("sin filas válidas devuelve alerta general", () => {
  const r = validarFilas([]);
  assert.equal(r.filas.length, 0);
  assert.ok(r.alertas.length >= 1);
});

test("no confunde un codigo con un nombre igual (dedupe por namespace)", () => {
  const r = validarFilas([
    base({ codigo: "ABC", nombre: "Producto con codigo ABC", precio: 500 }),
    base({ codigo: null, nombre: "ABC", precio: 999 }),
  ]);
  assert.equal(r.filas.length, 2);
});

test("precio 0 con precio_con_iva valido no se descarta", () => {
  const r = validarFilas([base({ nombre: "X", precio: 0, precio_con_iva: 121 })]);
  assert.equal(r.filas.length, 1);
});
