import { query } from "@/lib/db";

/**
 * Ejecuta una consulta de KPIs de forma aislada.
 *
 * Las páginas de KPIs corren varias consultas independientes; si una falla
 * (p.ej. una vista materializada sin poblar, una tabla ausente en cierto
 * deploy, un timeout puntual) NO debe tumbar todo el dashboard. En vez de
 * propagar el error, lo loguea y devuelve `{ rows: [] }`, de modo que esa
 * métrica caiga a su propio fallback (`rows[0] ?? {...}` / `rows.map(...)`)
 * y el resto de las tarjetas se sigan mostrando.
 */
export async function safeQuery(
  label: string,
  sql: string,
  params: unknown[] = []
): Promise<{ rows: any[] }> {
  try {
    return await query(sql, params as any[]);
  } catch (e: any) {
    console.error(`[ventas-kpis] consulta "${label}" falló:`, e?.message ?? e);
    return { rows: [] };
  }
}
