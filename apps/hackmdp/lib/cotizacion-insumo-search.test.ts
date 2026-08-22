import assert from "node:assert/strict";
import { test } from "node:test";
import { splitSearchWords, getFilterWords } from "./cotizacion-insumo-search";

test("splitSearchWords: trim, lowercase y split por espacios", () => {
  assert.deepEqual(splitSearchWords("  Absol  T4 "), ["absol", "t4"]);
  assert.deepEqual(splitSearchWords(""), []);
  assert.deepEqual(splitSearchWords("ABSOL"), ["absol"]);
});

test("getFilterWords: la palabra que matchea un equipo no es palabra-filtro", () => {
  const equipos = [{ id: "1", marca: "Absol", modelo: "Reader" }];
  assert.deepEqual(getFilterWords(["absol", "t4"], equipos), ["t4"]);
});

test("getFilterWords: una sola palabra que matchea equipo -> sin filtro", () => {
  const equipos = [{ id: "1", marca: "Absol", modelo: null }];
  assert.deepEqual(getFilterWords(["absol"], equipos), []);
});

test("getFilterWords: ningún equipo matchea -> todas son palabras-filtro", () => {
  assert.deepEqual(getFilterWords(["absol", "t4"], []), ["absol", "t4"]);
});

test("getFilterWords: también matchea contra modelo", () => {
  const equipos = [{ id: "1", marca: "Mindray", modelo: "BC-3000" }];
  assert.deepEqual(getFilterWords(["bc-3000", "reactivo"], equipos), ["reactivo"]);
});
