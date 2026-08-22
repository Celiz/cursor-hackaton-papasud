import assert from "node:assert/strict";
import { test } from "node:test";
import { tipoAdjuntoDesdeMime, normalizarAdjunto, agruparPorItem, type AdjuntoItem } from "./adjuntos";

test("tipoAdjuntoDesdeMime: las imagenes son foto", () => {
  assert.equal(tipoAdjuntoDesdeMime("image/jpeg"), "foto");
  assert.equal(tipoAdjuntoDesdeMime("image/png"), "foto");
  assert.equal(tipoAdjuntoDesdeMime("image/heic"), "foto");
});

test("tipoAdjuntoDesdeMime: el PDF es manual", () => {
  assert.equal(tipoAdjuntoDesdeMime("application/pdf"), "manual");
});

test("tipoAdjuntoDesdeMime: el resto es otro", () => {
  assert.equal(tipoAdjuntoDesdeMime("application/zip"), "otro");
  assert.equal(tipoAdjuntoDesdeMime("text/plain"), "otro");
  assert.equal(tipoAdjuntoDesdeMime(""), "otro");
});

test("normalizarAdjunto: tamano_bytes como string (bigint de pg) se convierte a number", () => {
  const adjunto = normalizarAdjunto({
    id: "1",
    item_ref: "item-1",
    tipo: "foto",
    url: "https://example.com/a.jpg",
    nombre_archivo: "a.jpg",
    tamano_bytes: "123456",
    descripcion: null,
    autor_nombre: "Jose",
    created_at: "2026-07-24T00:00:00.000Z",
  });
  assert.equal(adjunto.tamano_bytes, 123456);
  assert.equal(typeof adjunto.tamano_bytes, "number");
});

test("normalizarAdjunto: tamano_bytes '0' es el number 0, no un string truthy", () => {
  const adjunto = normalizarAdjunto({
    id: "1",
    item_ref: "item-1",
    tipo: "otro",
    url: "https://example.com/a.pdf",
    tamano_bytes: "0",
    created_at: "2026-07-24T00:00:00.000Z",
  });
  assert.equal(adjunto.tamano_bytes, 0);
  assert.ok(adjunto.tamano_bytes === 0);
});

test("normalizarAdjunto: tamano_bytes null queda null", () => {
  const adjunto = normalizarAdjunto({
    id: "1",
    item_ref: "item-1",
    tipo: "otro",
    url: "https://example.com/a.pdf",
    tamano_bytes: null,
    created_at: "2026-07-24T00:00:00.000Z",
  });
  assert.equal(adjunto.tamano_bytes, null);
});

test("normalizarAdjunto: tamano_bytes ausente en la fila queda null", () => {
  const adjunto = normalizarAdjunto({
    id: "1",
    item_ref: "item-1",
    tipo: "otro",
    url: "https://example.com/a.pdf",
    created_at: "2026-07-24T00:00:00.000Z",
  });
  assert.equal(adjunto.tamano_bytes, null);
});

test("normalizarAdjunto: tamano_bytes que ya es number se mantiene igual", () => {
  const adjunto = normalizarAdjunto({
    id: "1",
    item_ref: "item-1",
    tipo: "otro",
    url: "https://example.com/a.pdf",
    tamano_bytes: 4096,
    created_at: "2026-07-24T00:00:00.000Z",
  });
  assert.equal(adjunto.tamano_bytes, 4096);
  assert.equal(typeof adjunto.tamano_bytes, "number");
});

test("normalizarAdjunto: los demas campos pasan directo, los nulleables quedan null si estan ausentes", () => {
  const adjunto = normalizarAdjunto({
    id: "1",
    item_ref: "item-1",
    tipo: "manual",
    url: "https://example.com/a.pdf",
    tamano_bytes: 100,
    created_at: "2026-07-24T00:00:00.000Z",
  });
  assert.equal(adjunto.id, "1");
  assert.equal(adjunto.item_ref, "item-1");
  assert.equal(adjunto.tipo, "manual");
  assert.equal(adjunto.url, "https://example.com/a.pdf");
  assert.equal(adjunto.nombre_archivo, null);
  assert.equal(adjunto.descripcion, null);
  assert.equal(adjunto.autor_nombre, null);
  assert.equal(adjunto.created_at, "2026-07-24T00:00:00.000Z");
});

