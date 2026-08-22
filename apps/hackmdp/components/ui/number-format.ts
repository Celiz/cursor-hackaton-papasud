/**
 * Helpers de formato numérico es-AR (miles con punto, decimal con coma).
 * Lógica pura, sin React, para poder testearla aparte de <NumberInput>.
 */

/**
 * Parser de números tolerante a la configuración regional argentina.
 *
 * El teclado numérico en es-AR escribe COMA como tecla decimal, pero
 * `<input type="number">` sólo acepta punto. Esto convierte ambos formatos:
 *  - Si hay coma  → la coma es el separador decimal y los puntos son miles (es-AR).
 *  - Varios puntos sin coma → todos son separadores de miles.
 *  - Un solo punto sin coma → se respeta como decimal (compat con `type=number`).
 *
 * Devuelve NaN si no hay nada parseable.
 */
export function parseNumeroLocal(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return NaN;
  if (typeof raw === "number") return raw;
  let s = raw.trim();
  if (!s) return NaN;
  const neg = /^-/.test(s);
  s = s.replace(/[^\d.,]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return neg ? -n : n;
}

/**
 * Parsea texto YA formateado por este módulo (es-AR canónico): el punto es
 * SIEMPRE separador de miles y la coma SIEMPRE el decimal.
 *
 * Hay que usar esto —y NO `parseNumeroLocal`— sobre lo que produce
 * `formatMientrasEscribe`/`toTextoDisplay`. `parseNumeroLocal` trata un único
 * punto como decimal (compat `type=number`), así que malinterpreta "456.878"
 * (=456878) como 456,878. Ese es el bug de la banda 1.000–999.999.
 */
export function parseFormateadoLocal(s: string | number | null | undefined): number {
  if (s === null || s === undefined) return NaN;
  if (typeof s === "number") return s;
  const limpio = s
    .replace(/\./g, "") // los puntos son SIEMPRE miles
    .replace(",", ".") // la (única) coma es el decimal
    .replace(/[^\d.-]/g, ""); // descartar $, espacios, etc.
  if (limpio === "" || limpio === "-") return NaN;
  const n = parseFloat(limpio);
  return isNaN(n) ? NaN : n;
}

/** Agrupa una cadena de dígitos con puntos de miles (es-AR). Sin ceros a la izquierda. */
export function agruparEntero(digitos: string): string {
  const limpio = digitos.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (limpio === "") return "";
  return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea lo que el usuario va escribiendo: miles con punto, decimal con coma.
 * Respeta una coma como separador decimal y limita a `decimals` decimales.
 */
export function formatMientrasEscribe(raw: string, decimals: number): string {
  const s = raw.replace(/[^\d,]/g, "");
  if (decimals === 0) return agruparEntero(s);
  const i = s.indexOf(",");
  if (i < 0) return agruparEntero(s);
  const intFmt = agruparEntero(s.slice(0, i));
  const decPart = s.slice(i + 1).replace(/,/g, "").slice(0, decimals);
  return (intFmt === "" ? "0" : intFmt) + "," + decPart;
}

/** Muestra un número ya formateado es-AR (miles con punto, `decimals` decimales). */
export function toTextoDisplay(
  v: number | string | null | undefined,
  decimals: number,
): string {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : parseNumeroLocal(v);
  if (isNaN(n)) return "";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Cuenta dígitos + coma a la izquierda de `hasta` (para reposicionar el cursor). */
export function contarSignificativos(str: string, hasta: number): number {
  let c = 0;
  for (let i = 0; i < hasta && i < str.length; i++) {
    const ch = str[i];
    if ((ch >= "0" && ch <= "9") || ch === ",") c++;
  }
  return c;
}

/** Posición del cursor en `str` tras `n` caracteres significativos (dígitos + coma). */
export function caretDesdeSignificativos(str: string, n: number): number {
  if (n <= 0) return 0;
  let c = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if ((ch >= "0" && ch <= "9") || ch === ",") {
      c++;
      if (c === n) return i + 1;
    }
  }
  return str.length;
}

/**
 * Inserta el separador decimal (coma) en `text` en el rango [selStart, selEnd).
 *
 * En el numpad es-AR la tecla decimal es el PUNTO; lo tratamos como coma para que
 * el usuario pueda tipear decimales sin pelear con el formateo de miles (que ya
 * usa puntos). Devuelve el texto YA formateado y la nueva posición del cursor, o
 * `null` si no corresponde insertar (sin decimales, o ya hay una coma).
 */
export function insertarSeparadorDecimal(
  text: string,
  selStart: number,
  selEnd: number,
  decimals = 2,
): { text: string; caret: number } | null {
  if (decimals <= 0) return null; // campos enteros (cantidades) no llevan decimal
  if (text.includes(",")) return null; // ya hay un separador decimal
  const raw = text.slice(0, selStart) + "," + text.slice(selEnd);
  const formatted = formatMientrasEscribe(raw, decimals);
  const sig = contarSignificativos(raw, selStart + 1);
  const caret = caretDesdeSignificativos(formatted, sig);
  return { text: formatted, caret };
}
