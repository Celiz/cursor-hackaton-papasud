import { query as poolQuery, getClient } from "@/lib/db";

// El pool, o el client de una transaccion (getClient()).
type Executor = { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> };

export type FuenteCredito = { cobro_id: string; libre: number };
export type Reparto = { cobro_id: string; monto: number };

// Redondeo normal a centavos, el mismo que usa el resto de la app.
//
// No hace falta ningun desempate raro (ni "half down" ni epsilons): `libre` NUNCA trae mas
// de 2 decimales. Sale de restar dos numeric de la base -- cobros.monto es numeric(15,2) y
// cobros_aplicaciones.monto_aplicado es numeric(12,2) -- asi que la base no puede producir
// un 33.335. round2 esta para matar el POLVO de float64 (0.1 + 0.2 = 0.30000000000000004)
// cuando se encadenan restas en JS, no para arbitrar medios centavos que no existen.
const round2 = (n: number) => Math.round(n * 100) / 100;

// Reparte `monto` entre las fuentes, de la mas vieja a la mas nueva.
//
// Logica pura a proposito: el reparto del dinero es la parte que hay que poder
// testear sin una base de datos delante.
export function repartirFIFO(fuentes: FuenteCredito[], monto: number): Reparto[] {
  let restante = round2(monto);
  if (restante <= 0.005) return [];

  const out: Reparto[] = [];
  for (const f of fuentes) {
    if (restante <= 0.005) break;
    const libre = round2(f.libre);
    if (libre <= 0.005) continue;
    const toma = round2(Math.min(restante, libre));
    out.push({ cobro_id: f.cobro_id, monto: toma });
    restante = round2(restante - toma);
  }
  return out;
}

// Plata que el cliente ya pago y todavia no esta imputada a ningun IVR.
export async function creditoDisponible(clienteId: string, exec?: Executor): Promise<number> {
  const run = (sql: string, params: any[]) => (exec ? exec.query(sql, params) : poolQuery(sql, params));
  const r = await run(`SELECT cliente_credito_flotante($1) AS credito`, [clienteId]);
  return parseFloat(r.rows[0]?.credito) || 0;
}

