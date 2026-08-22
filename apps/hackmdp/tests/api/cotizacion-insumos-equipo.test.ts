// Integration test de /api/cotizacion/insumos-equipo.
// Corre contra el dev server local (default http://localhost:3001).
// Requiere ESTUDIO_AUTH_COOKIE con cookie de sesión válida; si no, se skippea.
import assert from "node:assert/strict";
import { test } from "node:test";

const BASE_URL = process.env.ESTUDIO_BASE_URL ?? "http://localhost:3001";
const AUTH_COOKIE = process.env.ESTUDIO_AUTH_COOKIE ?? "";

if (!AUTH_COOKIE) {
  console.warn("[skip] ESTUDIO_AUTH_COOKIE no seteada — test requiere login.");
}

test("devuelve grupos {equipo, insumos[]} para un query de equipo", { skip: !AUTH_COOKIE }, async () => {
  const res = await fetch(`${BASE_URL}/api/cotizacion/insumos-equipo?search=absol`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(Array.isArray(data), true);
  if (data.length > 0) {
    assert.ok(data[0].equipo);
    assert.ok(typeof data[0].equipo.id === "string");
    assert.equal(Array.isArray(data[0].insumos), true);
  }
});

test("search vacío o <2 chars devuelve []", { skip: !AUTH_COOKIE }, async () => {
  const res = await fetch(`${BASE_URL}/api/cotizacion/insumos-equipo?search=a`, {
    headers: { cookie: AUTH_COOKIE },
  });
  assert.equal(res.ok, true);
  assert.deepEqual(await res.json(), []);
});
