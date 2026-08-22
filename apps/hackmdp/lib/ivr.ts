import type { PoolClient } from "pg";
import { query } from "@/lib/db";

/**
 * Genera el próximo número correlativo de la serie IVR para una org.
 *
 * Serie correlativa propia bajo formato `IVR-NNNNNN`.
 * Los números >= 10000 son cargas legacy/MSSQL fuera de serie y se
 * excluyen del cálculo del próximo.
 *
 * Acepta opcionalmente un client de pg para correr dentro de una transacción.
 */
export async function getNextIvrNumber(
  orgId: string,
  client?: PoolClient
): Promise<string> {
  const sql = `
    SELECT COALESCE(MAX(NULLIF(regexp_replace(nro_factura, '^IVR-', ''), '')::int), 0) AS max_seq
      FROM facturas
     WHERE tipo_factura = 'IVR'
       AND org_id = $1
       AND nro_factura ~ '^IVR-[0-9]+$'
       AND (regexp_replace(nro_factura, '^IVR-', ''))::int < 10000
  `;
  const res = client
    ? await client.query(sql, [orgId])
    : await query(sql, [orgId]);
  const next = (res.rows[0]?.max_seq || 0) + 1;
  return `IVR-${String(next).padStart(6, "0")}`;
}

/**
 * Normaliza lo que el usuario escribe a la forma canónica `IVR-NNNNNN`.
 * Acepta dígitos sueltos ("123"), con prefijo ("IVR-123", "ivr 123") o ya
 * formateado. Devuelve null si no contiene un entero positivo válido.
 */
export function normalizeIvrNumber(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `IVR-${String(n).padStart(6, "0")}`;
}

/**
 * True si ya existe un IVR con ese nro_factura en la org. Acepta opcionalmente
 * un id a excluir (para edición).
 */
export async function ivrNumberExists(
  orgId: string,
  nroFactura: string,
  excludeId?: string,
  client?: PoolClient
): Promise<boolean> {
  const sql = `
    SELECT 1 FROM facturas
     WHERE tipo_factura = 'IVR' AND org_id = $1 AND nro_factura = $2
       ${excludeId ? "AND id <> $3" : ""}
     LIMIT 1
  `;
  const params = excludeId ? [orgId, nroFactura, excludeId] : [orgId, nroFactura];
  const res = client ? await client.query(sql, params) : await query(sql, params);
  return (res.rowCount ?? 0) > 0;
}
