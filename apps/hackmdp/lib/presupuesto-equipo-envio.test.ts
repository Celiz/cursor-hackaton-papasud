import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizarTelefonoWa, mimeTypePorExtension } from "./presupuesto-equipo-envio";

test("normalizarTelefonoWa: celular argentino sin prefijo -> 549...", () => {
  assert.equal(normalizarTelefonoWa("2235633653"), "5492235633653");
});

test("normalizarTelefonoWa: con formato (espacios, guiones, +) -> solo dígitos", () => {
  assert.equal(normalizarTelefonoWa("+54 9 223 563-3653"), "5492235633653");
  assert.equal(normalizarTelefonoWa("0223 15 563-3653"), "5492235633653");
});

test("normalizarTelefonoWa: ya normalizado se mantiene", () => {
  assert.equal(normalizarTelefonoWa("5492235633653"), "5492235633653");
});

test("normalizarTelefonoWa: toma el primero de un array", () => {
  assert.equal(normalizarTelefonoWa(["2235633653", "otro"]), "5492235633653");
});

test("normalizarTelefonoWa: vacío o sin dígitos suficientes -> null", () => {
  assert.equal(normalizarTelefonoWa(""), null);
  assert.equal(normalizarTelefonoWa(null), null);
  assert.equal(normalizarTelefonoWa(undefined), null);
  assert.equal(normalizarTelefonoWa([]), null);
  assert.equal(normalizarTelefonoWa("123"), null);
});

test("mimeTypePorExtension: reconoce los tipos que se adjuntan", () => {
  assert.equal(mimeTypePorExtension("Presupuesto.pdf"), "application/pdf");
  assert.equal(mimeTypePorExtension("folleto.PDF"), "application/pdf");
  assert.equal(mimeTypePorExtension("foto.jpg"), "image/jpeg");
  assert.equal(mimeTypePorExtension("foto.jpeg"), "image/jpeg");
  assert.equal(mimeTypePorExtension("img.png"), "image/png");
  assert.equal(mimeTypePorExtension("doc.docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
});

test("mimeTypePorExtension: desconocido -> octet-stream", () => {
  assert.equal(mimeTypePorExtension("archivo.xyz"), "application/octet-stream");
  assert.equal(mimeTypePorExtension("sinextension"), "application/octet-stream");
});

test("normalizarTelefonoWa: CABA (área 11) con 15 -> 549 + 11 + abonado", () => {
  assert.equal(normalizarTelefonoWa("011 15 4123-4567"), "5491141234567");
  assert.equal(normalizarTelefonoWa("+54 9 11 4123-4567"), "5491141234567");
});

test("normalizarTelefonoWa: CABA sin 15 (10 dígitos locales)", () => {
  assert.equal(normalizarTelefonoWa("1141234567"), "5491141234567");
});

test("normalizarTelefonoWa: demasiados dígitos -> null (no arma un número inválido)", () => {
  assert.equal(normalizarTelefonoWa("54911412345678999"), null);
  assert.equal(normalizarTelefonoWa("112233445566778"), null);
});
