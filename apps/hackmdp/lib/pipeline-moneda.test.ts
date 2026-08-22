import assert from "node:assert/strict";
import {
  agregarPipeline,
  agregarPipelinePorClave,
  contarOportunidades,
  SQL_COTIZACION_OPORTUNIDAD,
  type OportunidadMonto,
} from "./pipeline-moneda";

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

test("sin oportunidades, todo en cero", () => {
  const r = agregarPipeline([]);
  assert.equal(r.totalArs, 0);
  assert.equal(r.totalPonderadoArs, 0);
  assert.equal(r.sinCotizacion, 0);
  assert.deepEqual(r.porMoneda, []);
});

test("sólo pesos: el total es la suma directa", () => {
  const items: OportunidadMonto[] = [
    { monto: 1000, moneda: "ARS", cotizacion: null, probabilidad: 50 },
    { monto: 500, moneda: "ARS", cotizacion: null, probabilidad: 100 },
  ];
  const r = agregarPipeline(items);
  assert.equal(r.totalArs, 1500);
  assert.equal(r.totalPonderadoArs, 1000 * 0.5 + 500);
  assert.equal(r.porMoneda.length, 1);
  assert.deepEqual(r.porMoneda[0], { moneda: "ARS", oportunidades: 2, monto: 1500 });
});

// El bug: SUM(monto_estimado) sin mirar moneda sumaba 74.403.358 pesos con
// 2.148.535 dólares como si fueran la misma unidad.
test("pesos y dólares NO se suman crudos: el dólar se convierte", () => {
  const items: OportunidadMonto[] = [
    { monto: 1_000_000, moneda: "ARS", cotizacion: null, probabilidad: 100 },
    { monto: 1000, moneda: "USD", cotizacion: 1500, probabilidad: 100 },
  ];
  const r = agregarPipeline(items);
  assert.equal(r.totalArs, 1_000_000 + 1000 * 1500);
  assert.notEqual(r.totalArs, 1_000_000 + 1000);
});

test("cada oportunidad usa SU cotización, no un promedio", () => {
  const items: OportunidadMonto[] = [
    { monto: 100, moneda: "USD", cotizacion: 1476, probabilidad: 100 },
    { monto: 100, moneda: "USD", cotizacion: 1510, probabilidad: 100 },
  ];
  const r = agregarPipeline(items);
  assert.equal(r.totalArs, 100 * 1476 + 100 * 1510);
});

test("el desglose por moneda queda en la moneda original, sin convertir", () => {
  const items: OportunidadMonto[] = [
    { monto: 1_000_000, moneda: "ARS", cotizacion: null, probabilidad: 100 },
    { monto: 2000, moneda: "USD", cotizacion: 1500, probabilidad: 100 },
  ];
  const r = agregarPipeline(items);
  const usd = r.porMoneda.find((m) => m.moneda === "USD");
  assert.equal(usd?.monto, 2000, "el desglose en USD debe seguir siendo 2000, no 3.000.000");
});

test("USD sin cotización: no se inventa un valor, se cuenta aparte", () => {
  const items: OportunidadMonto[] = [
    { monto: 1_000_000, moneda: "ARS", cotizacion: null, probabilidad: 100 },
    { monto: 5000, moneda: "USD", cotizacion: null, probabilidad: 100 },
  ];
  const r = agregarPipeline(items);
  assert.equal(r.totalArs, 1_000_000, "la de USD sin cotización no entra al total");
  assert.equal(r.sinCotizacion, 1);
  const usd = r.porMoneda.find((m) => m.moneda === "USD");
  assert.equal(usd?.monto, 5000, "pero sí figura en el desglose");
});

test("cotización cero o negativa se trata como ausente", () => {
  const items: OportunidadMonto[] = [
    { monto: 100, moneda: "USD", cotizacion: 0, probabilidad: 100 },
  ];
  const r = agregarPipeline(items);
  assert.equal(r.totalArs, 0);
  assert.equal(r.sinCotizacion, 1);
});

