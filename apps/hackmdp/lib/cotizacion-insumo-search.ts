/**
 * Utilidades puras para el buscador de insumos por equipo en presupuestos.
 * Sin acceso a DB — testeable con `node:test` vía `npx tsx --test`.
 */

export function splitSearchWords(search: string): string[] {
  return search.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 0);
}

export interface EquipoLite {
  id: string;
  marca: string | null;
  modelo: string | null;
}

/**
 * Dadas las palabras del query y los equipos candidatos (que ya matchearon
 * alguna palabra en marca/modelo), devuelve las palabras-filtro: las que NO
 * identifican a ningún equipo y por lo tanto deben filtrar los insumos.
 */
export function getFilterWords(words: string[], equipos: EquipoLite[]): string[] {
  return words.filter((word) => {
    const matchesSomeEquipo = equipos.some((e) => {
      const hay = `${e.marca ?? ""} ${e.modelo ?? ""}`.toLowerCase();
      return hay.includes(word);
    });
    return !matchesSomeEquipo;
  });
}
