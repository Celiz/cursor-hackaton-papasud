import type { PoolClient } from 'pg';
import { query } from '@/lib/db';
import {
  estadoInventarioParaTipo,
  estadoCabeceraDesdeItems,
  type TipoRegistro,
  type RenglonInput,
} from './prestamos-garantias';

export interface CrearInput {
  org_id: string;
  tipo: TipoRegistro;
  cliente_id?: string | null;
  codigo?: string | null;
  fecha_salida?: string | null;
  transporte_envio?: string | null;
  remito_salida?: string | null;
  remito_entrada?: string | null;
  numero_orden?: string | null;
  observaciones?: string | null;
  created_by?: string | null;
  renglones: RenglonInput[];
}

/** Campos de cabecera editables (sin renglones). */
const CAMPOS_EDITABLES = [
  'cliente_id', 'codigo', 'fecha_salida', 'transporte_envio', 'transporte_retorno',
  'remito_salida', 'remito_entrada', 'numero_orden', 'observaciones',
] as const;

/** Crea cabecera + renglones y marca las unidades serializadas como fuera. Transaccional. */
export async function crearRegistro(client: PoolClient, input: CrearInput): Promise<string> {
  await client.query('BEGIN');
  try {
    const esPrestamo = input.tipo === 'prestamo';
    const cab = await client.query(
      `INSERT INTO prestamos_garantias
        (org_id, tipo, cliente_id, codigo, estado, fecha_salida, transporte_envio,
         remito_salida, remito_entrada, numero_orden, observaciones, created_by)
       VALUES ($1,$2,$3,$4,'abierto',$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        input.org_id,
        input.tipo,
        input.cliente_id ?? null,
        input.codigo ?? null,
        input.fecha_salida ?? null,
        input.transporte_envio ?? null,
        esPrestamo ? (input.remito_salida ?? null) : null,
        esPrestamo ? (input.remito_entrada ?? null) : null,
        !esPrestamo ? (input.numero_orden ?? null) : null,
        input.observaciones ?? null,
        input.created_by ?? null,
      ]
    );
    const id = cab.rows[0].id as string;
    const estadoInv = estadoInventarioParaTipo(input.tipo);

    for (const r of input.renglones) {
      await client.query(
        `INSERT INTO prestamos_garantias_items
          (prestamo_garantia_id, tipo_item, equipo_id, equipo_unidad_id, producto_id,
           numero_serie, descripcion, cantidad, estado)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'afuera')`,
        [
          id, r.tipo_item, r.equipo_id ?? null, r.equipo_unidad_id ?? null,
          r.producto_id ?? null, r.numero_serie ?? null, r.descripcion, r.cantidad ?? 1,
        ]
      );
      if (r.equipo_unidad_id) {
        await client.query(
          `UPDATE equipos_unidades SET estado_general = $1 WHERE id = $2 AND org_id = $3`,
          [estadoInv, r.equipo_unidad_id, input.org_id]
        );
      }
    }
    await client.query('COMMIT');
    return id;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

/** Marca renglones como devueltos, revierte sus unidades a stock y recalcula la cabecera. */
export async function devolverItems(
  client: PoolClient,
  args: { org_id: string; registro_id: string; item_ids?: string[] }
): Promise<void> {
  // item_ids undefined → devolver todos los renglones afuera; [] explícito → no-op.
  if (args.item_ids !== undefined && args.item_ids.length === 0) return;
  await client.query('BEGIN');
  try {
    const filtroIds = args.item_ids !== undefined;
    const sel = await client.query(
      `SELECT i.id, i.equipo_unidad_id
         FROM prestamos_garantias_items i
         JOIN prestamos_garantias p ON p.id = i.prestamo_garantia_id
        WHERE i.prestamo_garantia_id = $1 AND p.org_id = $2 AND i.estado = 'afuera'
          ${filtroIds ? 'AND i.id = ANY($3::uuid[])' : ''}`,
      filtroIds ? [args.registro_id, args.org_id, args.item_ids] : [args.registro_id, args.org_id]
    );
    for (const it of sel.rows) {
      await client.query(
        `UPDATE prestamos_garantias_items SET estado='devuelto', fecha_retorno=CURRENT_DATE WHERE id=$1`,
        [it.id]
      );
      if (it.equipo_unidad_id) {
        await client.query(
          `UPDATE equipos_unidades SET estado_general='stock' WHERE id=$1 AND org_id=$2`,
          [it.equipo_unidad_id, args.org_id]
        );
      }
    }
    const rest = await client.query(
      `SELECT estado FROM prestamos_garantias_items WHERE prestamo_garantia_id=$1`,
      [args.registro_id]
    );
    const nuevoEstado = estadoCabeceraDesdeItems(rest.rows);
    await client.query(
      `UPDATE prestamos_garantias
          SET estado=$1,
              fecha_retorno = CASE WHEN $1='devuelto' THEN COALESCE(fecha_retorno, CURRENT_DATE) ELSE NULL END,
              updated_at=NOW()
        WHERE id=$2 AND org_id=$3`,
      [nuevoEstado, args.registro_id, args.org_id]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

/** Actualiza campos de cabecera (whitelist). No toca renglones. */
export async function actualizarCabecera(
  client: PoolClient,
  args: { org_id: string; registro_id: string; campos: Record<string, unknown> }
): Promise<void> {
  const entries = Object.entries(args.campos).filter(([k]) =>
    (CAMPOS_EDITABLES as readonly string[]).includes(k)
  );
  if (entries.length === 0) return;
  const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const vals = entries.map(([, v]) => v ?? null);
  vals.push(args.registro_id, args.org_id);
  await client.query(
    `UPDATE prestamos_garantias SET ${sets}, updated_at=NOW()
      WHERE id=$${vals.length - 1} AND org_id=$${vals.length}`,
    vals
  );
}

/**
 * Sincroniza los renglones existentes al editar la cabecera: actualiza el texto
 * (y la cantidad) de los que se conservan y elimina los que el usuario quitó,
 * revirtiendo a stock las unidades serializadas que seguían afuera. Recalcula el
 * estado de la cabecera. NO agrega renglones nuevos (eso es sólo en la creación).
 * Corre dentro de la transacción del PATCH (no abre BEGIN/COMMIT propio).
 */
export async function sincronizarItems(
  client: PoolClient,
  args: {
    org_id: string;
    registro_id: string;
    items: Array<{ id?: string; descripcion?: string; cantidad?: number }>;
  }
): Promise<void> {
  // Ítems existentes del registro (con chequeo de org vía join).
  const cur = await client.query(
    `SELECT i.id, i.equipo_unidad_id, i.estado
       FROM prestamos_garantias_items i
       JOIN prestamos_garantias p ON p.id = i.prestamo_garantia_id
      WHERE i.prestamo_garantia_id = $1 AND p.org_id = $2`,
    [args.registro_id, args.org_id]
  );
  const curById = new Map(cur.rows.map((r: any) => [r.id, r]));
  const keep = new Set(
    args.items.map((it) => it.id).filter((id): id is string => !!id && curById.has(id))
  );

  // Eliminar los renglones que ya no están; revertir su unidad si seguía afuera.
  const aEliminar = cur.rows.filter((r: any) => !keep.has(r.id));
  for (const it of aEliminar) {
    if (it.equipo_unidad_id && it.estado === 'afuera') {
      await client.query(
        `UPDATE equipos_unidades SET estado_general='stock' WHERE id=$1 AND org_id=$2`,
        [it.equipo_unidad_id, args.org_id]
      );
    }
  }
  if (aEliminar.length > 0) {
    await client.query(
      `DELETE FROM prestamos_garantias_items
        WHERE prestamo_garantia_id=$1 AND id = ANY($2::uuid[])`,
      [args.registro_id, aEliminar.map((r: any) => r.id)]
    );
  }

  // Actualizar texto/cantidad de los renglones conservados.
  for (const it of args.items) {
    if (!it.id || !keep.has(it.id)) continue;
    const desc = (it.descripcion ?? '').trim();
    if (!desc) continue; // no dejamos descripciones vacías
    await client.query(
      `UPDATE prestamos_garantias_items
          SET descripcion=$1, cantidad=$2
        WHERE id=$3 AND prestamo_garantia_id=$4`,
      [desc, it.cantidad ?? 1, it.id, args.registro_id]
    );
  }

  // Recalcular estado de la cabecera (un delete puede dejar todo devuelto).
  const rest = await client.query(
    `SELECT estado FROM prestamos_garantias_items WHERE prestamo_garantia_id=$1`,
    [args.registro_id]
  );
  const nuevoEstado = estadoCabeceraDesdeItems(rest.rows);
  await client.query(
    `UPDATE prestamos_garantias
        SET estado=$1,
            fecha_retorno = CASE WHEN $1='devuelto' THEN COALESCE(fecha_retorno, CURRENT_DATE) ELSE NULL END,
            updated_at=NOW()
      WHERE id=$2 AND org_id=$3`,
    [nuevoEstado, args.registro_id, args.org_id]
  );
}

/** Elimina un registro; revierte a stock las unidades que sigan afuera. Transaccional. */
export async function eliminarRegistro(
  client: PoolClient,
  args: { org_id: string; registro_id: string }
): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(
      `UPDATE equipos_unidades SET estado_general='stock'
        WHERE org_id=$2 AND id IN (
          SELECT i.equipo_unidad_id FROM prestamos_garantias_items i
           WHERE i.prestamo_garantia_id=$1 AND i.equipo_unidad_id IS NOT NULL AND i.estado='afuera'
        )`,
      [args.registro_id, args.org_id]
    );
    await client.query(
      `DELETE FROM prestamos_garantias WHERE id=$1 AND org_id=$2`,
      [args.registro_id, args.org_id]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

/** Lista registros de un tipo con cliente + renglones (json_agg). Read-only. */
export async function listarRegistros(args: {
  org_id: string;
  tipo: TipoRegistro;
  estado?: string | null;
}): Promise<any[]> {
  const params: any[] = [args.org_id, args.tipo];
  let sql = `
    SELECT p.*,
      CASE WHEN c.id IS NOT NULL THEN
        json_build_object('id', c.id, 'nombre', c.nombre, 'nombre_fantasia', c.nombre_fantasia)
      END AS cliente,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', i.id, 'tipo_item', i.tipo_item, 'equipo_id', i.equipo_id,
          'equipo_unidad_id', i.equipo_unidad_id, 'producto_id', i.producto_id,
          'numero_serie', i.numero_serie, 'descripcion', i.descripcion,
          'cantidad', i.cantidad, 'estado', i.estado, 'fecha_retorno', i.fecha_retorno
        ) ORDER BY i.descripcion)
        FROM prestamos_garantias_items i WHERE i.prestamo_garantia_id = p.id
      ), '[]'::json) AS items
    FROM prestamos_garantias p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.org_id = $1 AND p.tipo = $2`;
  if (args.estado) {
    sql += ` AND p.estado = $3`;
    params.push(args.estado);
  }
  sql += ` ORDER BY p.created_at DESC`;
  const r = await query(sql, params);
  return r.rows;
}
