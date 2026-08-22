export type TipoPrecioLista = "global" | "fijo" | "margen";

export interface ClasificacionPrecioLista {
  /** "global" = usa el margen de la lista; "fijo"/"margen" = excepción del producto. */
  tipo: TipoPrecioLista;
  /** true si el producto tiene una excepción en esta lista. */
  esExcepcion: boolean;
  /** Margen efectivo en %, o null cuando es precio fijo. */
  margenEfectivo: number | null;
}

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

export function clasificarPrecioLista(
  row: {
    lista_precio_fijo?: number | string | null;
    lista_margen_override?: number | string | null;
  },
  margenLista: number,
): ClasificacionPrecioLista {
  const precioFijo = toNum(row.lista_precio_fijo);
  if (precioFijo !== null) {
    return { tipo: "fijo", esExcepcion: true, margenEfectivo: null };
  }
  const override = toNum(row.lista_margen_override);
  if (override !== null) {
    return { tipo: "margen", esExcepcion: true, margenEfectivo: override };
  }
  return { tipo: "global", esExcepcion: false, margenEfectivo: margenLista };
}
