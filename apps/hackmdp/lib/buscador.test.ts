import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizar,
  tokenizar,
  quitarSeparadores,
  coincideBusqueda,
  textoDeFila,
} from "./buscador";

test("normalizar: minúsculas y sin acentos", () => {
  assert.equal(normalizar("MUÑOZ, José Ángel"), "munoz, jose angel");
  assert.equal(normalizar(""), "");
});

test("tokenizar: parte en palabras y descarta espacios de más", () => {
  assert.deepEqual(tokenizar("  Luis   CORDERO "), ["luis", "cordero"]);
  assert.deepEqual(tokenizar(""), []);
  assert.deepEqual(tokenizar("   "), []);
});

test("quitarSeparadores: deja solo letras y números", () => {
  assert.equal(quitarSeparadores("cordero, luis raul"), "corderoluisraul");
  assert.equal(quitarSeparadores("27-12232221-7"), "27122322217");
});

test("coincideBusqueda: el orden de las palabras no importa", () => {
  const texto = "CORDERO, LUIS RAUL";
  assert.equal(coincideBusqueda(texto, "cordero luis"), true);
  assert.equal(coincideBusqueda(texto, "luis cordero"), true);
  assert.equal(coincideBusqueda(texto, "cordero, luis"), true);
});

test("coincideBusqueda: la coma no rompe la coincidencia", () => {
  // El bug original: "cordero luis" no encontraba "CORDERO, LUIS RAUL"
  // porque el ILIKE contiguo chocaba contra la coma.
  assert.equal(coincideBusqueda("CORDERO, LUIS RAUL", "cordero luis"), true);
});

test("coincideBusqueda: encuentra a través del espacio faltante", () => {
  // "pablo desinglau" tiene que encontrar "DE SINGLAU PABLO DANIEL"
  assert.equal(
    coincideBusqueda("DE SINGLAU PABLO DANIEL", "pablo desinglau"),
    true,
  );
});

test("coincideBusqueda: ignora acentos en los dos lados", () => {
  assert.equal(coincideBusqueda("MUÑOZ, JORGE", "munoz"), true);
  assert.equal(coincideBusqueda("MUNOZ, JORGE", "muñoz"), true);
});

test("coincideBusqueda: coincidencia parcial de palabra", () => {
  assert.equal(coincideBusqueda("LABORATORIO CONCORDIA", "cord"), true);
});

test("coincideBusqueda: falta una palabra => no coincide", () => {
  assert.equal(coincideBusqueda("CORDERO, LUIS RAUL", "cordero rosa"), false);
});

test("coincideBusqueda: consulta vacía coincide con todo", () => {
  assert.equal(coincideBusqueda("lo que sea", ""), true);
  assert.equal(coincideBusqueda("lo que sea", "   "), true);
});

test("coincideBusqueda: texto vacío no coincide con una consulta real", () => {
  assert.equal(coincideBusqueda("", "cordero"), false);
});

test("textoDeFila: aplana objetos anidados a un solo texto", () => {
  const fila = {
    nombre: "CORDERO, LUIS RAUL",
    identificador_unico: 1421,
    localidad: null,
    cliente: { nombre_fantasia: "PIAGGIO ROSA ANGELA" },
    tags: [{ nombre: "Bioquimica" }],
    activo: true,
  };
  const texto = textoDeFila(fila);
  assert.ok(texto.includes("CORDERO, LUIS RAUL"));
  assert.ok(texto.includes("1421"));
  assert.ok(texto.includes("PIAGGIO ROSA ANGELA"));
  assert.ok(texto.includes("Bioquimica"));
});

test("coincideBusqueda sobre textoDeFila: palabras de campos distintos", () => {
  const fila = { nombre: "CORDERO, LUIS RAUL", localidad: "SANTA ELENA" };
  assert.equal(coincideBusqueda(textoDeFila(fila), "cordero santa"), true);
});
