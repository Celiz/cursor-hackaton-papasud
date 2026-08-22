// "Memoria" de vinculación proveedor↔equipo, hermana de [memoria-proveedor.ts] (que hace lo
// mismo para productos vía producto_proveedores). Para equipos NO hay tabla de mapeo: la
// memoria son las listas anteriores del mismo proveedor. Cuando alguien vincula a mano un
// ítem (PATCH de items), ese equipo_id queda en proveedor_lista_items; al importar la lista
// del mes siguiente, el mismo codigo_proveedor tiene que heredar esa vinculación en vez de
// volver a salir "sin vincular".
//
// Acá vive solo la lógica pura (normalizar el código y armar el índice); la consulta la hace
// la ruta de importación.

export interface ItemVinculadoPrevio {
  codigo_proveedor?: string | null;
  equipo_id?: string | null;
}

/**
 * Normaliza un código de proveedor para comparar: sin espacios (ni internos: "G-142 D"
 * y "G-142D" son el mismo artículo) y en minúsculas.
 */
export function normalizarCodigoProveedor(codigo: string | null | undefined): string {
  return (codigo ?? "").toString().replace(/\s+/g, "").toLowerCase();
}

/**
 * Índice codigo_proveedor → equipo_id a partir de los ítems vinculados de listas anteriores
 * del mismo proveedor. Las filas deben venir ordenadas de MÁS RECIENTE a más vieja: gana la
 * primera, que es la última decisión humana sobre ese código.
 */
export function construirMemoriaEquipos(filas: ItemVinculadoPrevio[]): Map<string, string> {
  const memoria = new Map<string, string>();
  for (const fila of filas) {
    const codigo = normalizarCodigoProveedor(fila.codigo_proveedor);
    const equipoId = fila.equipo_id ?? null;
    if (!codigo || !equipoId) continue;
    if (!memoria.has(codigo)) memoria.set(codigo, equipoId);
  }
  return memoria;
}

/** Equipo recordado para un código de la lista nueva, o null si no hay memoria. */
export function recordarEquipo(
  memoria: Map<string, string>,
  codigo: string | null | undefined,
): string | null {
  const clave = normalizarCodigoProveedor(codigo);
  if (!clave) return null;
  return memoria.get(clave) ?? null;
}
