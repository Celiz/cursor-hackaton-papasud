import assert from "node:assert/strict";
import { test } from "node:test";

const BASE_URL = process.env.GESTI_BASE_URL ?? "http://localhost:3001";
const AUTH_COOKIE = process.env.GESTI_AUTH_COOKIE ?? "";
const COBRO_ID = process.env.GESTI_COBRO_ID ?? "";

if (!AUTH_COOKIE) console.warn("[skip] GESTI_AUTH_COOKIE no seteada");

test("devuelve el reparto del cobro y suma <= monto", { skip: !AUTH_COOKIE || !COBRO_ID }, async () => {
  const res = await fetch(`${BASE_URL}/api/cobros-ivr/${COBRO_ID}/aplicaciones`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(typeof data.monto, "number");
  assert.equal(Array.isArray(data.aplicaciones), true);
  const suma = data.aplicaciones.reduce((s: number, a: any) => s + a.monto_aplicado, 0);
  assert.ok(suma <= data.monto + 0.01, "la suma imputada no puede superar el monto del cobro");
  for (const a of data.aplicaciones) {
    assert.ok(a.factura_id && a.nro_factura);
    assert.ok(a.monto_aplicado > 0);
  }
});

test("cobro inexistente da 404", { skip: !AUTH_COOKIE }, async () => {
  const res = await fetch(`${BASE_URL}/api/cobros-ivr/00000000-0000-0000-0000-000000000000/aplicaciones`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.status, 404);
});
