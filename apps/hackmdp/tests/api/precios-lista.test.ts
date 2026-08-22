// Integration test de /api/precios?lista_id=...
// Corre contra el dev server local (default http://localhost:3001).
// Requiere ESTUDIO_AUTH_COOKIE (+ ESTUDIO_LISTA_ID para el caso con datos).
// Si faltan, los tests se skippean. Patrón igual a los otros tests/api.
import assert from "node:assert/strict";
import { test } from "node:test";

const BASE_URL = process.env.ESTUDIO_BASE_URL ?? "http://localhost:3001";
const AUTH_COOKIE = process.env.ESTUDIO_AUTH_COOKIE ?? "";
const LISTA_ID = process.env.ESTUDIO_LISTA_ID ?? "";

if (!AUTH_COOKIE) {
  console.warn("[skip] ESTUDIO_AUTH_COOKIE no seteada — tests requieren login.");
}

test("con lista_id devuelve precio_calculado por producto", { skip: !AUTH_COOKIE || !LISTA_ID }, async () => {
  const res = await fetch(`${BASE_URL}/api/precios?lista_id=${encodeURIComponent(LISTA_ID)}&page=1&pageSize=5`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(Array.isArray(data.items), true);
  assert.equal(typeof data.total, "number");
  if (data.items.length > 0) {
    const row = data.items[0];
    assert.ok("precio_calculado" in row);
    assert.ok("lista_precio_fijo" in row);
    assert.ok("lista_margen_override" in row);
    assert.ok(Number(row.precio_calculado) >= 0);
  }
});

test("lista_id inexistente devuelve 404", { skip: !AUTH_COOKIE }, async () => {
  const res = await fetch(`${BASE_URL}/api/precios?lista_id=00000000-0000-0000-0000-000000000000`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.status, 404);
});

test("sin lista_id la respuesta mantiene el shape original (sin precio_calculado)", { skip: !AUTH_COOKIE }, async () => {
  const res = await fetch(`${BASE_URL}/api/precios?page=1&pageSize=5`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(Array.isArray(data.items), true);
  if (data.items.length > 0) {
    assert.ok(!("precio_calculado" in data.items[0]));
  }
});
