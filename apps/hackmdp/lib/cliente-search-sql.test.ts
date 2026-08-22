import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTokenSearchClause,
  buildClienteSearchClause,
} from "./cliente-search-sql";

test("buildTokenSearchClause: null si no hay nada que buscar", () => {
  assert.equal(buildTokenSearchClause(["nombre"], "", "p.", 2), null);
  assert.equal(buildTokenSearchClause(["nombre"], "   ", "p.", 2), null);
});

test("buildTokenSearchClause: dos parámetros por palabra", () => {
  const clause = buildTokenSearchClause(["nombre", "email"], "luis cordero", "p.", 2);
  assert.ok(clause);
  assert.equal(clause.params.length, 4);
  assert.deepEqual(clause.params, ["%luis%", "%luis%", "%cordero%", "%cordero%"]);
  assert.equal(clause.nextParam, 6);
});

test("buildTokenSearchClause: usa el prefijo y las columnas dadas", () => {
  const clause = buildTokenSearchClause(["nombre", "apellido"], "cordero", "p.", 2);
  assert.ok(clause);
  assert.ok(clause.sql.includes("p.nombre"));
  assert.ok(clause.sql.includes("p.apellido"));
  assert.ok(clause.sql.includes("unaccent"));
});

test("buildTokenSearchClause: las palabras se combinan con AND", () => {
  const clause = buildTokenSearchClause(["nombre"], "luis cordero", "p.", 2);
  assert.ok(clause);
  assert.ok(clause.sql.includes(" AND "));
});

test("buildClienteSearchClause: CLI-1006 va por match exacto del legacy", () => {
  const clause = buildClienteSearchClause("CLI-1006", "c.", 2);
  assert.ok(clause);
  assert.equal(clause.sql, "(c.identificador_legacy = $2)");
  assert.deepEqual(clause.params, ["1006"]);
});

test("buildClienteSearchClause: un número suelto también matchea el identificador", () => {
  const clause = buildClienteSearchClause("1421", "c.", 2);
  assert.ok(clause);
  assert.ok(clause.sql.includes("c.identificador_unico ="));
  assert.ok(clause.params.includes(1421));
});

test("buildClienteSearchClause: sigue devolviendo null con búsqueda vacía", () => {
  assert.equal(buildClienteSearchClause("  ", "c.", 2), null);
});

test("buildTokenSearchClause: escapa el guión bajo de LIKE en la palabra", () => {
  const clause = buildTokenSearchClause(["nombre"], "lab_ratorio", "p.", 2);
  assert.ok(clause);
  // El guión bajo matchea cualquier carácter en LIKE si no se escapa: sin el
  // escape, "lab_ratorio" encontraría también "laboratorio".
  assert.equal(clause.params[0], "%lab\\_ratorio%");
  assert.ok(clause.sql.includes("ESCAPE '\\'"));
});

test("buildTokenSearchClause: escapa el porcentaje de LIKE en la palabra", () => {
  const clause = buildTokenSearchClause(["nombre"], "juan%perez", "p.", 2);
  assert.ok(clause);
  assert.equal(clause.params[0], "%juan\\%perez%");
});
