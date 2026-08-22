// Helpers puros para el picker de "Vincular" con sugerencias por nombre (trigram).
// El ranking por similitud lo hace el endpoint /api/{productos,equipos}/sugerencias;
// acá solo: con qué texto buscar y cómo mostrar el score.

export interface ItemBuscable {
  codigo_proveedor?: string | null;
  nombre_proveedor?: string | null;
}

/** Texto con el que se piden sugerencias: el nombre del proveedor, o el código si el nombre no aporta. */
export function textoSugerencia(item: ItemBuscable): string {
  const nombre = (item.nombre_proveedor ?? "").trim();
  const codigo = (item.codigo_proveedor ?? "").trim();
  if (!nombre || nombre.toLowerCase() === codigo.toLowerCase()) return codigo;
  return nombre;
}

/** Score de similitud (0..1) a porcentaje legible, clampeado. */
export function porcentajeMatch(score: number): string {
  const pct = Math.max(0, Math.min(1, score)) * 100;
  return `${Math.round(pct)}%`;
}
