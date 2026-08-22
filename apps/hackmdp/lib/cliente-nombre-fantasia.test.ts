import assert from "node:assert/strict";
import { test } from "node:test";
import { nombreFantasiaVisible, sugerenciaNombreFantasia } from "./cliente-nombre-fantasia";

// --- Qué se dibuja en la segunda línea -------------------------------------

test("nombreFantasiaVisible: oculta la línea cuando repite la razón social", () => {
  assert.equal(nombreFantasiaVisible("GEMATEC S.R.L.", "GEMATEC S.R.L."), null);
});

test("nombreFantasiaVisible: la repetición no depende de mayúsculas, acentos ni espacios", () => {
  assert.equal(nombreFantasiaVisible("MUÑOZ MARIA", "muñoz  maria"), null);
  assert.equal(nombreFantasiaVisible("Pérez Juan", "PEREZ JUAN"), null);
});

test("nombreFantasiaVisible: oculta la basura que dejó la migración", () => {
  assert.equal(nombreFantasiaVisible("RAFFO JULIANA", "."), null);
  assert.equal(nombreFantasiaVisible("RAFFO JULIANA", " - "), null);
  assert.equal(nombreFantasiaVisible("RAFFO JULIANA", "   "), null);
});

test("nombreFantasiaVisible: conserva el nombre de fantasía que aporta algo", () => {
  assert.equal(
    nombreFantasiaVisible("HOSPITAL MAR DE AJO", "MUNICIPALIDAD DE LA COSTA"),
    "MUNICIPALIDAD DE LA COSTA"
  );
});

test("nombreFantasiaVisible: no mira el campo legacy — lo que se ve es lo que se edita", () => {
  assert.equal(nombreFantasiaVisible("ADORNO LARISA MARIA", null), null);
  assert.equal(nombreFantasiaVisible("ADORNO LARISA MARIA", ""), null);
});

test("nombreFantasiaVisible: sin razón social no hay segunda línea (el fantasía sube al título)", () => {
  assert.equal(nombreFantasiaVisible("", "ALGUNA FANTASIA"), null);
  assert.equal(nombreFantasiaVisible(null, "ALGUNA FANTASIA"), null);
});

test("nombreFantasiaVisible: devuelve el texto tal cual, solo recortado", () => {
  assert.equal(nombreFantasiaVisible("BCLAB S.A.", "  Bioquímica del Sur  "), "Bioquímica del Sur");
});

// --- Qué se ofrece como sugerencia del sistema viejo ------------------------

test("sugerenciaNombreFantasia: ofrece el texto legacy cuando el campo está vacío", () => {
  assert.equal(
    sugerenciaNombreFantasia("ADORNO LARISA MARIA", null, "LABORATORIO ADORNO"),
    "LABORATORIO ADORNO"
  );
});

test("sugerenciaNombreFantasia: no molesta si ya hay un nombre de fantasía cargado", () => {
  assert.equal(
    sugerenciaNombreFantasia("ADORNO LARISA MARIA", "Lab Adorno", "LABORATORIO ADORNO"),
    null
  );
});

test("sugerenciaNombreFantasia: no ofrece repetir la razón social", () => {
  assert.equal(sugerenciaNombreFantasia("GEMATEC S.R.L.", null, "GEMATEC S.R.L."), null);
  assert.equal(sugerenciaNombreFantasia("GEMATEC S.R.L.", null, "gematec  s.r.l."), null);
});

test("sugerenciaNombreFantasia: no ofrece basura", () => {
  assert.equal(sugerenciaNombreFantasia("RAFFO JULIANA", null, "."), null);
  assert.equal(sugerenciaNombreFantasia("RAFFO JULIANA", null, ""), null);
  assert.equal(sugerenciaNombreFantasia("RAFFO JULIANA", null, null), null);
});

test("sugerenciaNombreFantasia: ofrece aunque sea dudoso — la decisión es del usuario", () => {
  // "González Esteban Andrés" parece un contacto, no una fantasía. Se ofrece
  // igual: quien conoce al cliente decide, y por eso no migramos en bloque.
  assert.equal(
    sugerenciaNombreFantasia("ALANCAY NATACHA FIORELA", null, "González Esteban Andrés"),
    "González Esteban Andrés"
  );
});
