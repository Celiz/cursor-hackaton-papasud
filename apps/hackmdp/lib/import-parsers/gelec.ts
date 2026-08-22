import type { FilaImport } from './gematec';

/**
 * Detecta si un texto de PDF tiene el formato de lista de Gelec
 * (Centrífugas Gelec — "Precios Netos Distribuidor", columnas Modelo/Descripción/Precio Sin IVA).
 */
export function esFormatoGelec(text: string): boolean {
  return (
    text.includes('Gelec') &&
    (text.includes('Precios Netos Distribuidor') || text.includes('Precio Sin IVA'))
  );
}

/** Un código Gelec: empieza con G y, como token suelto, lleva un guion o un dígito. */
function esCodigo(token: string): boolean {
  if (token.length < 3 || token.length > 12) return false;
  if (!/^G[A-Za-z0-9-]+$/.test(token)) return false;
  return token.includes('-') || /\d/.test(token);
}

/** Parsea un precio en pesos "$ 1.082.000,00" → 1082000. Devuelve null si no hay precio. */
function precioARS(line: string): number | null {
  const m = line.match(/\$\s*([\d.]+,\d{2})/);
  if (!m) return null;
  const n = m[1].replace(/\./g, '').replace(',', '.');
  const v = parseFloat(n);
  return isNaN(v) || v <= 0 ? null : v;
}

/**
 * Parsea el texto -layout de una lista de centrífugas/repuestos Gelec.
 *
 * Layout: el CÓDIGO vive en la columna izquierda (indent ≤ 11) y el PRECIO en la
 * columna derecha ("$ N.NNN,NN"). La descripción es multilínea, así que el precio
 * puede caer en la línea del código, una/dos líneas debajo, o incluso una arriba
 * (G-426DS). Estrategia: cada precio se adjudica al código más cercano por nº de
 * línea; cada código toma el precio más cercano que lo eligió. Los precios sin
 * código dueño (p.ej. "juego de gradillas adicional") quedan descartados, igual
 * que los productos "Fabricación suspendida" (línea sin precio).
 *
 * Son precios netos distribuidor → descuento = 0, el precio va directo como costo.
 */
export function parseGelec(text: string): FilaImport[] {
  const lines = text.split('\n');

  const codigos: { line: number; codigo: string; nombre: string; categoria: 'equipo' | 'insumo' }[] = [];
  const precios: { line: number; precio: number }[] = [];

  // Categoría vigente según el último título de sección. El doc arranca con centrífugas.
  // Rotores intercambiables y "Repuestos Gelec" son insumos; "Centrífugas de Mesa" (y
  // "Micro centrífugas de Mesa") son equipos. El check de rotores va primero porque su
  // título menciona "centrífugas".
  let categoria: 'equipo' | 'insumo' = 'equipo';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/rotores intercambiables/i.test(line) || /repuestos gelec/i.test(line)) {
      categoria = 'insumo';
    } else if (/centr[íi]fugas? de mesa/i.test(line)) {
      categoria = 'equipo';
    }
    const m = line.match(/^(\s*)(\S+)/);
    if (m && m[1].length <= 11 && esCodigo(m[2])) {
      // nombre = lo que queda en la línea del código sin el código ni el precio
      const nombre = line
        .replace(/^\s*\S+\s*/, '')
        .replace(/\$\s*[\d.]+,\d{2}.*$/, '')
        .trim();
      codigos.push({ line: i, codigo: m[2], nombre, categoria });
    }
    const p = precioARS(line);
    if (p !== null) precios.push({ line: i, precio: p });
  }

  if (codigos.length === 0) return [];

  // Cada precio → código más cercano por distancia de línea.
  const candidatos = new Map<number, { precio: number; dist: number }[]>();
  for (const p of precios) {
    let best = 0;
    let bestDist = Infinity;
    for (let k = 0; k < codigos.length; k++) {
      const d = Math.abs(codigos[k].line - p.line);
      if (d < bestDist) {
        bestDist = d;
        best = k;
      }
    }
    const arr = candidatos.get(best) ?? [];
    arr.push({ precio: p.precio, dist: bestDist });
    candidatos.set(best, arr);
  }

  const filas: FilaImport[] = [];
  for (let k = 0; k < codigos.length; k++) {
    const arr = candidatos.get(k);
    if (!arr || arr.length === 0) continue; // sin precio → suspendido/descartado
    arr.sort((a, b) => a.dist - b.dist);
    const { codigo, nombre, categoria } = codigos[k];
    filas.push({ codigo, nombre: nombre || codigo, precio: arr[0].precio, descuento: 0, categoria });
  }

  return filas;
}
