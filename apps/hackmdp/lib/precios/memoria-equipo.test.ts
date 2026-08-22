import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizarCodigoProveedor, construirMemoriaEquipos, recordarEquipo } from "./memoria-equipo";

test("normaliza el código: trim, whitespace interno y mayúsculas", () => {
  assert.equal(normalizarCodigoProveedor("  9351061 "), "9351061");
  assert.equal(normalizarCodigoProveedor("G-142 D"), "g-142d");
  assert.equal(normalizarCodigoProveedor("Ab\tCd"), "abcd");
  assert.equal(normalizarCodigoProveedor(null), "");
  assert.equal(normalizarCodigoProveedor("   "), "");
});

test("arma la memoria código → equipo con las filas del proveedor", () => {
  const memoria = construirMemoriaEquipos([
    { codigo_proveedor: "9351061", equipo_id: "eq-cm160" },
    { codigo_proveedor: "9441010", equipo_id: "eq-clia1000" },
  ]);
  assert.equal(memoria.get("9351061"), "eq-cm160");
  assert.equal(memoria.get("9441010"), "eq-clia1000");
});

test("gana la primera fila: vienen ordenadas de más reciente a más vieja", () => {
  // 9351001 se vinculó mal al principio y después se corrigió a mano: manda la corrección.
  const memoria = construirMemoriaEquipos([
    { codigo_proveedor: "9351001", equipo_id: "eq-metrolab-1600dr" },
    { codigo_proveedor: "9351001", equipo_id: "eq-fantasma" },
  ]);
  assert.equal(memoria.get("9351001"), "eq-metrolab-1600dr");
});

test("ignora filas sin equipo o sin código", () => {
  const memoria = construirMemoriaEquipos([
    { codigo_proveedor: "9331051", equipo_id: null },
    { codigo_proveedor: "  ", equipo_id: "eq-1" },
    { codigo_proveedor: null, equipo_id: "eq-2" },
  ]);
  assert.equal(memoria.size, 0);
});

test("recordarEquipo busca normalizando el código de la lista nueva", () => {
  const memoria = construirMemoriaEquipos([{ codigo_proveedor: "G-142D", equipo_id: "eq-g142" }]);
  assert.equal(recordarEquipo(memoria, " g-142 d "), "eq-g142");
  assert.equal(recordarEquipo(memoria, "9999"), null);
  assert.equal(recordarEquipo(memoria, ""), null);
  assert.equal(recordarEquipo(memoria, null), null);
});
