import assert from "node:assert/strict";
import {
  agruparTotalesPorMoneda,
  esMixto,
  monedaDominante,
  normalizarMoneda,
  type LineaPresupuestoEquipo,
} from "./presupuesto-equipo-totales";

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

// Caso del bug reportado: 3 equipos, 2 en USD y 1 en ARS.
const MIXTO: LineaPresupuestoEquipo[] = [
  { subtotal: 1000, ivaPorcentaje: 10.5, moneda: "USD" },
  { subtotal: 800, ivaPorcentaje: 10.5, moneda: "USD" },
  { subtotal: 500000, ivaPorcentaje: 21, moneda: "ARS" },
];

test("monedas mezcladas → un total por moneda, sin sumar entre sí", () => {
  const t = agruparTotalesPorMoneda(MIXTO);
  assert.equal(t.length, 2);
  assert.equal(esMixto(t), true);
  // USD primero (orden estable)
  assert.equal(t[0].moneda, "USD");
  assert.equal(t[0].subtotal, 1800);
  assert.equal(t[0].iva, 1800 * 0.105);
  assert.equal(t[0].total, 1800 + 1800 * 0.105);
  // ARS segundo
  assert.equal(t[1].moneda, "ARS");
  assert.equal(t[1].subtotal, 500000);
  assert.equal(t[1].iva, 500000 * 0.21);
  assert.equal(t[1].total, 500000 + 500000 * 0.21);
});

test("una sola moneda → un solo grupo, no mixto", () => {
  const t = agruparTotalesPorMoneda([
    { subtotal: 1000, ivaPorcentaje: 10.5, moneda: "USD" },
    { subtotal: 800, ivaPorcentaje: 21, moneda: "USD" },
  ]);
  assert.equal(t.length, 1);
  assert.equal(esMixto(t), false);
  assert.equal(t[0].moneda, "USD");
  assert.equal(t[0].subtotal, 1800);
  assert.equal(t[0].iva, 1000 * 0.105 + 800 * 0.21);
});

test("moneda dominante = la de mayor total", () => {
  // ARS domina en magnitud nominal (no se convierte; es solo para el header)
  assert.equal(monedaDominante(agruparTotalesPorMoneda(MIXTO)), "ARS");
  assert.equal(monedaDominante([]), null);
});

test("listas vacías → []", () => {
  assert.deepEqual(agruparTotalesPorMoneda([]), []);
  assert.equal(esMixto([]), false);
});

test("valores no finitos no rompen la suma", () => {
  const t = agruparTotalesPorMoneda([
    { subtotal: NaN, ivaPorcentaje: 10.5, moneda: "USD" },
    { subtotal: 100, ivaPorcentaje: NaN, moneda: "USD" },
  ]);
  assert.equal(t.length, 1);
  assert.equal(t[0].subtotal, 100);
  assert.equal(t[0].iva, 0);
  assert.equal(t[0].total, 100);
});

test("normalizarMoneda: null/lowercase/desconocida", () => {
  assert.equal(normalizarMoneda(null), "USD");
  assert.equal(normalizarMoneda("ars"), "ARS");
  assert.equal(normalizarMoneda("usd"), "USD");
  assert.equal(normalizarMoneda("eur", "ARS"), "ARS");
});

console.log(`\n${pasaron} pruebas OK`);
