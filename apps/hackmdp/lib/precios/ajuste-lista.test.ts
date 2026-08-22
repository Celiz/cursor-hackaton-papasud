import assert from "node:assert/strict";
import { test } from "node:test";
import { factorAjuste, precioConAjuste } from "./ajuste-lista";

test("factorAjuste con signo", () => {
  assert.equal(factorAjuste(10), 1.1);
  assert.equal(factorAjuste(-5), 0.95);
  assert.equal(factorAjuste(0), 1);
  assert.equal(factorAjuste(null), 1);
  assert.equal(factorAjuste("12,5".replace(",", ".")), 1.125);
});

test("precioConAjuste redondea a 2 decimales", () => {
  assert.equal(precioConAjuste(100, 10), 110);
  assert.equal(precioConAjuste(100, -10), 90);
  assert.equal(precioConAjuste(33.33, 21), 40.33);
});
