import assert from "node:assert/strict";
import { test } from "node:test";
import {
  derivarOpciones,
  filaPasa,
  filtrar,
  contarActivos,
  estadoInicial,
  type FiltroDef,
} from "./filtros";

interface Row {
  provincia?: string | null;
  activo?: boolean;
  saldo?: number;
  tags?: string[];
}

const provincia: FiltroDef<Row> = { id: "prov", label: "Provincia", tipo: "multi", get: (r) => r.provincia };
const activo: FiltroDef<Row> = { id: "act", label: "Activo", tipo: "bool", get: (r) => r.activo };
const conSaldo: FiltroDef<Row> = { id: "saldo", label: "Con saldo", tipo: "bool", get: (r) => (r.saldo ?? 0) > 0 };
const tags: FiltroDef<Row> = { id: "tags", label: "Tags", tipo: "multi", getLista: (r) => r.tags ?? [] };

const data: Row[] = [
  { provincia: "Buenos Aires", activo: true, saldo: 0, tags: ["vip"] },
  { provincia: "Córdoba", activo: false, saldo: 100, tags: ["vip", "moroso"] },
  { provincia: "Buenos Aires", activo: true, saldo: 0, tags: [] },
  { provincia: null, activo: true, saldo: 5, tags: ["nuevo"] },
];

test("derivarOpciones: distintos, ordenados, sin vacíos", () => {
  assert.deepEqual(derivarOpciones(data, provincia), ["Buenos Aires", "Córdoba"]);
});

test("derivarOpciones: de una lista (tags)", () => {
  assert.deepEqual(derivarOpciones(data, tags), ["moroso", "nuevo", "vip"]);
});

test("derivarOpciones: bool no tiene opciones", () => {
  assert.deepEqual(derivarOpciones(data, activo), []);
});

test("filaPasa: sin valor -> pasa todo", () => {
  assert.equal(filaPasa(data[0], provincia, undefined), true);
  assert.equal(filaPasa(data[0], provincia, []), true);
});

test("filaPasa: multi elige valores", () => {
  assert.equal(filaPasa(data[0], provincia, ["Córdoba"]), false);
  assert.equal(filaPasa(data[0], provincia, ["Buenos Aires", "Córdoba"]), true);
  assert.equal(filaPasa(data[3], provincia, ["Buenos Aires"]), false); // provincia null
});

test("filaPasa: bool tri-estado", () => {
  assert.equal(filaPasa(data[0], activo, "si"), true);
  assert.equal(filaPasa(data[0], activo, "no"), false);
  assert.equal(filaPasa(data[1], activo, "no"), true);
});

test("filaPasa: bool derivado (con saldo)", () => {
  assert.equal(filaPasa(data[0], conSaldo, "si"), false); // saldo 0
  assert.equal(filaPasa(data[1], conSaldo, "si"), true); // saldo 100
});

test("filaPasa: multi sobre lista (tags) matchea por intersección", () => {
  assert.equal(filaPasa(data[1], tags, ["moroso"]), true);
  assert.equal(filaPasa(data[0], tags, ["moroso"]), false);
  assert.equal(filaPasa(data[2], tags, ["vip"]), false); // sin tags
});

test("filtrar: combina filtros con Y", () => {
  const r = filtrar(data, [provincia, activo], { prov: ["Buenos Aires"], act: "si" });
  assert.equal(r.length, 2);
  assert.ok(r.every((x) => x.provincia === "Buenos Aires" && x.activo));
});

test("filtrar: filtros vacíos devuelven todo", () => {
  assert.equal(filtrar(data, [provincia, activo], {}).length, 4);
});

test("contarActivos: cuenta filtros con valor", () => {
  assert.equal(contarActivos({}), 0);
  assert.equal(contarActivos({ prov: [], act: undefined }), 0);
  assert.equal(contarActivos({ prov: ["Córdoba"], act: "no" }), 2);
});

// --- Valor por defecto de un filtro -------------------------------------
// La lista de clientes trae también los inactivos y arranca con "Activo: Sí".
// Sin esto, un cliente desactivado era invisible aunque el filtro dijera
// "Todos": el panel filtraba en memoria sobre datos que ya venían sin ellos.

const activoPorDefecto: FiltroDef<Row> = { ...activo, defecto: "si" };

test("estadoInicial: toma el defecto de cada def", () => {
  assert.deepEqual(estadoInicial([provincia, activoPorDefecto]), { act: "si" });
});

test("estadoInicial: sin defectos, estado vacío", () => {
  assert.deepEqual(estadoInicial([provincia, activo]), {});
});

test("filtrar: el estado inicial con defecto esconde los inactivos", () => {
  const defs = [provincia, activoPorDefecto];
  const r = filtrar(data, defs, estadoInicial(defs));
  assert.equal(r.length, 3);
  assert.ok(r.every((x) => x.activo));
});

test("filtrar: pasando a 'Todos' aparecen los inactivos", () => {
  const defs = [provincia, activoPorDefecto];
  const r = filtrar(data, defs, { ...estadoInicial(defs), act: undefined });
  assert.equal(r.length, 4);
});

test("contarActivos: un filtro en su defecto no cuenta como cambiado", () => {
  const defs = [provincia, activoPorDefecto];
  assert.equal(contarActivos(estadoInicial(defs), defs), 0);
  assert.equal(contarActivos({ act: "si" }, defs), 0);
});

test("contarActivos: apartarse del defecto sí cuenta", () => {
  const defs = [provincia, activoPorDefecto];
  assert.equal(contarActivos({ act: undefined }, defs), 1); // "Todos"
  assert.equal(contarActivos({ act: "no" }, defs), 1);
  assert.equal(contarActivos({ act: "no", prov: ["Córdoba"] }, defs), 2);
});

test("contarActivos: un multi vacío equivale a no filtrar", () => {
  const defs = [provincia, activoPorDefecto];
  assert.equal(contarActivos({ act: "si", prov: [] }, defs), 0);
});

test("contarActivos: sin defs se comporta como antes", () => {
  assert.equal(contarActivos({ act: "si" }), 1);
});
