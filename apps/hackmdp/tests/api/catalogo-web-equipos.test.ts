// Integration tests del endpoint /api/catalogo-web/equipos
// Corre contra el dev server local (default http://localhost:3001).
// Requiere ESTUDIO_AUTH_COOKIE env var con cookie de sesion valida.
// Si no esta seteada, los tests se skippean (no fallan).
//
// Patron: node --test con node:assert/strict (consistente con lib/contact-fields.test.ts).

import assert from "node:assert/strict";
import { test } from "node:test";

const BASE_URL = process.env.ESTUDIO_BASE_URL ?? "http://localhost:3001";
const AUTH_COOKIE = process.env.ESTUDIO_AUTH_COOKIE ?? "";

if (!AUTH_COOKIE) {
  console.warn("[skip] ESTUDIO_AUTH_COOKIE no seteada — tests requieren login.");
}

const skip = !AUTH_COOKIE;
const headers: Record<string, string> = AUTH_COOKIE
  ? { Cookie: AUTH_COOKIE, "Content-Type": "application/json" }
  : { "Content-Type": "application/json" };

test("GET /api/catalogo-web/equipos devuelve array", { skip }, async () => {
  const res = await fetch(`${BASE_URL}/api/catalogo-web/equipos`, { headers });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body), "respuesta debe ser array");
});

test("GET con ?mostrar_en_web=true filtra correctamente", { skip }, async () => {
  const res = await fetch(`${BASE_URL}/api/catalogo-web/equipos?mostrar_en_web=true`, { headers });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  for (const eq of body) {
    assert.equal(eq.mostrar_en_web, true, `equipo ${eq.id} debe tener mostrar_en_web=true`);
  }
});

test("GET con ?division=Laboratorios devuelve equipos de Laboratorios", { skip }, async () => {
  const res = await fetch(`${BASE_URL}/api/catalogo-web/equipos?division=Laboratorios`, { headers });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  for (const eq of body) {
    assert.ok(
      Array.isArray(eq.division) && eq.division.includes("Laboratorios"),
      `equipo ${eq.id} debe tener Laboratorios en division`
    );
  }
});

test("POST crea equipo y persiste mostrar_en_web", { skip }, async () => {
  const payload = {
    marca: "TEST_BRAND_DELETE_ME",
    modelo: `TM-${Date.now()}`,
    tipo: "Test",
    mostrar_en_web: true,
  };
  const res = await fetch(`${BASE_URL}/api/catalogo-web/equipos`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.marca, payload.marca);
  assert.equal(created.modelo, payload.modelo);
  assert.equal(created.mostrar_en_web, true);
  assert.ok(created.id, "debe tener id");

  // Cleanup: PATCH para apagar mostrar_en_web (no podemos hard-delete sin permiso)
  await fetch(`${BASE_URL}/api/catalogo-web/equipos/${created.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ mostrar_en_web: false }),
  });
});

test("POST sin marca devuelve 400", { skip }, async () => {
  const res = await fetch(`${BASE_URL}/api/catalogo-web/equipos`, {
    method: "POST",
    headers,
    body: JSON.stringify({ modelo: "test" }),
  });
  assert.equal(res.status, 400);
});

test("PATCH toggleando mostrar_en_web persiste el cambio", { skip }, async () => {
  const create = await fetch(`${BASE_URL}/api/catalogo-web/equipos`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      marca: "TEST_PATCH_DELETE_ME",
      modelo: `TM-${Date.now()}`,
      mostrar_en_web: true,
    }),
  });
  const equipo = await create.json();

  const patch = await fetch(`${BASE_URL}/api/catalogo-web/equipos/${equipo.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ mostrar_en_web: false }),
  });
  assert.equal(patch.status, 200);
  const updated = await patch.json();
  assert.equal(updated.mostrar_en_web, false);

  const verify = await fetch(`${BASE_URL}/api/catalogo-web/equipos?mostrar_en_web=true`, { headers });
  const visibles = await verify.json();
  assert.ok(!visibles.find((e: any) => e.id === equipo.id), "equipo toggled-off no debe aparecer en filtro mostrar_en_web=true");
});

test("DELETE soft hace mostrar_en_web=false (no borra)", { skip }, async () => {
  const create = await fetch(`${BASE_URL}/api/catalogo-web/equipos`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      marca: "TEST_DELETE_DELETE_ME",
      modelo: `TM-${Date.now()}`,
      mostrar_en_web: true,
    }),
  });
  const equipo = await create.json();

  const del = await fetch(`${BASE_URL}/api/catalogo-web/equipos/${equipo.id}`, {
    method: "DELETE",
    headers,
  });
  assert.equal(del.status, 200);
  const result = await del.json();
  assert.equal(result.removed_from_web, true);

  // Verificar que el row todavía existe (GET sin filtro lo encuentra)
  const stillThere = await fetch(`${BASE_URL}/api/catalogo-web/equipos/${equipo.id}`, { headers });
  assert.equal(stillThere.status, 200);
  const fetched = await stillThere.json();
  assert.equal(fetched.id, equipo.id, "DELETE soft preserves the row");
  assert.equal(fetched.mostrar_en_web, false);
});
