import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resumen,
  estadoResultante,
  construirAplicaciones,
  parseMonto,
  type FilaReasignacion,
} from "./reasignar-imputacion";

const filas: FilaReasignacion[] = [
  { factura_id: "a", nro_factura: "IVR-001208", saldo_sin_este_cobro: 771580.63, asignado: 771580.63 },
  { factura_id: "b", nro_factura: "IVR-001204", saldo_sin_este_cobro: 381435.84, asignado: 0 },
];

test("resumen: todo asignado, nada sin asignar, no excede", () => {
  const r = resumen(771580.63, filas);
  assert.equal(r.totalAsignado, 771580.63);
  assert.equal(r.sinAsignar, 0);
  assert.equal(r.excede, false);
});

test("resumen: si se asigna de mas, excede = true", () => {
  const r = resumen(771580.63, [
    { ...filas[0], asignado: 771580.63 },
    { ...filas[1], asignado: 100000 },
  ]);
  assert.equal(r.excede, true);
  assert.ok(r.sinAsignar < 0);
});

test("resumen: parcial deja sin asignar positivo", () => {
  const r = resumen(771580.63, [
    { ...filas[0], asignado: 390144.79 },
    { ...filas[1], asignado: 0 },
  ]);
  assert.equal(Math.round(r.sinAsignar * 100) / 100, 381435.84);
  assert.equal(r.excede, false);
});

test("estadoResultante: asignado == saldo -> pagada", () => {
  const r = estadoResultante(771580.63, 771580.63);
  assert.equal(r.estado, "pagada");
  assert.equal(r.pendiente, 0);
});

test("estadoResultante: asignado 0 -> pendiente por el saldo entero", () => {
  const r = estadoResultante(381435.84, 0);
  assert.equal(r.estado, "pendiente");
  assert.equal(r.pendiente, 381435.84);
});

test("estadoResultante: asignado parcial -> parcial con pendiente restante", () => {
  const r = estadoResultante(771580.63, 390144.79);
  assert.equal(r.estado, "parcial");
  assert.equal(Math.round(r.pendiente * 100) / 100, 381435.84);
});

test("construirAplicaciones: filtra las filas en 0", () => {
  const apps = construirAplicaciones(filas);
  assert.deepEqual(apps, [{ factura_id: "a", monto_aplicado: 771580.63 }]);
});

test("parseMonto: string del driver / vacio / basura", () => {
  assert.equal(parseMonto("771580.63"), 771580.63);
  assert.equal(parseMonto(""), 0);
  assert.equal(parseMonto(null), 0);
  assert.equal(parseMonto("abc"), 0);
  assert.equal(parseMonto(1000), 1000);
});

// Bug 1 (CRITICAL): saldo ya en 0 y nada asignado en este reparto -> "pagada", no "pendiente".
test("estadoResultante: saldo 0 y asignado 0 -> pagada, no pendiente incoherente", () => {
  const r = estadoResultante(0, 0);
  assert.equal(r.estado, "pagada");
  assert.equal(r.pendiente, 0);
});

test("estadoResultante: saldo > 0 y asignado 0 -> sigue pendiente (caso normal)", () => {
  const r = estadoResultante(100, 0);
  assert.equal(r.estado, "pendiente");
  assert.equal(r.pendiente, 100);
});

// Bug 2 (IMPORTANT): inputs corruptos (strings no numéricas) deben sanearse con parseMonto,
// no leerse como "pagada" por accidente.
test("estadoResultante: asignado corrupto se sanea a 0 -> pendiente por el saldo entero", () => {
  const r = estadoResultante("100" as any, "abc" as any);
  assert.equal(r.estado, "pendiente");
  assert.equal(r.pendiente, 100);
});

test("estadoResultante: saldo corrupto se sanea a 0 -> pagada (no queda pendiente fantasma)", () => {
  const r = estadoResultante("abc" as any, "50" as any);
  assert.equal(r.estado, "pagada");
  assert.equal(r.pendiente, 0);
});

// Bug 3 (CRITICAL): resumen y construirAplicaciones deben redondear en el mismo orden
// (por fila, no la suma cruda) para no divergir un centavo.
test("resumen.totalAsignado coincide con la suma de monto_aplicado de construirAplicaciones", () => {
  const filasDecimales: FilaReasignacion[] = [
    { factura_id: "x", nro_factura: "IVR-1", saldo_sin_este_cobro: 89.537, asignado: 89.537 },
    { factura_id: "y", nro_factura: "IVR-2", saldo_sin_este_cobro: 9.876, asignado: 9.876 },
    { factura_id: "z", nro_factura: "IVR-3", saldo_sin_este_cobro: 45.728, asignado: 45.728 },
  ];
  const r = resumen(145.141, filasDecimales);
  const apps = construirAplicaciones(filasDecimales);
  const sumaAplicaciones = apps.reduce((s, a) => s + a.monto_aplicado, 0);
  assert.equal(r.totalAsignado, sumaAplicaciones);
});
