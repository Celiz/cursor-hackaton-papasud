export type MonedaLista = "ARS" | "USD";
export type CategoriaFila = "equipo" | "insumo";

export interface FilaExtraida {
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  precio_con_iva: number | null;
  moneda: MonedaLista | null;
  categoria: CategoriaFila | null;
}

export interface ResultadoExtraccion {
  filas: FilaExtraida[];
  alertas: string[];
  modelo: string;
}

/**
 * Convierte a número tolerando es-AR ("$ 1.234,50" → 1234.5) y US ("1234.5"). null si no es número.
 *
 * LIMITACIÓN CONOCIDA: un string con punto y exactamente 3 decimales (ej. "0.925") se interpreta
 * como miles es-AR (→925), no como decimal. Es una ambigüedad irresoluble sin contexto de locale.
 * Mitigado porque el LLM devuelve números planos (no strings) y porque la importación IA siempre
 * pasa por preview humano antes de insertar.
 */
export function aNumero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/[^0-9.,-]/g, ""); // saca "$", "US$", espacios, etc.
  if (!s) return null;
  if (s.includes(",")) {
    // formato es-AR: punto = miles, coma = decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      // varios puntos y sin coma → puntos son miles ("1.234.567")
      s = s.replace(/\./g, "");
    } else if (dotCount === 1) {
      // un solo punto sin coma: si tiene 3 dígitos exactos después ("3.548") es
      // separador de miles es-AR; si no ("1234.5") es punto decimal US.
      const afterDot = s.split(".")[1];
      if (afterDot && afterDot.length === 3) {
        s = s.replace(/\./g, "");
      }
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
