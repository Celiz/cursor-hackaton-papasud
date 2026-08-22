import type { PoolClient } from "pg";

export type CorridaTipo =
  | "aplicar_lista"
  | "ajuste_porcentaje"
  | "margen"
  | "precio_fijo"
  | "reversion";

export interface CrearCorridaInput {
  org_id: string;
  tipo: CorridaTipo;
  descripcion: string;
  usuario_id: string;
  lista_id?: string | null;
  proveedor_id?: string | null;
  parametros?: Record<string, unknown>;
  reversion_de_corrida_id?: string | null;
}

export interface CorridaResultado {
  corridaId: string;
  productosAfectados: number;
}

/**
 * Ejecuta `body` dentro de una transacción con los GUCs de la corrida seteados,
 * de modo que el trigger log_precio_change estampe corrida_id en cada cambio.
 * `client` debe venir de getClient(); el helper hace BEGIN/COMMIT/ROLLBACK y NO
 * libera el client (lo hace el caller en su finally).
 */
export async function ejecutarConCorrida(
  client: PoolClient,
  input: CrearCorridaInput,
  body: (corridaId: string) => Promise<void>
): Promise<CorridaResultado> {
  await client.query("BEGIN");
  try {
    const ins = await client.query(
      `INSERT INTO corridas_precios
         (org_id, tipo, lista_id, proveedor_id, parametros, descripcion, usuario_id, reversion_de_corrida_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        input.org_id,
        input.tipo,
        input.lista_id ?? null,
        input.proveedor_id ?? null,
        JSON.stringify(input.parametros ?? {}),
        input.descripcion,
        input.usuario_id,
        input.reversion_de_corrida_id ?? null,
      ]
    );
    const corridaId = ins.rows[0].id as string;

    await client.query(`SELECT set_config('app.corrida_id', $1, true)`, [corridaId]);
    await client.query(`SELECT set_config('app.corrida_usuario', $1, true)`, [input.usuario_id]);
    await client.query(`SELECT set_config('app.corrida_motivo', $1, true)`, [input.descripcion]);

    await body(corridaId);

    const cnt = await client.query(
      `SELECT COUNT(DISTINCT producto_id)::int AS n FROM historial_precios WHERE corrida_id = $1`,
      [corridaId]
    );
    const productosAfectados = (cnt.rows[0]?.n as number) ?? 0;
    await client.query(`UPDATE corridas_precios SET productos_afectados = $1 WHERE id = $2`, [
      productosAfectados,
      corridaId,
    ]);

    await client.query("COMMIT");
    return { corridaId, productosAfectados };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}
