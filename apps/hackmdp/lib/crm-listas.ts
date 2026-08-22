// Lógica pura y compartida para listas administrables de CRM (fuentes de lead
// y tipos de actividad). SIN imports externos: se testea con `npx tsx`.

/**
 * Normaliza una respuesta de API que puede ser un array crudo `[...]` o un
 * objeto paginado `{ data: [...] }`. Devuelve siempre un array.
 * Evita el bug de tratar `{ data }` como si fuera un array (=> longitud 0).
 */
export function asArray<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

/** Slug estable para ids de items propios: "Demo de Equipo" -> "custom_demo_de_equipo". */
export function slugifyId(label: string, prefix = "custom_"): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return prefix + base;
}

export interface ItemId {
  id: string;
}

/**
 * Lista efectiva para el SELECTOR: predeterminados visibles (los no-ocultos)
 * seguidos de los propios. Los propios nunca están en `ocultos`.
 */
export function mergeVisibles<T extends ItemId>(builtins: T[], custom: T[], ocultos: string[]): T[] {
  const set = new Set(ocultos);
  return [...builtins.filter((b) => !set.has(b.id)), ...custom];
}
