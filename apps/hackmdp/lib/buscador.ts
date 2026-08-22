/**
 * Semántica de búsqueda de toda la app.
 *
 * La búsqueda vieja hacía un único `texto.includes(consulta)`, o sea que solo
 * encontraba coincidencias contiguas y exactas. Con "CORDERO, LUIS RAUL"
 * guardado en la base, buscar "luis cordero" no devolvía nada: ni el orden ni
 * la coma coincidían.
 *
 * Acá la consulta se parte en palabras y se exige que todas aparezcan, en
 * cualquier orden, sobre un texto normalizado (minúsculas, sin acentos).
 * Además se compara contra una variante sin separadores, para que "desinglau"
 * encuentre "DE SINGLAU" y "cordero luis" encuentre "CORDERO, LUIS RAUL".
 *
 * Es la misma semántica que `lib/cliente-search-sql.ts` aplica del lado SQL.
 */

/** Minúsculas y sin acentos. */
export function normalizar(texto: string): string {
  // El rango U+0300-U+036F son las tildes y diéresis combinantes que suelta
  // .normalize("NFD"). Se escribe como \u0300-\u036f (escape ASCII) a
  // propósito para que los bytes del archivo sean seguros y no se pierdan al
  // copiar o formatear.
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Parte la consulta en palabras normalizadas, descartando espacios de más. */
export function tokenizar(consulta: string): string[] {
  return normalizar(consulta).trim().split(/\s+/).filter(Boolean);
}

/** Quita todo lo que no sea letra o número: "de singlau" -> "designlau". */
export function quitarSeparadores(texto: string): string {
  return texto.replace(/[^a-z0-9]/g, "");
}

/**
 * ¿El texto contiene todas las palabras de la consulta, en cualquier orden?
 * Una consulta vacía coincide con todo.
 */
export function coincideBusqueda(texto: string, consulta: string): boolean {
  const palabras = tokenizar(consulta);
  if (palabras.length === 0) return true;

  const normalizado = normalizar(texto);
  const sinSeparadores = quitarSeparadores(normalizado);

  return palabras.every(
    (palabra) =>
      normalizado.includes(palabra) ||
      sinSeparadores.includes(quitarSeparadores(palabra)),
  );
}

/**
 * Aplana cualquier valor de fila a un solo texto buscable. Junta strings y
 * números de objetos y arrays anidados; ignora booleanos, nulos y funciones.
 *
 * Juntar todo en un solo texto antes de comparar es lo que permite que
 * "cordero santa elena" encuentre la fila donde "cordero" está en el nombre y
 * "santa elena" en la localidad.
 */
export function textoDeFila(valor: unknown): string {
  const partes: string[] = [];

  const recorrer = (v: unknown): void => {
    if (v === null || v === undefined) return;
    if (typeof v === "string") {
      partes.push(v);
      return;
    }
    if (typeof v === "number") {
      partes.push(String(v));
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(recorrer);
      return;
    }
    if (typeof v === "object") {
      Object.values(v as Record<string, unknown>).forEach(recorrer);
    }
  };

  recorrer(valor);
  return partes.join(" ");
}
