import assert from "node:assert/strict";
import {
  resolverEspecificaciones,
  diffEspecificaciones,
  hayDiferencias,
  aplicarAlCatalogo,
} from "./especificaciones-diff";

let pasaron = 0;
function test(nombre: string, fn: () => void) {
  try {
    fn();
    pasaron++;
    console.log(`  ok  ${nombre}`);
  } catch (e) {
    console.error(`  FALLA  ${nombre}`);
    throw e;
  }
}

// --- resolverEspecificaciones ---
test("resolver: borrador sin personalizar usa el catálogo", () => {
  const res = resolverEspecificaciones(
    { especificaciones: { Voltaje: "220V" }, especificaciones_personalizada: false, estado: "borrador" },
    { Voltaje: "110V" },
  );
  assert.deepEqual(res, { Voltaje: "110V" });
});

test("resolver: borrador personalizado usa su propia copia", () => {
  const res = resolverEspecificaciones(
    { especificaciones: { Voltaje: "220V" }, especificaciones_personalizada: true, estado: "borrador" },
    { Voltaje: "110V" },
  );
  assert.deepEqual(res, { Voltaje: "220V" });
});

test("resolver: estado distinto de borrador queda congelado en su copia", () => {
  const res = resolverEspecificaciones(
    { especificaciones: { Voltaje: "220V" }, especificaciones_personalizada: false, estado: "enviado" },
    { Voltaje: "110V" },
  );
  assert.deepEqual(res, { Voltaje: "220V" });
});

test("resolver: sin copia propia cae al catálogo", () => {
  const res = resolverEspecificaciones(
    { especificaciones: null, especificaciones_personalizada: false, estado: "borrador" },
    { Voltaje: "110V" },
  );
  assert.deepEqual(res, { Voltaje: "110V" });
});

// --- diffEspecificaciones ---
test("diff: detecta agregada, cambiada y quitada", () => {
  const diff = diffEspecificaciones(
    { Voltaje: "220V", Peso: "5kg" },        // presupuesto
    { Voltaje: "110V", Color: "gris" },      // catálogo
  );
  assert.deepEqual(diff.agregadas, [{ clave: "Peso", valorPresupuesto: "5kg" }]);
  assert.deepEqual(diff.cambiadas, [
    { clave: "Voltaje", valorPresupuesto: "220V", valorCatalogo: "110V" },
  ]);
  assert.deepEqual(diff.quitadas, [{ clave: "Color", valorCatalogo: "gris" }]);
});

test("diff: sin diferencias da listas vacías", () => {
  const diff = diffEspecificaciones({ A: "1" }, { A: "1" });
  assert.equal(hayDiferencias(diff), false);
});

test("diff: ignora valores vacíos", () => {
  const diff = diffEspecificaciones({ A: "1", B: "" }, { A: "1" });
  assert.equal(hayDiferencias(diff), false);
});

// --- aplicarAlCatalogo ---
test("aplicar: solo las claves elegidas se propagan", () => {
  const nuevo = aplicarAlCatalogo(
    { Voltaje: "110V", Color: "gris" },                  // catálogo
    { Voltaje: "220V", Color: "gris", Peso: "5kg" },     // presupuesto
    ["Voltaje", "Peso"],                                  // claves elegidas
  );
  assert.deepEqual(nuevo, { Voltaje: "220V", Color: "gris", Peso: "5kg" });
});

test("aplicar: una clave quitada del presupuesto se borra del catálogo si está elegida", () => {
  const nuevo = aplicarAlCatalogo(
    { Voltaje: "110V", Color: "gris" },
    { Voltaje: "110V" },
    ["Color"],
  );
  assert.deepEqual(nuevo, { Voltaje: "110V" });
});

console.log(`\ntodos pasaron (${pasaron})`);
