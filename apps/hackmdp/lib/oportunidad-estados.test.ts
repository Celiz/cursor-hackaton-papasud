import assert from "node:assert/strict";
import {
  ESTADOS_ABIERTOS,
  ESTADOS_CERRADOS,
  ESTADOS_GANADOS,
  esAbierta,
  esCerrada,
  esGanada,
} from "./oportunidad-estados";

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

// El bug que motivó este módulo: el filtro de "abiertas" era
// estado NOT IN (finalizado,perdido,cancelado), que NO excluye ganado.
// Las 108 ganadas se contaban como pipeline abierto Y como ganadas a la vez,
// inflando el pipeline de 91 a 199 oportunidades.
test("una oportunidad ganada NO es abierta", () => {
  assert.equal(esAbierta("ganado"), false);
  assert.equal(esGanada("ganado"), true);
});

test("abierta y ganada son mutuamente excluyentes en todos los estados reales", () => {
  for (const estado of ["abierto", "ganado", "perdido", "cancelado", "finalizado"]) {
    assert.equal(
      esAbierta(estado) && esGanada(estado),
      false,
      `${estado} cae en las dos categorías`
    );
  }
});

test("sólo abierto es abierta", () => {
  assert.equal(esAbierta("abierto"), true);
  assert.equal(esAbierta("perdido"), false);
  assert.equal(esAbierta("cancelado"), false);
  assert.equal(esAbierta("finalizado"), false);
});

test("finalizado sigue contando como ganada, aunque hoy no haya filas", () => {
  assert.equal(esGanada("finalizado"), true);
});

test("cancelado no es abierta ni cerrada: no llegó a decidirse", () => {
  assert.equal(esAbierta("cancelado"), false);
  assert.equal(esCerrada("cancelado"), false);
});

test("cerradas = ganadas + perdidas", () => {
  assert.equal(esCerrada("ganado"), true);
  assert.equal(esCerrada("perdido"), true);
  assert.deepEqual(
    [...ESTADOS_CERRADOS].sort(),
    [...ESTADOS_GANADOS, "perdido"].sort()
  );
});

test("un estado desconocido no es abierta ni ganada ni cerrada", () => {
  assert.equal(esAbierta("cualquier_cosa"), false);
  assert.equal(esGanada("cualquier_cosa"), false);
  assert.equal(esCerrada("cualquier_cosa"), false);
});

test("null y undefined no rompen", () => {
  assert.equal(esAbierta(null), false);
  assert.equal(esAbierta(undefined), false);
});

test("los arreglos son los que se pasan a Postgres con = ANY()", () => {
  assert.deepEqual([...ESTADOS_ABIERTOS], ["abierto"]);
});

console.log(`\n${pasaron} tests OK`);
