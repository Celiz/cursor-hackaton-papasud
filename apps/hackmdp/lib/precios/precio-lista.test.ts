import assert from "node:assert/strict";
import { test } from "node:test";
import { clasificarPrecioLista } from "./precio-lista";

test("sin excepción usa el margen global de la lista", () => {
  const r = clasificarPrecioLista({ lista_precio_fijo: null, lista_margen_override: null }, 25);
  assert.deepEqual(r, { tipo: "global", esExcepcion: false, margenEfectivo: 25 });
});

test("precio_fijo => excepción fija, sin margen", () => {
  const r = clasificarPrecioLista({ lista_precio_fijo: 250, lista_margen_override: null }, 25);
  assert.deepEqual(r, { tipo: "fijo", esExcepcion: true, margenEfectivo: null });
});

test("margen_override => excepción de margen", () => {
  const r = clasificarPrecioLista({ lista_precio_fijo: null, lista_margen_override: 18 }, 25);
  assert.deepEqual(r, { tipo: "margen", esExcepcion: true, margenEfectivo: 18 });
});

test("precio_fijo gana sobre margen_override si vinieran ambos", () => {
  const r = clasificarPrecioLista({ lista_precio_fijo: 100, lista_margen_override: 18 }, 25);
  assert.deepEqual(r, { tipo: "fijo", esExcepcion: true, margenEfectivo: null });
});

test("precio_fijo = 0 => excepción fija (producto gratis)", () => {
  const r = clasificarPrecioLista({ lista_precio_fijo: 0 }, 25);
  assert.deepEqual(r, { tipo: "fijo", esExcepcion: true, margenEfectivo: null });
});

test("acepta strings de PG (numeric serializado)", () => {
  const r = clasificarPrecioLista({ lista_precio_fijo: null, lista_margen_override: "18.00" }, 25);
  assert.deepEqual(r, { tipo: "margen", esExcepcion: true, margenEfectivo: 18 });
});

test("fila vacía cae en global con el margen dado", () => {
  const r = clasificarPrecioLista({}, 30);
  assert.deepEqual(r, { tipo: "global", esExcepcion: false, margenEfectivo: 30 });
});
