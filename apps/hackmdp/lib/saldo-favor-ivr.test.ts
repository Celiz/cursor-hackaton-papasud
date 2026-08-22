import assert from "node:assert/strict";
import { repartirFIFO, imputarCredito } from "./saldo-favor-ivr";

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

test("toma del cobro mas viejo primero", () => {
  const r = repartirFIFO(
    [
      { cobro_id: "viejo", libre: 100 },
      { cobro_id: "nuevo", libre: 100 },
    ],
    60
  );
  assert.deepEqual(r, [{ cobro_id: "viejo", monto: 60 }]);
});

test("encadena varios cobros cuando uno no alcanza", () => {
  const r = repartirFIFO(
    [
      { cobro_id: "a", libre: 40 },
      { cobro_id: "b", libre: 100 },
    ],
    90
  );
  assert.deepEqual(r, [
    { cobro_id: "a", monto: 40 },
    { cobro_id: "b", monto: 50 },
  ]);
});

test("nunca reparte mas credito del que hay", () => {
  const r = repartirFIFO([{ cobro_id: "a", libre: 30 }], 100);
  assert.deepEqual(r, [{ cobro_id: "a", monto: 30 }]);
  assert.equal(r.reduce((s, x) => s + x.monto, 0), 30);
});

test("sin credito devuelve vacio", () => {
  assert.deepEqual(repartirFIFO([], 100), []);
  assert.deepEqual(repartirFIFO([{ cobro_id: "a", libre: 0 }], 100), []);
});

test("ignora montos no positivos", () => {
  assert.deepEqual(repartirFIFO([{ cobro_id: "a", libre: 100 }], 0), []);
  assert.deepEqual(repartirFIFO([{ cobro_id: "a", libre: 100 }], -5), []);
});

// `libre` NUNCA trae mas de 2 decimales: sale de restar numeric(15,2) menos numeric(12,2)
// en la base (cobros.monto - cobro_imputado_real()). Un `libre = 33.335` es imposible, asi
// que no hay medios centavos que arbitrar. Lo que si aparece de verdad es el POLVO de
// float64 al encadenar restas en JS: 0.1 + 0.2 === 0.30000000000000004, y sin round2 el
// restante quedaria en 4e-17 y el helper le colgaria un tercer reparto de la nada.
test("no deja polvo de float al encadenar montos de 2 decimales", () => {
  const r = repartirFIFO(
    [
      { cobro_id: "a", libre: 0.1 },
      { cobro_id: "b", libre: 0.2 },
      { cobro_id: "c", libre: 10 },
    ],
    0.3
  );
  assert.deepEqual(r, [
    { cobro_id: "a", monto: 0.1 },
    { cobro_id: "b", monto: 0.2 },
  ]);
});

test("redondea a 2 decimales (centavos exactos, como los da la base)", () => {
  const r = repartirFIFO([{ cobro_id: "a", libre: 33.33 }], 100);
  assert.deepEqual(r, [{ cobro_id: "a", monto: 33.33 }]);
});

// ---------------------------------------------------------------------------
// El CLAMP de imputarCredito(): cuanto le falta al IVR.
//
// Estos tests no tocan la base: le pasan a imputarCredito() un Executor falso (el mismo
// parametro `exec` que usa para correr dentro de una transaccion ajena) y miran QUE SQL pide
// y QUE INSERT termina haciendo.
//
// El bug que cierran: el clamp calculaba el pendiente a mano como `f.total - ivr_cobrado_real(f.id)`
// y se comia las NOTAS DE CREDITO. Contra un IVR de $100.000 con una NC de $40.000 aplicada,
// el pendiente real es $60.000 -- pero el clamp viejo veia $100.000 e imputaba $40.000 de credito
// de mas, enterrando plata del cliente en un IVR ya cubierto. La definicion del pendiente es UNA:
// ivr_pendiente_real().
// ---------------------------------------------------------------------------

type SqlLog = { sql: string; params: any[] };

// Simula la base: el IVR tiene `pendiente` sin cubrir (ya neteado de NC, como lo da la funcion
// canonica) y el cliente tiene un unico cobro con `libre` de credito flotante.
function execFalso(pendiente: number, libre: number) {
  const log: SqlLog[] = [];
  const exec = {
    async query(sql: string, params: any[] = []) {
      log.push({ sql, params });
      if (/ivr_pendiente_real|ivr_cobrado_real/.test(sql)) {
        return { rows: [{ pendiente: pendiente.toFixed(2) }] };
      }
      if (/FROM cobros c/.test(sql)) {
        return { rows: [{ cobro_id: "cobro-viejo", libre: libre.toFixed(2) }] };
      }
      return { rows: [] };
    },
  };
  return { exec, log };
}

const inserts = (log: SqlLog[]) =>
  log.filter((l) => /INSERT INTO cobros_aplicaciones/.test(l.sql)).map((l) => l.params);

async function testAsync(nombre: string, fn: () => Promise<void>) {
  try {
    await fn();
    pasaron++;
    console.log(`  ok  ${nombre}`);
  } catch (e) {
    console.error(`  FALLA  ${nombre}`);
    throw e;
  }
}

async function main() {
  // El candado de regresion: el pendiente se le pide a la funcion canonica, no se rehace a mano.
  await testAsync("el pendiente del IVR sale de ivr_pendiente_real() (la definicion unica)", async () => {
    const { exec, log } = execFalso(60_000, 100_000);
    await imputarCredito("cli", "ivr", 100_000, exec);

    const q = log.find((l) => /FROM facturas/.test(l.sql));
    assert.ok(q, "tiene que consultar el pendiente de la factura");
    assert.match(q!.sql, /ivr_pendiente_real/, "el clamp tiene que usar ivr_pendiente_real()");
    assert.doesNotMatch(
      q!.sql,
      /total\s*-\s*ivr_cobrado_real/,
      "no puede rehacer la cuenta a mano: esa formula ignora las notas de credito"
    );
  });

  await testAsync("un IVR cubierto en parte por una NC no recibe credito de mas", async () => {
    // IVR de $100.000 con una NC de $40.000 aplicada => pendiente real $60.000.
    // El cliente tiene $100.000 de credito flotante y pide imputar los $100.000.
    const { exec, log } = execFalso(60_000, 100_000);
    const imputado = await imputarCredito("cli", "ivr", 100_000, exec);

    assert.equal(imputado, 60_000, "solo se imputa lo que al IVR le falta DE VERDAD");
    assert.deepEqual(inserts(log), [["cobro-viejo", "ivr", 60_000]]);
    // Los otros $40.000 siguen siendo credito del cliente, gastables en otro IVR.
  });

  await testAsync("no imputa nada a un IVR sin pendiente (idempotencia)", async () => {
    const { exec, log } = execFalso(0, 100_000);
    const imputado = await imputarCredito("cli", "ivr", 50_000, exec);

    assert.equal(imputado, 0);
    assert.deepEqual(inserts(log), [], "un IVR ya cubierto no recibe ni un peso mas");
  });

  await testAsync("nunca imputa mas credito del que el cliente tiene", async () => {
    const { exec, log } = execFalso(100_000, 30_000);
    const imputado = await imputarCredito("cli", "ivr", 100_000, exec);

    assert.equal(imputado, 30_000);
    assert.deepEqual(inserts(log), [["cobro-viejo", "ivr", 30_000]]);
  });

  console.log(`\n${pasaron} tests OK`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