// Imputa hasta `monto` de credito del cliente contra un IVR.
//
// NO crea ni muta un cobro: la plata ya entro y ya se conto cuando se cargo el cobro
// original. Crear uno nuevo la contaria dos veces -- que es justo el bug que este modulo
// existe para impedir. Solo cuelga la imputacion de los cobros que tienen excedente sin usar.
//
// Corre TODO en una transaccion (propia si no le pasan `exec`): el reparto puede tocar varios
// cobros, y con el pool pelado (lib/db.ts -> query() = pool.query(), cada statement en su
// propia conexion y auto-commit) un fallo en el 2do INSERT dejaba el 1ro ya committeado --
// el endpoint devolvia 500, el caller creia que no habia pasado nada, y la plata se habia
// movido a medias.
//
// Devuelve lo efectivamente imputado (puede ser menor que `monto`: no hay tanto credito, o
// al IVR no le falta tanto).
export async function imputarCredito(
  clienteId: string,
  facturaId: string,
  monto: number,
  exec?: Executor
): Promise<number> {
  if (!(monto > 0.005)) return 0;
  if (exec) return imputarEn(exec, clienteId, facturaId, monto);

  const client = await getClient();
  const propio: Executor = { query: (sql, params) => client.query(sql, params) };
  try {
    await client.query("BEGIN");
    const imputado = await imputarEn(propio, clienteId, facturaId, monto);
    await client.query("COMMIT");
    return imputado;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function imputarEn(
  exec: Executor,
  clienteId: string,
  facturaId: string,
  monto: number
): Promise<number> {
  const run = (sql: string, params: any[]) => exec.query(sql, params);

  // 1) Cuanta plata le falta REALMENTE a este IVR, con la fila lockeada.
  //
  // ivr_pendiente_real() es la definicion CANONICA y unica: total - ivr_cobrado_real() - NC
  // aplicadas. Antes esta linea rehacia la cuenta a mano (`f.total - ivr_cobrado_real(f.id)`)
  // y se comia el tercer termino: las NOTAS DE CREDITO. Contra un IVR de $100.000 con una NC
  // de $40.000 aplicada, el pendiente real es $60.000 pero este clamp veia $100.000, asi que
  // imputaba $40.000 de credito de mas -- plata del cliente enterrada en un IVR que ya estaba
  // cubierto. Misma clase de bug que el de /api/cobros: una segunda definicion del mismo numero.
  //
  // Es ademas el clamp que vuelve idempotente a esta funcion. Sin el, llamarla dos veces con
  // los mismos argumentos imputaba el doble (el ON CONFLICT de abajo ACUMULA), y un IVR de
  // $56.021 terminaba con $112.042 encima sin que nadie protestara: un retry del caller, o
  // un doble click, sobre-pagaba la factura. Con el clamp, la segunda llamada ve pendiente 0
  // y no hace nada. Un IVR nunca puede quedar con mas plata imputada que su total.
  //
  // El lock (FOR NO KEY UPDATE) serializa dos imputaciones concurrentes contra el MISMO IVR:
  // sin el, las dos leerian el mismo pendiente y las dos lo cubririan entero.
  const fact = await run(
    `SELECT ivr_pendiente_real(f.id) AS pendiente
     FROM facturas f
     WHERE f.id = $1
     FOR NO KEY UPDATE OF f`,
    [facturaId]
  );
  if (fact.rows.length === 0) return 0;

  const pendiente = round2(parseFloat(fact.rows[0].pendiente) || 0);
  const objetivo = round2(Math.min(monto, pendiente));
  if (!(objetivo > 0.005)) return 0;

  // 2) De que cobros sale esa plata: los que tienen excedente sin imputar, del mas viejo al
  //    mas nuevo.
  //
  // "Cuanto de este cobro esta imputado" lo dice cobro_imputado_real() -- la MISMA funcion
  // canonica que usa cliente_credito_flotante() (y los candados de I1). Rehacer la cuenta a
  // mano aca (c.monto - SUM(monto_aplicado)) era una segunda definicion, y se comia una rama
  // entera de la canonica: un cobro SIN aplicaciones pero con un cobros.factura_id directo a
  // un IVR vivo (el link legacy) esta imputado ENTERO. Esos 12 cobros ($2.807.091, 7 clientes)
  // aparecian como "credito 100% libre", y al imputarlos el INSERT en cobros_aplicaciones les
  // cambiaba la rama: el link directo dejaba de contar y el IVR que estaban pagando se quedaba
  // sin su pago. Con la funcion canonica, esta query y cliente_credito_flotante() dan el mismo
  // numero POR CONSTRUCCION.
  //
  // Solo cobros 'confirmado': es el criterio de cliente_credito_flotante() y de los candados
  // (un cobro pendiente/rechazado no es plata que entro).
  //
  // FOR NO KEY UPDATE: mismo lock que toma el candado cobros_aplicaciones_guarda_fn, para que
  // dos repartos concurrentes del mismo cliente no vean los dos el mismo excedente libre.
  const fuentes = await run(
    `SELECT c.id AS cobro_id,
            c.monto - cobro_imputado_real(c.id) AS libre
     FROM cobros c
     WHERE c.cliente_id = $1
       AND c.estado = 'confirmado'
       AND c.monto - cobro_imputado_real(c.id) > 0.005
     ORDER BY c.fecha_pago, c.created_at
     FOR NO KEY UPDATE OF c`,
    [clienteId]
  );

  const reparto = repartirFIFO(
    fuentes.rows.map((r: any) => ({ cobro_id: r.cobro_id, libre: parseFloat(r.libre) || 0 })),
    objetivo
  );

  for (const p of reparto) {
    await run(
      `INSERT INTO cobros_aplicaciones (cobro_id, factura_id, monto_aplicado)
       VALUES ($1, $2, $3)
       ON CONFLICT (cobro_id, factura_id) DO UPDATE
         SET monto_aplicado = cobros_aplicaciones.monto_aplicado + EXCLUDED.monto_aplicado`,
      [p.cobro_id, facturaId, p.monto]
    );
  }

  return round2(reparto.reduce((s, p) => s + p.monto, 0));
}

// El cobros.factura_id es un LINK, no una imputacion -- y un link sin imputacion detras es
// PLATA QUE DESAPARECE.
//
// cobro_imputado_real() / ivr_cobrado_real() tienen una rama LEGACY: un cobro SIN filas en
// cobros_aplicaciones pero CON factura_id apuntando a un IVR vivo cuenta ENTERO contra ese
// IVR. Existe para los datos migrados. Los endpoints, en cambio, insertaban el recibo con
// factura_id ANTES de saber cuanto iban a imputar: si al final no imputaban nada (el IVR ya
// estaba saldado, un doble submit, otra pestania), el recibo quedaba con el link y CERO
// aplicaciones -> caia en la rama legacy -> un IVR ya pagado se tragaba la plata entera
// (cobrado 80.267 -> 180.267) y el cliente se quedaba sin credito. El mismo bug aparecio dos
// veces, en /api/cobros y en /api/cobros-ivr.
//
// Esta funcion es la unica puerta por la que se escribe cobros.factura_id: deja el link SOLO
// si existe la imputacion que lo respalda; si no, lo pone en NULL (y el recibo es credito puro
// del cliente, gastable). La migracion 1136 lo hace cumplir con un CONSTRAINT TRIGGER.
//
// Es idempotente y no depende del orden: la subconsulta devuelve la factura si hay imputacion
// y NULL si no.
export async function sincronizarFacturaPrincipal(
  cobroId: string,
  facturaIdDeseada: string | null,
  exec?: Executor
): Promise<string | null> {
  const run = (sql: string, params: any[]) => (exec ? exec.query(sql, params) : poolQuery(sql, params));
  const r = await run(
    `UPDATE cobros
        SET factura_id = (
              SELECT ca.factura_id
                FROM cobros_aplicaciones ca
               WHERE ca.cobro_id = $1::uuid
                 AND ca.factura_id = $2::uuid
            )
      WHERE id = $1::uuid
      RETURNING factura_id`,
    [cobroId, facturaIdDeseada]
  );
  return r.rows[0]?.factura_id ?? null;
}

// ———————————————————————————————————————————————————————————————————————————————
// LECTURAS: el saldo a favor y el credito son DERIVADOS, no un campo.
// ———————————————————————————————————————————————————————————————————————————————
//
// clientes.saldo_a_favor_ivr todavia EXISTE como columna, pero esta MUERTA: ya nadie la
// escribe. El problema es que las queries de /api/clientes hacen `SELECT c.*`, asi que la
// arrastran igual y el consumidor sigue leyendo el numero viejo -- CURBELO tenia $3.000
// anotados ahi y $6.445 reales, LENCINA tenia $731.000 sin un solo IVR ni cobro detras.
//
// Son DOS numeros distintos y NO son intercambiables (mezclarlos es el bug que origino todo
// este rediseño):
//
//   saldo_a_favor        lo que el cliente pago DE MAS  = max(0, cobrado + NC - remitido).
//                        Es lo que se MUESTRA como "Saldo a Favor".
//
//   credito_sin_imputar  plata que entro y todavia no esta imputada a ningun IVR
//                        (= cliente_credito_flotante). Es la UNICA que se puede APLICAR a un
//                        remito abierto, y es exactamente contra lo que validan
//                        creditoDisponible() / imputarCredito() en /api/ivr y /api/cobros.
//
// MOVIGLIA tiene saldo_a_favor $0 y credito_sin_imputar $25.048. Ofrecerle aplicar el
// primero seria ofrecerle $0 teniendo $25.048; ofrecer el segundo donde va el primero seria
// decirle que tiene plata a favor cuando en realidad debe.

// Fragmento para los SELECT que traen `c.*` de la tabla `clientes`.
// Va DESPUES de `c.*` en la lista de columnas.
export const SQL_SALDO_IVR_DERIVADO = `
      COALESCE((SELECT v.saldo_a_favor       FROM vista_cuentas_corrientes_ivr v WHERE v.cliente_id = c.id), 0) AS saldo_a_favor_ivr_derivado,
      COALESCE((SELECT v.credito_sin_imputar FROM vista_cuentas_corrientes_ivr v WHERE v.cliente_id = c.id), 0) AS credito_sin_imputar`;

// Saca de la fila la columna cruda (muerta) y la reemplaza por la derivada.
//
// Se hace en JS y NO con un alias duplicado en el SELECT (`c.*, ... AS saldo_a_favor_ivr`)
// a proposito: con dos columnas del mismo nombre gana "la ultima que aparece en el SELECT",
// un detalle de implementacion de pg-node que cualquier reordenamiento inocente da vuelta
// -- y el campo muerto volveria a ganar, en silencio y sin que ningun test lo note.
export function conSaldoIvrDerivado(row: Record<string, any>): Record<string, any> {
  if (!row) return row;
  const { saldo_a_favor_ivr_derivado, ...resto } = row;
  return {
    ...resto,
    saldo_a_favor_ivr: Number(saldo_a_favor_ivr_derivado) || 0,
    credito_sin_imputar: Number(row.credito_sin_imputar) || 0,
  };
}

// Los dos numeros derivados de un cliente, para las respuestas que no pueden meter el
// fragmento de arriba en su SELECT (ej. un `RETURNING *` de un UPDATE).
export async function saldoIvrDerivado(
  clienteId: string,
  exec?: Executor
): Promise<{ saldo_a_favor_ivr: number; credito_sin_imputar: number }> {
  const run = (sql: string, params: any[]) => (exec ? exec.query(sql, params) : poolQuery(sql, params));
  const r = await run(
    `SELECT COALESCE(v.saldo_a_favor, 0)       AS saldo_a_favor_ivr,
            COALESCE(v.credito_sin_imputar, 0) AS credito_sin_imputar
       FROM (SELECT $1::uuid AS id) x
       LEFT JOIN vista_cuentas_corrientes_ivr v ON v.cliente_id = x.id`,
    [clienteId]
  );
  return {
    saldo_a_favor_ivr: Number(r.rows[0]?.saldo_a_favor_ivr) || 0,
    credito_sin_imputar: Number(r.rows[0]?.credito_sin_imputar) || 0,
  };
}
