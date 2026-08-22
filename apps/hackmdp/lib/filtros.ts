/**
 * Motor de filtros en memoria para las listas (clientes, contactos, laboratorios).
 * Puro y sin React: testeable con `node:test`. La UI (FiltrosSidebar) usa esto.
 *
 * Dos tipos de filtro:
 *  - 'multi': el usuario elige uno o varios valores de un conjunto. La fila pasa
 *    si su valor está entre los elegidos. Las opciones se derivan de los datos.
 *    Para campos que son una LISTA por fila (ej. tags), usar `getLista`.
 *  - 'bool': tri-estado (todos / sí / no) sobre una condición de la fila.
 */

export type FiltroTipo = 'multi' | 'bool';

export interface FiltroDef<T> {
  id: string;
  label: string;
  tipo: FiltroTipo;
  /** Valor único de la fila (para 'multi' de campo simple, o 'bool'). */
  get?: (row: T) => string | boolean | null | undefined;
  /** Valores de la fila cuando el campo es una lista (ej. tags). Solo 'multi'. */
  getLista?: (row: T) => (string | null | undefined)[];
  /** Muestra un buscador de opciones (para conjuntos grandes, ej. provincia). */
  buscable?: boolean;
  /**
   * Valor con el que arranca el filtro (y al que vuelve "Limpiar"). Ausente =
   * arranca sin filtrar. Sirve cuando la lista trae de todo pero la vista por
   * defecto es un recorte: los clientes vienen con los inactivos incluidos y
   * este filtro arranca en 'si', así el usuario puede pasar a "Todos" y verlos.
   */
  defecto?: ValorFiltro;
}

/** Estado por filtro: 'multi' → valores elegidos; 'bool' → 'si' | 'no'. Ausente = sin filtrar. */
export type ValorFiltro = string[] | 'si' | 'no';
export type FiltroEstado = Record<string, ValorFiltro | undefined>;

const norm = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Valores distintos presentes en los datos para un filtro 'multi' (ordenados). */
export function derivarOpciones<T>(data: T[], def: FiltroDef<T>): string[] {
  if (def.tipo !== 'multi') return [];
  const set = new Set<string>();
  for (const row of data) {
    if (def.getLista) {
      for (const v of def.getLista(row)) {
        const n = norm(v);
        if (n) set.add(n);
      }
    } else if (def.get) {
      const n = norm(def.get(row));
      if (n) set.add(n);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

/** ¿Pasa la fila este filtro con el valor de estado dado? */
export function filaPasa<T>(row: T, def: FiltroDef<T>, val: ValorFiltro | undefined): boolean {
  if (val == null) return true;

  if (def.tipo === 'bool') {
    const activo = !!(def.get ? def.get(row) : false);
    return val === 'si' ? activo : !activo;
  }

  // 'multi'
  if (!Array.isArray(val) || val.length === 0) return true;
  if (def.getLista) {
    const vals = def.getLista(row).map(norm).filter(Boolean) as string[];
    return vals.some((v) => val.includes(v));
  }
  const v = norm(def.get ? def.get(row) : null);
  return v != null && val.includes(v);
}

/** Aplica todos los filtros (Y) sobre los datos. */
export function filtrar<T>(data: T[], defs: FiltroDef<T>[], estado: FiltroEstado): T[] {
  return data.filter((row) => defs.every((def) => filaPasa(row, def, estado[def.id])));
}

/** Estado con el que arranca el panel: el `defecto` de cada def, si lo tiene. */
export function estadoInicial<T>(defs: FiltroDef<T>[]): FiltroEstado {
  const estado: FiltroEstado = {};
  for (const def of defs) {
    if (def.defecto !== undefined) estado[def.id] = def.defecto;
  }
  return estado;
}

/** Un multi vacío es lo mismo que no filtrar: los equipara para comparar. */
const sinFiltrar = (v: ValorFiltro | undefined): ValorFiltro | undefined =>
  Array.isArray(v) && v.length === 0 ? undefined : v;

const mismoValor = (a: ValorFiltro | undefined, b: ValorFiltro | undefined): boolean => {
  const x = sinFiltrar(a);
  const y = sinFiltrar(b);
  if (Array.isArray(x) && Array.isArray(y)) {
    if (x.length !== y.length) return false;
    const ordenado = [...y].sort();
    return [...x].sort().every((v, i) => v === ordenado[i]);
  }
  return x === y;
};

/**
 * Cantidad de filtros que el usuario movió respecto del defecto — o sea, lo que
 * "Limpiar" va a deshacer. Un filtro parado en su defecto NO cuenta (si no, la
 * lista de clientes arrancaría siempre con el contador en 1).
 * Sin `defs`, el defecto de todos es "sin filtrar" (comportamiento viejo).
 */
export function contarActivos<T>(estado: FiltroEstado, defs?: FiltroDef<T>[]): number {
  const defectos = estadoInicial(defs ?? []);
  const ids = new Set([...Object.keys(estado), ...Object.keys(defectos)]);
  let n = 0;
  for (const id of ids) {
    if (!mismoValor(estado[id], defectos[id])) n++;
  }
  return n;
}
