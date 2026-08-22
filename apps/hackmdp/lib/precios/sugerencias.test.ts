import assert from "node:assert/strict";
import { test } from "node:test";
import { textoSugerencia, porcentajeMatch } from "./sugerencias";

test("texto de búsqueda = nombre del proveedor cuando aporta", () => {
  assert.equal(
    textoSugerencia({ codigo_proveedor: "G-RT30", nombre_proveedor: "Timer mecánico para macrocentrífuga" }),
    "Timer mecánico para macrocentrífuga"
  );
});

test("cae al código si el nombre está vacío", () => {
  assert.equal(textoSugerencia({ codigo_proveedor: "G-RT30", nombre_proveedor: "" }), "G-RT30");
  assert.equal(textoSugerencia({ codigo_proveedor: "G-RT30", nombre_proveedor: null }), "G-RT30");
});

test("cae al código si el nombre es igual al código (no aporta)", () => {
  assert.equal(textoSugerencia({ codigo_proveedor: "G-RPT16A", nombre_proveedor: "G-RPT16A" }), "G-RPT16A");
});

test("porcentaje de match redondea el score 0..1", () => {
  assert.equal(porcentajeMatch(0.75), "75%");
  assert.equal(porcentajeMatch(0.726), "73%");
  assert.equal(porcentajeMatch(0.2), "20%");
});

test("porcentaje clampea fuera de rango", () => {
  assert.equal(porcentajeMatch(1.4), "100%");
  assert.equal(porcentajeMatch(-0.1), "0%");
});
