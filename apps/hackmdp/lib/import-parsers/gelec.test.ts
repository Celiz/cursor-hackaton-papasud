import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { esFormatoGelec, parseGelec } from "./gelec";

const fixture = readFileSync(
  new URL("./__fixtures__/gelec-93.txt", import.meta.url),
  "utf-8"
);

const filas = parseGelec(fixture);
const find = (codigo: string) => filas.find((f) => f.codigo === codigo);
const precio = (codigo: string) => find(codigo)?.precio;

test("detecta el formato Gelec", () => {
  assert.equal(esFormatoGelec(fixture), true);
});

test("no confunde una lista GEMATEC con Gelec", () => {
  const gematec =
    "Precio de Lista\nPlan de Ahorro\nCONTADO ANTICIPADO\nMODELO USD 1000";
  assert.equal(esFormatoGelec(gematec), false);
});

test("precio en la misma línea que el código", () => {
  assert.equal(precio("G-142"), 1082000);
  assert.equal(precio("G-142D"), 1302000);
});

test("precio que flota debajo de una descripción multilínea", () => {
  // G-146DS: el código está varias líneas abajo del título y el precio
  // aparece en la línea siguiente, en la columna de precios.
  assert.equal(precio("G-146DS"), 1980000);
  // G-234D: precio flota una línea debajo del código.
  assert.equal(precio("G-234D"), 1896000);
});

test("rotores con precio dos líneas debajo del código", () => {
  assert.equal(precio("G-1615"), 282000);
  assert.equal(precio("G-2415"), 282000);
  assert.equal(precio("G-3015"), 355000);
  assert.equal(precio("GP-100"), 1066000);
});

test("código sin guion (GRPT50 / GRPT50C)", () => {
  assert.equal(precio("GRPT50"), 50000);
  assert.equal(precio("GRPT50C"), 33000);
});

test("repuestos con precio en la misma línea", () => {
  assert.equal(precio("G-RT30"), 96000);
  assert.equal(precio("G-ADKH"), 1800); // precio chico de 4 cifras
  assert.equal(precio("G-CONT142D"), 365000);
  assert.equal(precio("G-ARO-GR"), 8000); // código con dos guiones
});

test("repuesto con código a la izquierda y precio en la misma línea pese a descripción partida", () => {
  // G-RPT16A: la descripción está partida arriba/abajo, código+precio en la línea del medio.
  assert.equal(precio("G-RPT16A"), 79000);
});

test("descarta productos con 'Fabricación suspendida'", () => {
  assert.equal(find("G-128"), undefined);
  assert.equal(find("G-82"), undefined);
});

test("G-426DS: toma el precio que flota ARRIBA del código, no el adicional de gradillas", () => {
  // $ 4.899.000,00 está una línea por encima de "G-426DS"; el "juego de 4 gradillas
  // adicional" ($ 202.000) no tiene código propio y debe descartarse.
  assert.equal(precio("G-426DS"), 4899000);
  assert.equal(
    filas.some((f) => f.precio === 202000),
    false
  );
});

test("todas las filas son netas (descuento 0), con precio > 0 y código que empieza con G", () => {
  for (const f of filas) {
    assert.equal(f.descuento, 0);
    assert.ok(f.precio > 0, `precio inválido en ${f.codigo}`);
    assert.match(f.codigo, /^G/i);
  }
});

test("extrae el catálogo completo (60 códigos, 2 suspendidos => 58 filas)", () => {
  assert.equal(filas.length, 58);
});

const categoria = (codigo: string) => find(codigo)?.categoria;

test("clasifica las centrífugas como 'equipo'", () => {
  for (const c of ["G-142", "G-146DS", "G-112", "G-234D", "G-426DS", "G-72", "G-72D", "G-72DS"]) {
    assert.equal(categoria(c), "equipo", `${c} debería ser equipo`);
  }
});

test("clasifica rotores/cabezales (sección 'Rotores intercambiables') como 'insumo'", () => {
  for (const c of ["G-1615", "G-2415", "G-450", "G-650", "G-3015", "G-487", "GP-100", "G-1524", "G-536"]) {
    assert.equal(categoria(c), "insumo", `${c} debería ser insumo`);
  }
});

test("clasifica repuestos (sección 'Repuestos Gelec') como 'insumo'", () => {
  for (const c of ["G-RT30", "G-ADKH", "G-MOT", "GRPT50", "G-ARO-GR", "G-CONT142D"]) {
    assert.equal(categoria(c), "insumo", `${c} debería ser insumo`);
  }
});

test("conteo por categoría: 11 equipo / 47 insumo", () => {
  assert.equal(filas.filter((f) => f.categoria === "equipo").length, 11);
  assert.equal(filas.filter((f) => f.categoria === "insumo").length, 47);
});
