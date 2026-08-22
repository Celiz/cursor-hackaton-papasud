import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveGanancia, costoEnMoneda, cardSubtotal, lineasATotales } from "./equipo-lineas";

test("deriveGanancia: (precio/costo - 1)*100, 2 decimales; vacío si falta dato", () => {
  assert.equal(deriveGanancia(130, 100), "30.00");
  assert.equal(deriveGanancia(0, 100), "");
  assert.equal(deriveGanancia(130, 0), "");
});

test("costoEnMoneda: misma moneda no convierte; USD→ARS multiplica por cotización", () => {
  const equipoUsd = { precio_costo: 100, moneda_compra: "USD" } as any;
  assert.equal(costoEnMoneda(equipoUsd, "USD", 1000), 100);
  assert.equal(costoEnMoneda(equipoUsd, "ARS", 1000), 100000);
  // ARS→USD divide; sin cotización (0) no convierte
  const equipoArs = { precio_costo: 50000, moneda_compra: "ARS" } as any;
  assert.equal(costoEnMoneda(equipoArs, "USD", 1000), 50);
  assert.equal(costoEnMoneda(equipoArs, "USD", 0), 50000);
  // costo 0 → 0
  assert.equal(costoEnMoneda({ precio_costo: 0 } as any, "ARS", 1000), 0);
});

test("cardSubtotal: cantidad × precio × (1 − desc%)", () => {
  assert.equal(cardSubtotal({ cantidad: 2, precio_unitario: 100, descuento_porcentaje: 10 }), 180);
  assert.equal(cardSubtotal({ cantidad: 1, precio_unitario: 100, descuento_porcentaje: 0 }), 100);
});

test("lineasATotales: agrupa por moneda de la línea, IVA por línea, sin convertir", () => {
  const lineas = [
    { id: "a", moneda: "USD", cantidad: 1, precio_unitario: 1000, descuento_porcentaje: 0, iva_porcentaje: 10.5 },
    { id: "b", moneda: "ARS", cantidad: 1, precio_unitario: 50000, descuento_porcentaje: 0, iva_porcentaje: 21 },
  ] as any;
  const t = lineasATotales(lineas);
  assert.equal(t.length, 2);
  assert.equal(t[0].moneda, "USD"); // USD primero
  assert.equal(t[0].subtotal, 1000);
  assert.equal(t[0].total, 1105);
  assert.equal(t[1].moneda, "ARS");
  assert.equal(t[1].total, 60500);
});