test("el ponderado aplica la probabilidad después de convertir", () => {
  const items: OportunidadMonto[] = [
    { monto: 1000, moneda: "USD", cotizacion: 1500, probabilidad: 25 },
  ];
  const r = agregarPipeline(items);
  assert.equal(r.totalPonderadoArs, 1000 * 1500 * 0.25);
});

test("USD siempre antes que ARS en el desglose, para orden estable", () => {
  const items: OportunidadMonto[] = [
    { monto: 1, moneda: "ARS", cotizacion: null, probabilidad: 100 },
    { monto: 1, moneda: "USD", cotizacion: 1500, probabilidad: 100 },
  ];
  assert.deepEqual(
    agregarPipeline(items).porMoneda.map((m) => m.moneda),
    ["USD", "ARS"]
  );
});


// --- Agrupación por clave (embudo por etapa, ranking por vendedor) ---
//
// El bug que motiva estos tests: la tarjeta principal convertía el dólar pero
// el embudo por etapa y el ranking por vendedor sumaban crudo, así que la misma
// pantalla mostraba $76.551.893 y $3.289.647.849 a la vez.

interface ConEtapa extends OportunidadMonto {
  etapa: string;
}

const CON_ETAPAS: ConEtapa[] = [
  { etapa: "propuesta", monto: 1_000_000, moneda: "ARS", cotizacion: null, probabilidad: 50 },
  { etapa: "propuesta", monto: 1000, moneda: "USD", cotizacion: 1500, probabilidad: 100 },
  { etapa: "negociacion", monto: 2000, moneda: "USD", cotizacion: 1400, probabilidad: 25 },
  { etapa: "negociacion", monto: 500, moneda: "USD", cotizacion: null, probabilidad: 80 },
];

test("cada grupo se convierte igual que el total, no crudo", () => {
  const grupos = agregarPipelinePorClave(CON_ETAPAS, (i) => i.etapa);
  assert.equal(grupos.get("propuesta")?.totalArs, 1_000_000 + 1000 * 1500);
  assert.equal(grupos.get("negociacion")?.totalArs, 2000 * 1400);
});

test("la suma de los grupos es igual al total global", () => {
  const total = agregarPipeline(CON_ETAPAS);
  const grupos = agregarPipelinePorClave(CON_ETAPAS, (i) => i.etapa);
  const suma = [...grupos.values()].reduce((s, g) => s + g.totalArs, 0);
  assert.equal(
    suma,
    total.totalArs,
    "el embudo por etapa no puede contradecir a la tarjeta principal"
  );
  const sumaPonderada = [...grupos.values()].reduce((s, g) => s + g.totalPonderadoArs, 0);
  assert.equal(sumaPonderada, total.totalPonderadoArs);
});

test("las que no se pueden convertir se cuentan en su grupo, no se pierden", () => {
  const grupos = agregarPipelinePorClave(CON_ETAPAS, (i) => i.etapa);
  assert.equal(grupos.get("negociacion")?.sinCotizacion, 1);
  assert.equal(grupos.get("propuesta")?.sinCotizacion, 0);
});

test("contarOportunidades cuenta también las que no se convirtieron", () => {
  const grupos = agregarPipelinePorClave(CON_ETAPAS, (i) => i.etapa);
  assert.equal(contarOportunidades(grupos.get("negociacion")!), 2);
  assert.equal(
    [...grupos.values()].reduce((s, g) => s + contarOportunidades(g), 0),
    CON_ETAPAS.length
  );
});

test("sin items, no hay grupos", () => {
  assert.equal(agregarPipelinePorClave([], () => "x").size, 0);
});

// La cotización de una oportunidad en dólares tiene que salir de un presupuesto
// en dólares. Un presupuesto en pesos igual guarda cotizacion_usd de
// referencia, y tomarlo multiplicaba por ~1495 un monto que ya estaba en pesos.
test("la subconsulta de cotización sólo mira presupuestos en USD", () => {
  assert.match(SQL_COTIZACION_OPORTUNIDAD, /pe\.moneda\s*=\s*'USD'/);
  assert.match(SQL_COTIZACION_OPORTUNIDAD, /pe\.oportunidad_id\s*=\s*ov\.id/);
});

console.log(`\n${pasaron} tests OK`);
