// Integration test de /api/ivr/historial-cliente.
// Corre contra el dev server local (default http://localhost:3001).
// Requiere ESTUDIO_AUTH_COOKIE (+ ESTUDIO_CLIENTE_ID para los tests con datos).
// Si faltan, los tests se skippean. Patrón igual a los otros tests/api.
import assert from "node:assert/strict";
import { test } from "node:test";

const BASE_URL = process.env.ESTUDIO_BASE_URL ?? "http://localhost:3001";
const AUTH_COOKIE = process.env.ESTUDIO_AUTH_COOKIE ?? "";
const CLIENTE_ID = process.env.ESTUDIO_CLIENTE_ID ?? "";

if (!AUTH_COOKIE) {
  console.warn("[skip] ESTUDIO_AUTH_COOKIE no seteada — tests requieren login.");
}

test("devuelve IVRs del cliente con renglones normalizados", { skip: !AUTH_COOKIE || !CLIENTE_ID }, async () => {
  const res = await fetch(`${BASE_URL}/api/ivr/historial-cliente?cliente_id=${CLIENTE_ID}&limit=20`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(Array.isArray(data), true);
  assert.ok(data.length <= 20);
  if (data.length > 0) {
    const ivr = data[0];
    assert.ok(typeof ivr.id === "string");
    assert.ok(typeof ivr.nro_factura === "string" || ivr.nro_factura === null);
    assert.ok("total" in ivr);
    assert.equal(Array.isArray(ivr.renglones), true);
  }
});

test("sin cliente_id devuelve 400", { skip: !AUTH_COOKIE }, async () => {
  const res = await fetch(`${BASE_URL}/api/ivr/historial-cliente`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.status, 400);
});

test("respeta el limit", { skip: !AUTH_COOKIE || !CLIENTE_ID }, async () => {
  const res = await fetch(`${BASE_URL}/api/ivr/historial-cliente?cliente_id=${CLIENTE_ID}&limit=3`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.ok(data.length <= 3);
});
