import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { archivoATexto, archivoAChunks, listarHojas } from "./ia-extractor";

test("archivoATexto convierte un xlsx a CSV con encabezado de hoja", async () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["codigo", "precio"], ["A1", 10], ["A2", 20]]);
  XLSX.utils.book_append_sheet(wb, ws, "Lista1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const texto = await archivoATexto("lista.xlsx", buf);
  assert.match(texto, /### Hoja: Lista1/);
  assert.match(texto, /codigo,precio/);
  assert.match(texto, /A1,10/);
});

test("archivoATexto maneja csv como texto plano", async () => {
  const texto = await archivoATexto("x.csv", Buffer.from("cod,precio\nB,5", "utf8"));
  assert.match(texto, /cod,precio/);
  assert.match(texto, /B,5/);
});

test("archivoAChunks: un chunk por hoja no vacía", async () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["cod", "precio"], ["A", 1]]), "H1");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["cod", "precio"], ["B", 2]]), "H2");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const chunks = await archivoAChunks("l.xlsx", buf);
  assert.equal(chunks.length, 2);
  assert.match(chunks[0].texto, /### Hoja: H1/);
  assert.match(chunks[0].etiqueta, /H1/);
});

test("archivoAChunks: csv es un solo chunk", async () => {
  const chunks = await archivoAChunks("x.csv", Buffer.from("cod,precio\nZ,9", "utf8"));
  assert.equal(chunks.length, 1);
  assert.match(chunks[0].texto, /Z,9/);
});

test("listarHojas devuelve los nombres de hoja del xlsx", () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["a"]]), "Uno");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["b"]]), "Dos");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  assert.deepEqual(listarHojas("x.xlsx", buf), ["Uno", "Dos"]);
  assert.deepEqual(listarHojas("x.csv", Buffer.from("a")), []);
});

test("archivoAChunks filtra por hojas seleccionadas", async () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["cod","precio"],["A",1]]), "Precios");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["cod","precio"],["B",2]]), "Planes");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const chunks = await archivoAChunks("l.xlsx", buf, ["Precios"]);
  assert.equal(chunks.length, 1);
  assert.match(chunks[0].etiqueta, /Precios/);
});
