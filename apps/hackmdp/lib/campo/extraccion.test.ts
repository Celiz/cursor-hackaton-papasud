import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizarExtraccion,
  numeroDeLote,
  letraDePivote,
  resolverFecha,
  extraerJson,
  type Catalogos,
} from "./extraccion";

const HOY = "2026-08-22";

const catalogos: Catalogos = {
  parcelas: [
    { id: "p8", codigo: "Lote 8", nombre: "El Ceibo — cuadro 8", superficie_ha: 13.6, pivote: "B", tercio: 2 },
    { id: "p13", codigo: "Lote 13", nombre: "Don Aníbal — cuadro 13", superficie_ha: 9.9, pivote: "A", tercio: 1 },
    { id: "p3", codigo: "Lote 3", nombre: "La Josefina — cuadro 3", superficie_ha: "12.20", pivote: "A", tercio: 3 },
  ],
  tareas: [
    { id: "t1", codigo: "fungicida", nombre: "Aplicación de fungicida", alias: ["fungicida", "tizón", "curar", "pulverizar"], requiere_insumos: true },
    { id: "t2", codigo: "aporque", nombre: "Aporque", alias: ["aporcar", "aporque", "embancar"], requiere_insumos: false },
    { id: "t3", codigo: "monitoreo", nombre: "Monitoreo / muestreo", alias: ["recorrer", "monitorear", "revisar"], requiere_insumos: false },
  ],
  insumos: [
    { id: "i1", nombre: "Mancozeb 80%", unidad: "kg/ha", dosis_min: 1.5, dosis_max: 2.5, alias: ["mancozeb", "manco"] },
    { id: "i2", nombre: "Fluazinam 50%", unidad: "l/ha", dosis_min: 0.4, dosis_max: 0.6, alias: ["fluazinam", "shirlan"] },
  ],
};

// ── Identificación del lote ────────────────────────────────────────────────

test("reconoce el lote dicho de las formas en que lo dice la gente", () => {
  assert.equal(numeroDeLote("lote 8"), 8);
  assert.equal(numeroDeLote("el 8"), 8);
  assert.equal(numeroDeLote("8"), 8);
  assert.equal(numeroDeLote("L8"), 8);
  assert.equal(numeroDeLote("el ocho"), 8);
  assert.equal(numeroDeLote("Lote 13"), 13);
  assert.equal(numeroDeLote("el trece"), 13);
  assert.equal(numeroDeLote(null), null);
  assert.equal(numeroDeLote("la cabecera norte"), null);
});

test('resuelve "el 13" contra la parcela real', () => {
  const r = normalizarExtraccion({ lote: "el 13", tarea: "recorrer" }, catalogos, HOY);
  assert.equal(r.parcela_id, "p13");
  assert.equal(r.parcela_codigo, "Lote 13");
  assert.equal(r.superficie_ha, 9.9);
});

test("un lote que no existe no se inventa: queda nulo y avisa", () => {
  const r = normalizarExtraccion({ lote: "lote 99", tarea: "aporcar" }, catalogos, HOY);
  assert.equal(r.parcela_id, null);
  assert.ok(r.avisos.some((a) => a.includes("99")));
});

// ── Tarea ──────────────────────────────────────────────────────────────────

test("mapea la tarea por alias al nombre del catálogo", () => {
  const r = normalizarExtraccion({ lote: "3", tarea: "aporcar" }, catalogos, HOY);
  assert.equal(r.tarea, "Aporque");
  assert.equal(r.tarea_tipo_id, "t2");
});

test("una tarea desconocida se conserva como texto libre, no se descarta", () => {
  const r = normalizarExtraccion({ lote: "3", tarea: "encalado" }, catalogos, HOY);
  assert.equal(r.tarea, "encalado");
  assert.equal(r.tarea_tipo_id, null);
  assert.ok(r.avisos.some((a) => a.includes("encalado")));
});

// ── Insumos y dosis ────────────────────────────────────────────────────────

test("resuelve el insumo por alias y calcula la cantidad total con la superficie", () => {
  const r = normalizarExtraccion(
    { lote: "lote 8", tarea: "fungicida", insumos: [{ nombre: "mancozeb", dosis_ha: 2, unidad: "kg" }] },
    catalogos,
    HOY
  );
  assert.equal(r.insumos.length, 1);
  assert.equal(r.insumos[0].insumo_id, "i1");
  assert.equal(r.insumos[0].insumo_nombre, "Mancozeb 80%");
  assert.equal(r.insumos[0].dosis_ha, 2);
  // 2 kg/ha × 13.6 ha
  assert.equal(r.insumos[0].cantidad, 27.2);
  assert.equal(r.insumos[0].fuera_de_rango, false);
  assert.deepEqual(r.avisos, []);
});

test("marca la dosis fuera del rango recomendado y lo avisa", () => {
  const r = normalizarExtraccion(
    { lote: "lote 8", tarea: "fungicida", insumos: [{ nombre: "mancozeb", dosis_ha: 6 }] },
    catalogos,
    HOY
  );
  assert.equal(r.insumos[0].fuera_de_rango, true);
  assert.ok(r.avisos.some((a) => a.includes("fuera del rango")));
});

test("una dosis por debajo del mínimo también se marca", () => {
  const r = normalizarExtraccion(
    { lote: "lote 8", tarea: "fungicida", insumos: [{ nombre: "fluazinam", dosis_ha: 0.1 }] },
    catalogos,
    HOY
  );
  assert.equal(r.insumos[0].fuera_de_rango, true);
});