test("normalizarAdjunto: created_at como Date (timestamptz real de pg) se convierte a ISO string", () => {
  const adjunto = normalizarAdjunto({
    id: "1",
    item_ref: "item-1",
    tipo: "foto",
    url: "https://example.com/a.jpg",
    nombre_archivo: "a.jpg",
    tamano_bytes: "123456",
    descripcion: null,
    autor_nombre: "Jose",
    created_at: new Date("2026-07-24T16:47:18.906Z"),
  });
  assert.equal(adjunto.created_at, "2026-07-24T16:47:18.906Z");
  assert.equal(adjunto.tamano_bytes, 123456);
});

test("normalizarAdjunto: created_at que ya es un string ISO pasa sin cambios", () => {
  const adjunto = normalizarAdjunto({
    id: "1",
    item_ref: "item-1",
    tipo: "foto",
    url: "https://example.com/a.jpg",
    created_at: "2026-07-24T16:47:18.906Z",
  });
  assert.equal(adjunto.created_at, "2026-07-24T16:47:18.906Z");
});

test("agruparPorItem: lista vacia da un Map vacio", () => {
  const porItem = agruparPorItem([]);
  assert.equal(porItem.size, 0);
});

test("agruparPorItem: varios items con varios adjuntos caen en el balde correcto", () => {
  const mk = (item_ref: string, id: string): AdjuntoItem => ({
    id,
    item_ref,
    tipo: "foto",
    url: `https://example.com/${id}.jpg`,
    nombre_archivo: null,
    tamano_bytes: null,
    descripcion: null,
    autor_nombre: null,
    created_at: "2026-07-24T00:00:00.000Z",
  });
  const adjuntos = [
    mk("item-1", "a1"),
    mk("item-2", "b1"),
    mk("item-1", "a2"),
    mk("item-2", "b2"),
    mk("item-1", "a3"),
  ];
  const porItem = agruparPorItem(adjuntos);
  assert.equal(porItem.size, 2);
  assert.deepEqual(
    porItem.get("item-1")?.map((a) => a.id),
    ["a1", "a2", "a3"]
  );
  assert.deepEqual(
    porItem.get("item-2")?.map((a) => a.id),
    ["b1", "b2"]
  );
});

test("agruparPorItem: preserva el orden de entrada dentro de cada balde", () => {
  const mk = (id: string): AdjuntoItem => ({
    id,
    item_ref: "item-1",
    tipo: "manual",
    url: `https://example.com/${id}.pdf`,
    nombre_archivo: null,
    tamano_bytes: null,
    descripcion: null,
    autor_nombre: null,
    created_at: "2026-07-24T00:00:00.000Z",
  });
  const porItem = agruparPorItem([mk("z"), mk("a"), mk("m")]);
  assert.deepEqual(
    porItem.get("item-1")?.map((a) => a.id),
    ["z", "a", "m"]
  );
});

test("agruparPorItem: una clave sintetica eu-<uuid> convive con un uuid comun", () => {
  const mk = (item_ref: string, id: string): AdjuntoItem => ({
    id,
    item_ref,
    tipo: "otro",
    url: `https://example.com/${id}`,
    nombre_archivo: null,
    tamano_bytes: null,
    descripcion: null,
    autor_nombre: null,
    created_at: "2026-07-24T00:00:00.000Z",
  });
  const euKey = "eu-3fa85f64-5717-4562-b3fc-2c963f66afa6";
  const plainKey = "1b2c3d4e-5717-4562-b3fc-2c963f66afa6";
  const porItem = agruparPorItem([mk(euKey, "x1"), mk(plainKey, "y1"), mk(euKey, "x2")]);
  assert.equal(porItem.size, 2);
  assert.deepEqual(
    porItem.get(euKey)?.map((a) => a.id),
    ["x1", "x2"]
  );
  assert.deepEqual(
    porItem.get(plainKey)?.map((a) => a.id),
    ["y1"]
  );
});
