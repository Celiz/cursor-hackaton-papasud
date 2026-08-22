import assert from "node:assert/strict";
import { test } from "node:test";
import { esFormatoVitis, parseVitis } from "./vitis";

// Fixture representativo de la estructura real (banner, productos arriba del header,
// header repetido, categorías, especificaciones, código numérico, precio decimal,
// y un duplicado como el que trae la sección "NUEVO PRODUCTO").
const rows: unknown[][] = [
  ["VITIS", "", "", "2026-07-03 00:00:00"], // banner (col precio = fecha)
  ["", "NUEVO PRODUCTO", "", ""],           // categoría
  ["HL25tp", "Tubos descartables…", "Caja x 2000", 111], // producto arriba del header
  [8000, "CUCHILLAS PARA MICRÓTOMO, perfil bajo", "disp.x50", 152000], // código numérico
  ["", "", "", ""],                         // vacía
  ["CODIGO", "DESCRIPCIÓN", "Embalaje", "Unitario"], // header
  ["HMAest", "HISOPO Madera+Algodón", "Caja x500", 82.4], // precio decimal
  ["", "TUBOS CON ADITIVOS", "", ""],       // categoría (solo desc)
  ["", "Autoclavable a 121ºC.", "", ""],    // especificación (solo desc)
  ["CODIGO", "DESCRIPCIÓN", "Embalaje", "Unitario"], // header repetido
  [8000, "CUCHILLAS PARA MICRÓTOMO, perfil bajo", "disp.x50", 152000], // DUPLICADO de 8000
  ["B203", "Balanza de precisión 200g", "c/u", 520200],
];

test("detecta el formato Vitis por el banner", () => {
  assert.equal(esFormatoVitis(rows), true);
});

test("no detecta como Vitis un Excel de otro proveedor", () => {
  assert.equal(esFormatoVitis([["Gematec", "Lista"], [1, "x", null, 50]]), false);
});

const filas = parseVitis(rows);
const find = (c: string) => filas.find((f) => f.codigo === c);

test("extrae sólo productos (código + descripción + precio), sin banner/headers/categorías", () => {
  assert.equal(filas.length, 4); // HL25tp, 8000, HMAest, B203 (8000 duplicado colapsa)
  assert.equal(find("VITIS"), undefined);
  assert.equal(filas.some((f) => /^codigo$/i.test(f.codigo)), false);
});

test("deduplica códigos repetidos (sección NUEVO PRODUCTO)", () => {
  assert.equal(filas.filter((f) => f.codigo === "8000").length, 1);
});

test("incluye productos arriba del header y códigos numéricos", () => {
  assert.equal(find("HL25tp")?.precio, 111);
  assert.equal(find("8000")?.codigo, "8000"); // número → string
  assert.equal(find("8000")?.nombre, "CUCHILLAS PARA MICRÓTOMO, perfil bajo");
});

test("no toma la fecha del banner como precio y respeta decimales", () => {
  assert.equal(find("HMAest")?.precio, 82.4);
  for (const f of filas) assert.ok(f.precio > 0 && f.precio < 1e9, `precio absurdo en ${f.codigo}`);
});

test("todas netas (descuento 0)", () => {
  for (const f of filas) assert.equal(f.descuento, 0);
});