test("un insumo que no está en el diccionario se guarda igual, con aviso", () => {
  const r = normalizarExtraccion(
    { lote: "lote 8", tarea: "fungicida", insumos: [{ nombre: "un fungicida que trajo el vecino", dosis_ha: 1 }] },
    catalogos,
    HOY
  );
  assert.equal(r.insumos[0].insumo_id, null);
  assert.equal(r.insumos[0].insumo_nombre, "un fungicida que trajo el vecino");
  assert.ok(r.avisos.some((a) => a.includes("diccionario")));
});

test("avisa cuando la tarea suele llevar insumos y no se dictó ninguno", () => {
  const r = normalizarExtraccion({ lote: "lote 8", tarea: "fungicida" }, catalogos, HOY);
  assert.ok(r.avisos.some((a) => a.includes("normalmente lleva insumos")));
});

test("sin superficie conocida no inventa la cantidad total", () => {
  const r = normalizarExtraccion(
    { lote: "lote 99", tarea: "fungicida", insumos: [{ nombre: "mancozeb", dosis_ha: 2 }] },
    catalogos,
    HOY
  );
  assert.equal(r.insumos[0].dosis_ha, 2);
  assert.equal(r.insumos[0].cantidad, null);
});

// ── Fechas ─────────────────────────────────────────────────────────────────

test("resuelve las fechas relativas contra el día de hoy", () => {
  assert.equal(resolverFecha(null, HOY), HOY);
  assert.equal(resolverFecha("hoy", HOY), HOY);
  assert.equal(resolverFecha("ayer", HOY), "2026-08-21");
  assert.equal(resolverFecha("anteayer", HOY), "2026-08-20");
  assert.equal(resolverFecha("2026-03-05", HOY), "2026-03-05");
  assert.equal(resolverFecha("5/3", HOY), "2026-03-05");
  assert.equal(resolverFecha("5/3/25", HOY), "2025-03-05");
  // Lo que no se entiende cae en hoy, no en una fecha inventada.
  assert.equal(resolverFecha("la semana pasada más o menos", HOY), HOY);
});

// ── Parseo de la respuesta del modelo ──────────────────────────────────────

test("extrae el JSON aunque venga envuelto en prosa o en un bloque de código", () => {
  assert.deepEqual(extraerJson('{"lote":"8"}'), { lote: "8" });
  assert.deepEqual(extraerJson('```json\n{"lote":"8"}\n```'), { lote: "8" });
  assert.deepEqual(extraerJson('Claro, acá va:\n{"lote":"8"}\nEspero que sirva.'), { lote: "8" });
  assert.equal(extraerJson("no hay json acá"), null);
  assert.equal(extraerJson("{roto"), null);
});

// ── El caso completo, tal como se dicta en el campo ────────────────────────

test("el dictado real del lote 8 sale entero y sin avisos", () => {
  const r = normalizarExtraccion(
    {
      lote: "lote 8",
      tarea: "pulverizar",
      fecha: "hoy",
      responsable: "Martín Sosa",
      maquinaria: "Pulverizadora Metalfor",
      horas: "3.5",
      descripcion: "Aplicación preventiva por tizón.",
      insumos: [{ nombre: "mancozeb", dosis_ha: 2, unidad: "kg/ha" }],
    },
    catalogos,
    HOY
  );

  assert.equal(r.parcela_codigo, "Lote 8");
  assert.equal(r.tarea, "Aplicación de fungicida");
  assert.equal(r.fecha, HOY);
  assert.equal(r.responsable_nombre, "Martín Sosa");
  assert.equal(r.maquinaria, "Pulverizadora Metalfor");
  assert.equal(r.horas, 3.5);
  assert.equal(r.insumos[0].cantidad, 27.2);
  assert.deepEqual(r.avisos, []);
});

// ── Ubicación por pivote y tercio, que es como la escribe la orden en papel ──

test("resuelve la ubicación por pivote y tercio", () => {
  const r = normalizarExtraccion({ pivote: "B", tercio: 2, tarea: "aplicar" }, catalogos, HOY);
  assert.equal(r.parcela_id, "p8");
  assert.equal(r.pivote, "B");
  assert.equal(r.tercio, 2);
  assert.equal(r.superficie_ha, 13.6);
});

test("acepta el pivote dicho con ruido alrededor", () => {
  const r = normalizarExtraccion({ pivote: "pivote a", tercio: "3", tarea: "aporcar" }, catalogos, HOY);
  assert.equal(r.parcela_codigo, "Lote 3");
});

test("el lote gana si se dicen los dos y no coinciden", () => {
  // El pivote apunta a p8, pero el lote es explícito: manda lo más específico
  // que resolvió primero, y el operador lo ve en pantalla antes de guardar.
  const r = normalizarExtraccion({ pivote: "B", tercio: 2, lote: "13" }, catalogos, HOY);
  assert.equal(r.parcela_id, "p8");
});

test("un pivote sin lote asignado avisa en vez de inventar", () => {
  const r = normalizarExtraccion({ pivote: "C", tercio: 1, tarea: "aplicar" }, catalogos, HOY);
  assert.equal(r.parcela_id, null);
  assert.ok(r.avisos.some((a) => a.includes("pivote C")));
});

test("sin lote ni pivote, lo dice claro", () => {
  const r = normalizarExtraccion({ tarea: "aporcar" }, catalogos, HOY);
  assert.ok(r.avisos.some((a) => a.includes("ni el pivote")));
});

test("saca la letra del pivote de cualquier forma en que se diga", () => {
  assert.equal(letraDePivote("B"), "B");
  assert.equal(letraDePivote("pivote B"), "B");
  assert.equal(letraDePivote("el pivote b"), "B");
  assert.equal(letraDePivote("Pivote  C "), "C");
  assert.equal(letraDePivote(null), null);
  // Ante algo ambiguo no adivina.
  assert.equal(letraDePivote("el de arriba"), null);
});
