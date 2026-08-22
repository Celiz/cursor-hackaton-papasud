import assert from "node:assert/strict";
import { test } from "node:test";
import { construirPrompt, parseSobreLLM } from "./ia-sobre";
import { aNumero } from "./ia-tipos";

test("aNumero tolera es-AR, US y símbolos de moneda", () => {
  assert.equal(aNumero("$ 1.234,50"), 1234.5);
  assert.equal(aNumero("US$ 3.548"), 3548);
  assert.equal(aNumero("1234.5"), 1234.5);
  assert.equal(aNumero("1.234.567"), 1234567);
  assert.equal(aNumero(4615857), 4615857);
  assert.equal(aNumero("s/d"), null);
  assert.equal(aNumero(""), null);
});

test("construirPrompt incluye el texto y pide JSON estricto con los campos", () => {
  const { system, user } = construirPrompt("### Hoja: L\ncod,precio\nA,10", { tipo: "equipos" });
  assert.match(system, /JSON/);
  assert.match(system, /precio_con_iva/);
  assert.match(system, /moneda/);
  assert.match(user, /### Hoja: L/);
});

test("parseSobreLLM parsea JSON limpio", () => {
  const raw = '{"filas":[{"codigo":"EQ1","nombre":"Analizador","descripcion":null,"precio":100,"precio_con_iva":121,"moneda":"ARS","categoria":"equipo"}]}';
  const filas = parseSobreLLM(raw);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].codigo, "EQ1");
  assert.equal(filas[0].precio, 100);
  assert.equal(filas[0].moneda, "ARS");
});

test("parseSobreLLM saca code fences y espacios", () => {
  const raw = "```json\n{\"filas\":[{\"nombre\":\"X\",\"precio\":5}]}\n```";
  const filas = parseSobreLLM(raw);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].nombre, "X");
  assert.equal(filas[0].precio, 5);
  assert.equal(filas[0].codigo, null); // faltantes → null
});

test("parseSobreLLM coerce precios string es-AR y normaliza moneda", () => {
  const raw = '{"filas":[{"nombre":"Y","precio":"$ 1.234,50","moneda":"pesos"}]}';
  const filas = parseSobreLLM(raw);
  assert.equal(filas[0].precio, 1234.5);
  assert.equal(filas[0].moneda, "ARS");
});

test("parseSobreLLM tira error si el JSON es inválido", () => {
  assert.throws(() => parseSobreLLM("no soy json"));
});
