import type { FilaImport } from './gematec';

/**
 * Detecta el Excel de lista Vitis: arranca con un banner "VITIS" en las primeras
 * filas. Es específico para no pisar a otros proveedores en Excel (Gematec, Donelab).
 */
export function esFormatoVitis(rows: unknown[][]): boolean {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;
    for (const c of r) {
      if (typeof c === 'string' && c.trim().toUpperCase() === 'VITIS') return true;
    }
  }
  return false;
}

/** Precio Vitis: viene como número; contempla string con formato AR ("1.234,56"). */
function precioVitis(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || !/\d/.test(s)) return null;
    let t = s.replace(/[^\d.,]/g, '');
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(t);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * Parsea la lista Vitis (Excel) fila-por-fila. Columnas:
 *   [0] código   [1] descripción   [2] embalaje   [3] precio unitario
 *
 * La estructura es "sucia": el header "CODIGO/DESCRIPCIÓN/Embalaje/Unitario" se
 * repite por sección (~18 veces), hay filas de categoría ("HISOPOS", "TUBOS…") y
 * de especificación (sólo descripción), un banner "VITIS", y productos por encima
 * del primer header ("NUEVO PRODUCTO"). Una fila es producto sólo si tiene código,
 * descripción y un precio numérico > 0 — con eso se saltea todo lo demás.
 *
 * Son todos insumos/productos (sin categoría equipo/insumo) → una sola lista.
 */
export function parseVitis(rows: unknown[][]): FilaImport[] {
  const filas: FilaImport[] = [];
  const vistos = new Set<string>();
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    const cod = (r[0] === 0 ? '0' : (r[0] ?? '')).toString().trim();
    const desc = (r[1] ?? '').toString().trim();
    const precio = precioVitis(r[3]);
    if (!cod || !desc) continue;         // categoría / especificación / banner
    if (/^codigo$/i.test(cod)) continue; // header repetido
    if (precio === null) continue;       // sin precio válido
    const clave = cod.toLowerCase();
    if (vistos.has(clave)) continue;     // duplicado (repetido en "NUEVO PRODUCTO")
    vistos.add(clave);
    filas.push({ codigo: cod, nombre: desc, precio, descuento: 0 });
  }
  return filas;
}
