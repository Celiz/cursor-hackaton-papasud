// Arma el texto del toast tras importar una lista de precios. Un PDF multi-categoría
// (ej. Gelec) crea más de una lista (Equipos + Insumos); ahí el mensaje las nombra una
// por una. Excel/CSV o PDF de una sola categoría → mensaje clásico de items + vinculados.

export interface ListaCreada {
  nombre: string;
  tipo: string;
  items: number;
}

export interface ImportResumenData {
  listas?: ListaCreada[];
  resultados: { procesados: number; vinculados: number };
}

/** Etiqueta corta: el sufijo entre paréntesis del nombre ("... (Equipos)") o el tipo. */
function etiquetaLista(l: ListaCreada): string {
  const sufijo = l.nombre.match(/\(([^)]+)\)\s*$/)?.[1];
  if (sufijo) return sufijo;
  return l.tipo === "equipos" ? "Equipos" : "Productos";
}

export function resumenImportacion(data: ImportResumenData): string {
  const listas = data.listas ?? [];
  if (listas.length > 1) {
    const detalle = listas.map((l) => `${etiquetaLista(l)} (${l.items})`).join(" · ");
    return `${listas.length} listas creadas: ${detalle} — ${data.resultados.vinculados} vinculados`;
  }
  return `Importación completada: ${data.resultados.procesados} items, ${data.resultados.vinculados} vinculados`;
}
