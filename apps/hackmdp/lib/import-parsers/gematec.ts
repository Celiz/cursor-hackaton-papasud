import { spawn } from 'child_process';

export interface FilaImport {
  codigo: string;
  nombre: string;
  precio: number;       // Precio de Lista bruto (USD)
  descuento: number;    // % descuento de distribuidor → costo neto = precio × (1 - descuento/100)
  // Categoría detectada por el parser (parsers multi-categoría, ej. Gelec). Si está presente,
  // el importador parte en una lista por categoría. Ausente → lista única con el tipo del form.
  categoria?: 'equipo' | 'insumo';
}

/**
 * Extrae texto de un PDF preservando columnas (pdftotext -layout, de poppler-utils).
 * Requiere poppler-utils en la imagen. Lee el PDF por stdin y devuelve el texto por stdout.
 */
export function pdftotextLayout(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pdftotext', ['-layout', '-', '-']);
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => (out += d.toString('utf-8')));
    proc.stderr.on('data', (d) => (err += d.toString('utf-8')));
    proc.on('error', (e) => reject(new Error(`pdftotext no disponible: ${e.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`pdftotext falló (code ${code}): ${err}`));
    });
    proc.stdin.write(buffer);
    proc.stdin.end();
  });
}

/** Detecta si un texto de PDF tiene el formato de lista de GEMATEC. */
export function esFormatoGematec(text: string): boolean {
  return (
    text.includes('Precio de Lista') &&
    text.includes('Plan de Ahorro') &&
    text.includes('CONTADO ANTICIPADO')
  );
}

const LABELS = new Set([
  'STOCK', 'SE TRAE A PEDIDO', 'PRECIO DE LISTA', 'PLAN DE AHORRO',
  'CONTADO ANTICIPADO', 'FORMA DE PAGO', 'MODELO', 'OBERVACIONES',
  'OBSERVACIONES', 'INICIO', 'INDICE',
]);
const BAD = [
  'USD', '%', ':', 'IVA', 'DISTRIBUIDOR', 'día', 'Adelanto', 'Saldo', 'Embarque',
  'Nacionaliz', 'Cubeta', 'Envío', 'Incluye', 'reactivo', 'instalación',
  'capacitación', 'LISTA DE PRECIOS', 'Fecha', 'no incluyen', 'elección',
  'Precio', 'Plan', 'RECIBE', 'Kit', 'monitor', 'Opcional', 'Se descuenta',
  'definir', 'consult',
];

function esModelo(s: string): boolean {
  const t = s.trim();
  if (t.length < 2 || t.length > 52) return false;
  if (LABELS.has(t.toUpperCase())) return false;
  for (const b of BAD) if (t.includes(b)) return false;
  if (!/^[A-Za-z0-9]/.test(t)) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  return true;
}

function precioVal(t: string): number | null {
  const m = t.match(/USD\s*([\d.,]+)/);
  if (!m) return null;
  const n = m[1].replace(/\./g, '').replace(',', '.');
  const v = parseFloat(n);
  return isNaN(v) ? null : v;
}

/**
 * Parsea el texto -layout de una lista de equipamiento GEMATEC.
 * Por cada bloque "Precio de Lista": modelo = código en la columna izquierda;
 * precio = el valor "USD x" bruto (antes de "Plan de Ahorro"). Filas con precio 0
 * (a consultar) se descartan.
 */
export function parseGematec(text: string): FilaImport[] {
  const lines = text.split('\n');
  const idx = lines.map((l, i) => (l.includes('Precio de Lista') ? i : -1)).filter((i) => i >= 0);
  const filas: FilaImport[] = [];

  for (let k = 0; k < idx.length; k++) {
    const start = idx[k];
    const end = k + 1 < idx.length ? idx[k + 1] : lines.length;
    const block = lines.slice(start, end);

    // precio de lista bruto: el "USD x" en la COLUMNA del precio de lista (~col 50-82),
    // antes de "Plan de Ahorro". Eso distingue el bruto (col ~59) del desglose de pago
    // (col ~95) y captura tanto el valor standalone como el que va en la línea del modelo
    // (caso URISED MINI).
    let gross: number | null = null;
    for (const l of block) {
      if (l.includes('Plan de Ahorro')) break;
      const m = l.match(/USD\s*[\d.,]+/);
      if (m && m.index !== undefined && m.index >= 50 && m.index <= 82) {
        gross = precioVal(m[0]);
        break;
      }
    }

    // modelo: candidato en la columna izquierda (primeros ~50 chars del renglón)
    const cands = block.map((l) => l.slice(0, 50).trim()).filter(esModelo);
    let modelo =
      cands.find((c) => /\d/.test(c) && c.includes('-')) ||
      cands.find((c) => /\d/.test(c)) ||
      cands[0] ||
      '';

    // descuento de distribuidor:
    //  - "DISTRIBUIDOR: -X%"        → costo = precio de lista × (1 - X/100)
    //  - "PRECIO DISTRIBUIDOR USD Y" → precio fijo de distribuidor: se usa Y directo como costo
    let descuento = 0;
    let precioFinal = gross;
    if (gross && gross > 0) {
      for (const l of block) {
        const mp = l.match(/DISTRIBUIDOR:?\s*-?\s*(\d+(?:[.,]\d+)?)\s*%/i);
        const mf = l.match(/PRECIO\s+DISTRIBUIDOR\s*USD\s*([\d.,]+)/i);
        if (mp) {
          descuento = parseFloat(mp[1].replace(',', '.')) || 0;
          break;
        }
        if (mf) {
          const fijo = precioVal('USD ' + mf[1]);
          if (fijo && fijo > 0) { precioFinal = fijo; descuento = 0; }
          break;
        }
      }
    }

    if (modelo && precioFinal && precioFinal > 0) {
      filas.push({ codigo: modelo, nombre: modelo, precio: precioFinal, descuento });
    }
  }

  return filas;
}
