/**
 * Tipos y utilidades puras de los adjuntos por ítem de una instalación.
 */

export type TipoAdjunto = 'foto' | 'manual' | 'otro';

export interface AdjuntoItem {
  id: string;
  item_ref: string;
  tipo: TipoAdjunto;
  url: string;
  nombre_archivo: string | null;
  tamano_bytes: number | null;
  descripcion: string | null;
  autor_nombre: string | null;
  created_at: string;
}

/** El tipo sale del mime del archivo, no se le pregunta al usuario. */
export function tipoAdjuntoDesdeMime(mime: string): TipoAdjunto {
  if (mime.startsWith('image/')) return 'foto';
  if (mime === 'application/pdf') return 'manual';
  return 'otro';
}

/**
 * Normaliza una fila cruda de la base a un AdjuntoItem bien tipado.
 *
 * `tamano_bytes` es bigint en la base y node-postgres devuelve bigint como
 * string, no como number: sin esta conversión el contrato de tipos mentía.
 */
export function normalizarAdjunto(row: Record<string, unknown>): AdjuntoItem {
  const tamanoBytes = row.tamano_bytes;
  return {
    id: String(row.id),
    item_ref: String(row.item_ref),
    tipo: row.tipo as TipoAdjunto,
    url: String(row.url),
    nombre_archivo: (row.nombre_archivo as string | null) ?? null,
    tamano_bytes:
      tamanoBytes === null || tamanoBytes === undefined ? null : Number(tamanoBytes),
    descripcion: (row.descripcion as string | null) ?? null,
    autor_nombre: (row.autor_nombre as string | null) ?? null,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

/**
 * Agrupa una lista plana de adjuntos por item_ref (item_ref → adjuntos).
 *
 * item_ref es `text`, no una foreign key: además de los uuid de
 * instalaciones_items conviven claves sintéticas "eu-<uuid>" para equipos
 * que llegan de una oportunidad vinculada y no tienen fila propia. Ambas
 * conviven en el mismo Map. Se preserva el orden de entrada dentro de cada
 * balde (la API ya devuelve las filas ordenadas por created_at ASC).
 */
export function agruparPorItem(adjuntos: AdjuntoItem[]): Map<string, AdjuntoItem[]> {
  const porItem = new Map<string, AdjuntoItem[]>();
  for (const a of adjuntos) {
    const lista = porItem.get(a.item_ref) ?? [];
    lista.push(a);
    porItem.set(a.item_ref, lista);
  }
  return porItem;
}
