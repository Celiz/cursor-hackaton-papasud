import { normalizar, tokenizar, quitarSeparadores } from "./buscador";

/**
 * Construcción del filtro de búsqueda del lado SQL.
 *
 * La búsqueda vieja hacía un único `nombre ILIKE '%texto%'`, o sea que solo
 * encontraba coincidencias contiguas y exactas. Con "DE SINGLAU PABLO DANIEL"
 * guardado en la base, buscar "pablo desinglau" no devolvía nada: ni el orden
 * (apellido primero) ni el espacio coincidían.
 *
 * Ahora la búsqueda parte el texto en palabras y exige que todas aparezcan, en
 * cualquier orden, sobre un texto normalizado (sin acentos, minúsculas). Además
 * compara contra una variante sin separadores, para que "desinglau" encuentre
 * "DE SINGLAU".
 *
 * Es la misma semántica que `lib/buscador.ts` aplica del lado del cliente.
 */

/**
 * Escapa los comodines de LIKE (%, _) y la barra invertida en una palabra de
 * búsqueda, para que un guión bajo o un porcentaje escritos por el usuario no
 * matcheen de más (sin esto, buscar "lab_ratorio" encuentra "laboratorio"
 * porque el guión bajo de LIKE matchea cualquier carácter). La barra invertida
 * se escapa PRIMERO: si no, se duplicarían los escapes que agregamos acá.
 */
function escaparComodinesLike(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Columnas donde se busca un cliente. Se concatenan en un solo texto por fila. */
const COLUMNAS_BUSQUEDA_CLIENTE = [
  "nombre",
  "nombre_fantasia",
  "cuit",
  "identificador_legacy",
  "identificador_unico",
];

export interface TokenSearchClause {
  /** Fragmento SQL a concatenar con AND. Ya viene entre paréntesis. */
  sql: string;
  /** Parámetros posicionales, en orden, arrancando en startParam. */
  params: unknown[];
  /** Próximo número de parámetro libre. */
  nextParam: number;
}

/**
 * Filtro de búsqueda por palabras sobre las columnas dadas. Devuelve null si no
 * hay nada que buscar (búsqueda vacía o solo espacios).
 *
 * `prefix` es el alias de la tabla con el punto incluido, por ejemplo "p.".
 */
export function buildTokenSearchClause(
  columnas: string[],
  search: string,
  prefix: string,
  startParam: number,
): TokenSearchClause | null {
  const palabras = tokenizar(search);
  if (palabras.length === 0 || columnas.length === 0) return null;

  const params: unknown[] = [];
  let paramCount = startParam;

  const cols = columnas.map((c) => `${prefix}${c}`).join(", ");
  // Texto de búsqueda por fila: todas las columnas en uno, sin acentos.
  const texto = `unaccent(lower(concat_ws(' ', ${cols})))`;
  // Misma cosa sin separadores, para que "desinglau" encuentre "DE SINGLAU".
  const textoSinSeparadores = `regexp_replace(${texto}, '[^a-z0-9]', '', 'g')`;

  // Cada palabra tiene que aparecer, en cualquier orden.
  const condiciones = palabras.map((palabra) => {
    const cond =
      `(${texto} LIKE $${paramCount} ESCAPE '\\' OR ${textoSinSeparadores} LIKE $${paramCount + 1} ESCAPE '\\')`;
    params.push(
      `%${escaparComodinesLike(palabra)}%`,
      `%${escaparComodinesLike(quitarSeparadores(palabra))}%`,
    );
    paramCount += 2;
    return cond;
  });

  return {
    sql: `(${condiciones.join(" AND ")})`,
    params,
    nextParam: paramCount,
  };
}

/**
 * Filtro de búsqueda de clientes: el de palabras, más las dos reglas propias
 * del sistema viejo (identificador "CLI-1006" y número de cliente suelto).
 */
export function buildClienteSearchClause(
  search: string,
  prefix: string,
  startParam: number,
): TokenSearchClause | null {
  const searchTerm = search.trim();

  // "CLI-1006" -> el identificador del sistema viejo, match exacto.
  const cliMatch = searchTerm.match(/^CLI-?(\d+)$/i);
  if (cliMatch) {
    return {
      sql: `(${prefix}identificador_legacy = $${startParam})`,
      params: [cliMatch[1]],
      nextParam: startParam + 1,
    };
  }

  const base = buildTokenSearchClause(
    COLUMNAS_BUSQUEDA_CLIENTE,
    searchTerm,
    prefix,
    startParam,
  );
  if (!base) return null;

  // Un número suelto puede ser el identificador del cliente: match exacto.
  if (/^\d+$/.test(searchTerm)) {
    return {
      sql: `(${base.sql} OR ${prefix}identificador_unico = $${base.nextParam})`,
      params: [...base.params, parseInt(searchTerm, 10)],
      nextParam: base.nextParam + 1,
    };
  }

  return base;
}
