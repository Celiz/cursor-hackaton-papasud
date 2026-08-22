import { z } from "zod";
import { aNumero, type FilaExtraida, type MonedaLista, type CategoriaFila } from "./ia-tipos";

const SYSTEM = `Sos un extractor de listas de precios de proveedores. Recibís el contenido de un archivo (una lista de precios exportada a texto: puede ser CSV de un Excel, o el texto de un PDF, incluida una matriz de precios).

Extraé UNA fila por producto con precio. Respondé SOLO con JSON válido, sin markdown ni code fences, con esta forma exacta:
{"filas":[{"codigo": string|null, "nombre": string, "descripcion": string|null, "precio": number|null, "precio_con_iva": number|null, "moneda": "ARS"|"USD"|null, "categoria": "equipo"|"insumo"|null}]}

Reglas:
- "precio" = precio neto / sin IVA. Si la lista da precio con IVA aparte, poné ese valor en "precio_con_iva".
- Si la lista aclara "sin IVA" y no hay otra columna, poné el valor en "precio" y "precio_con_iva": null.
- "moneda": detectá por símbolos/columnas ($, ARS, pesos → "ARS"; US$, USD, u$s, dólar → "USD"). Si no se sabe, null.
- "codigo": el código/SKU del proveedor si existe (ej. "EQ 0740", "9351001"); si no, null.
- Los números van como number JS: sin símbolo de moneda, sin separador de miles, punto decimal.
- MATRIZ: si es una matriz (filas = variantes, columnas = modelos, celdas = precios), APLANÁ TODAS las celdas con precio, una fila de salida por cada una (no solo la primera fila de la matriz), con "nombre" combinando la etiqueta de fila y la de columna (ej. "103AP V4 SB - Na/K"). El "codigo" de columna (ej. "EQ 0740") se repite en varias celdas de esa columna: NO lo repitas en el JSON de salida — poné "codigo": null en esas filas aplanadas, porque el "nombre" ya identifica la combinación única y un "codigo" repetido se trataría como fila duplicada.
- Ignorá encabezados, totales, notas al pie y filas sin precio.
- Si no hay productos con precio, devolvé {"filas":[]}.`;

export function construirPrompt(texto: string, hint?: { tipo?: string }): { system: string; user: string } {
  const extra = hint?.tipo ? `\nContexto: esta lista es de tipo "${hint.tipo}".` : "";
  return { system: SYSTEM, user: `Contenido del archivo:${extra}\n\n${texto}` };
}

function normMoneda(v: unknown): MonedaLista | null {
  const s = String(v ?? "").toUpperCase();
  if (/USD|U\$S|US\$|DÓLAR|DOLAR/.test(s)) return "USD";
  if (/ARS|PESO|\$/.test(s)) return "ARS";
  return null;
}
function normCategoria(v: unknown): CategoriaFila | null {
  const s = String(v ?? "").toLowerCase();
  if (s === "equipo") return "equipo";
  if (s === "insumo") return "insumo";
  return null;
}

// Validación laxa a propósito: zod solo garantiza que "filas" es un array de objetos; la coerción
// de tipos y el default a null se hacen abajo en el .map() de normalización.
const FilaSchema = z.object({
  codigo: z.any().optional(),
  nombre: z.any(),
  descripcion: z.any().optional(),
  precio: z.any().optional(),
  precio_con_iva: z.any().optional(),
  moneda: z.any().optional(),
  categoria: z.any().optional(),
});
const SobreSchema = z.object({ filas: z.array(FilaSchema) });

/** Saca code fences, parsea JSON, valida forma y normaliza cada fila a FilaExtraida. */
export function parseSobreLLM(raw: string): FilaExtraida[] {
  let s = raw.trim();
  // sacar ```json ... ``` o ``` ... ```
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // recortar a las llaves externas por si viene texto alrededor
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first > 0 || last < s.length - 1) s = s.slice(first, last + 1);
  const parsed = SobreSchema.parse(JSON.parse(s));
  return parsed.filas
    .map((f) => ({
      codigo: f.codigo != null && String(f.codigo).trim() ? String(f.codigo).trim() : null,
      nombre: String(f.nombre ?? "").trim(),
      descripcion: f.descripcion != null && String(f.descripcion).trim() ? String(f.descripcion).trim() : null,
      precio: aNumero(f.precio),
      precio_con_iva: aNumero(f.precio_con_iva),
      moneda: normMoneda(f.moneda),
      categoria: normCategoria(f.categoria),
    }));
}
