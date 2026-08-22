import assert from "node:assert/strict";
import { test } from "node:test";
import { resumenImportacion } from "./resumen-importacion";

test("dos listas: nombra cada categoría con su conteo y los vinculados totales", () => {
  const msg = resumenImportacion({
    listas: [
      { nombre: "Gelec Nº 93 (Equipos)", tipo: "equipos", items: 11 },
      { nombre: "Gelec Nº 93 (Insumos)", tipo: "productos", items: 47 },
    ],
    resultados: { procesados: 58, vinculados: 5 },
  });
  assert.equal(msg, "2 listas creadas: Equipos (11) · Insumos (47) — 5 vinculados");
});

test("una sola lista: mensaje clásico de items + vinculados", () => {
  const msg = resumenImportacion({
    listas: [{ nombre: "Lista X", tipo: "productos", items: 20 }],
    resultados: { procesados: 20, vinculados: 3 },
  });
  assert.equal(msg, "Importación completada: 20 items, 3 vinculados");
});

test("sin array de listas (Excel/CSV): mensaje clásico", () => {
  const msg = resumenImportacion({ resultados: { procesados: 12, vinculados: 0 } });
  assert.equal(msg, "Importación completada: 12 items, 0 vinculados");
});

test("la etiqueta cae al tipo si el nombre no tiene sufijo entre paréntesis", () => {
  const msg = resumenImportacion({
    listas: [
      { nombre: "Equipos raros", tipo: "equipos", items: 2 },
      { nombre: "Cosas", tipo: "productos", items: 3 },
    ],
    resultados: { procesados: 5, vinculados: 0 },
  });
  assert.equal(msg, "2 listas creadas: Equipos (2) · Productos (3) — 0 vinculados");
});
