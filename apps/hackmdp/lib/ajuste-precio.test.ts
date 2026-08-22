import assert from "node:assert/strict";
import { pctToFactor, factorToPct, aplicarAjuste, montoAjuste } from "./ajuste-precio";

let pasaron = 0;
function test(nombre: string, fn: () => void) {
  try { fn(); pasaron++; console.log(`  ok  ${nombre}`); }
  catch (e) { console.error(`  FALLA  ${nombre}`); throw e; }
}

test("pctToFactor: -5 → 0.95, +20 → 1.20, 0 → 1", () => {
  assert.equal(pctToFactor(-5), 0.95);
  assert.equal(pctToFactor(20), 1.2);
  assert.equal(pctToFactor(0), 1);
});

test("factorToPct: 0.95 → -5, 1.20 → 20, 1 → 0, null → 0", () => {
  assert.equal(factorToPct(0.95), -5);
  assert.equal(factorToPct(1.2), 20);
  assert.equal(factorToPct(1), 0);
  assert.equal(factorToPct(null), 0);
  assert.equal(factorToPct(undefined), 0);
});

test("factorToPct acepta STRING del DB (numeric llega como string): '0.9500' → -5, '1.2000' → 20, '1.0000' → 0", () => {
  assert.equal(factorToPct("0.9500"), -5);
  assert.equal(factorToPct("1.2000"), 20);
  assert.equal(factorToPct("1.0000"), 0);
  assert.equal(factorToPct(""), 0);
});

test("round-trip pct → factor → pct (incluye string intermedio como el DB)", () => {
  for (const p of [-10, -5, 0, 15, 20]) {
    assert.equal(factorToPct(pctToFactor(p)), p);
    assert.equal(factorToPct(String(pctToFactor(p))), p); // simula el string del DB
  }
});

test("aplicarAjuste: number y string; 1000 con 0.95/'0.95' → 950; con null → 1000", () => {
  assert.equal(aplicarAjuste(1000, 0.95), 950);
  assert.equal(aplicarAjuste(1000, "0.95"), 950);
  assert.equal(aplicarAjuste(1000, 1.2), 1200);
  assert.equal(aplicarAjuste(1000, null), 1000);
});

test("montoAjuste: number y string; 1000 con 0.95/'0.95' → -50; con 1.20 → 200; con 1 → 0", () => {
  assert.equal(montoAjuste(1000, 0.95), -50);
  assert.equal(montoAjuste(1000, "0.95"), -50);
  assert.equal(montoAjuste(1000, 1.2), 200);
  assert.equal(montoAjuste(1000, 1), 0);
});

console.log(`\n${pasaron} tests OK`);
