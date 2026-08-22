import assert from "node:assert/strict";
import { puedeEditar, puedeAsignarRol, bloqueaUltimoOwner, validarPatch, ROLES_VALIDOS } from "./equipo-authz";

let pasaron = 0;
function test(nombre: string, fn: () => void) {
  try { fn(); pasaron++; console.log(`  ok  ${nombre}`); }
  catch (e) { console.error(`  FALLA  ${nombre}`); throw e; }
}

test("puedeEditar: owner edita a cualquiera", () => {
  assert.equal(puedeEditar("owner", "owner"), true);
  assert.equal(puedeEditar("owner", "admin"), true);
  assert.equal(puedeEditar("owner", "employee"), true);
});

test("puedeEditar: admin edita a no-owners pero NO a owners", () => {
  assert.equal(puedeEditar("admin", "employee"), true);
  assert.equal(puedeEditar("admin", "admin"), true);
  assert.equal(puedeEditar("admin", "owner"), false);
});

test("puedeEditar: employee no edita a nadie", () => {
  assert.equal(puedeEditar("employee", "employee"), false);
});

test("puedeAsignarRol: owner asigna cualquier rol", () => {
  assert.equal(puedeAsignarRol("owner", "owner"), true);
});

test("puedeAsignarRol: admin no asigna owner", () => {
  assert.equal(puedeAsignarRol("admin", "owner"), false);
  assert.equal(puedeAsignarRol("admin", "admin"), true);
  assert.equal(puedeAsignarRol("admin", "employee"), true);
});

test("bloqueaUltimoOwner: bloquea si se saca owner al único owner", () => {
  assert.equal(bloqueaUltimoOwner("owner", "admin", 1), true);
});

test("bloqueaUltimoOwner: permite si hay más owners", () => {
  assert.equal(bloqueaUltimoOwner("owner", "admin", 2), false);
});

test("bloqueaUltimoOwner: no aplica si el target no era owner", () => {
  assert.equal(bloqueaUltimoOwner("admin", "employee", 1), false);
});

test("bloqueaUltimoOwner: no aplica si sigue siendo owner", () => {
  assert.equal(bloqueaUltimoOwner("owner", "owner", 1), false);
});

test("bloqueaUltimoOwner: no aplica si rol no cambia (undefined)", () => {
  assert.equal(bloqueaUltimoOwner("owner", undefined, 1), false);
});

test("validarPatch: email inválido", () => {
  assert.equal(validarPatch({ email: "no-mail" }), "email inválido");
});

test("validarPatch: email válido", () => {
  assert.equal(validarPatch({ email: "a@b.com" }), null);
});

test("validarPatch: password corta", () => {
  assert.equal(validarPatch({ new_password: "123" }), "la contraseña debe tener al menos 6 caracteres");
});

test("validarPatch: password ok", () => {
  assert.equal(validarPatch({ new_password: "123456" }), null);
});

test("validarPatch: rol inválido", () => {
  assert.equal(validarPatch({ rol: "jefe" }), "rol inválido");
});

test("validarPatch: rol válido", () => {
  assert.equal(validarPatch({ rol: "admin" }), null);
});

test("validarPatch: vacío es válido", () => {
  assert.equal(validarPatch({}), null);
});

test("ROLES_VALIDOS: tiene los 3 roles", () => {
  assert.deepEqual([...ROLES_VALIDOS].sort(), ["admin", "employee", "owner"]);
});

console.log(`\n${pasaron} tests OK`);
