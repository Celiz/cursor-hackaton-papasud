import assert from "node:assert/strict";
import { test } from "node:test";
import { probabilidadDeEtapa, PROBABILIDAD_POR_ETAPA } from "./probabilidad-etapa";

test("etapas reales devuelven su probabilidad del mapa", () => {
  assert.equal(probabilidadDeEtapa("nuevo"), PROBABILIDAD_POR_ETAPA.nuevo);
  assert.equal(probabilidadDeEtapa("propuesta"), PROBABILIDAD_POR_ETAPA.propuesta);
  assert.equal(probabilidadDeEtapa("logistica"), PROBABILIDAD_POR_ETAPA.logistica);
  assert.equal(probabilidadDeEtapa("interesados a futuro"), PROBABILIDAD_POR_ETAPA["interesados a futuro"]);
  assert.equal(probabilidadDeEtapa("ganado"), 100);
});

test("perdido = 0 (no cae al default por ser falsy)", () => {
  assert.equal(probabilidadDeEtapa("perdido"), 0);
});

test("etapa desconocida / vacía / null → default 10", () => {
  assert.equal(probabilidadDeEtapa("lead"), 10); // la clave fantasma vieja del form
  assert.equal(probabilidadDeEtapa(""), 10);
  assert.equal(probabilidadDeEtapa(null), 10);
  assert.equal(probabilidadDeEtapa(undefined), 10);
});

test("ramp monótono creciente y anclado a la tasa real ~88% (techo en logística)", () => {
  const { nuevo, propuesta, logistica } = PROBABILIDAD_POR_ETAPA;
  assert.ok(nuevo < propuesta && propuesta < logistica, "debe subir nuevo<propuesta<logistica");
  assert.ok(logistica >= 80 && logistica <= 90, "la última etapa abierta cerca del 88% real");
  assert.ok(PROBABILIDAD_POR_ETAPA["interesados a futuro"] < nuevo, "interesados a futuro = parking, más bajo");
});
