import type { FilaExtraida } from "./ia-tipos";

/** Precio "efectivo" de una fila para validar presencia (neto o con IVA). */
function precioEfectivo(f: FilaExtraida): number | null {
  if (f.precio !== null && f.precio > 0) return f.precio;
  if (f.precio_con_iva !== null && f.precio_con_iva > 0) return f.precio_con_iva;
  return null;
}

export function validarFilas(filas: FilaExtraida[]): { filas: FilaExtraida[]; alertas: string[] } {
  const alertas: string[] = [];
  const validas: FilaExtraida[] = [];
  const vistos = new Set<string>();
  let descartadas = 0;
  let duplicadas = 0;

  for (const f of filas) {
    const nombre = (f.nombre ?? "").trim();
    const pe = precioEfectivo(f);
    if (!nombre || pe === null || pe <= 0) { descartadas++; continue; }

    const clave = f.codigo?.trim()
      ? `c:${f.codigo.trim().toLowerCase()}`
      : `n:${nombre.toLowerCase()}`;
    if (vistos.has(clave)) { duplicadas++; continue; }
    vistos.add(clave);

    if (f.precio_con_iva !== null && f.precio !== null && f.precio_con_iva < f.precio) {
      alertas.push(`"${nombre}": precio con IVA (${f.precio_con_iva}) menor al neto (${f.precio}).`);
    }
    if (f.precio_con_iva !== null && f.precio !== null && f.precio > 0) {
      const ratio = f.precio_con_iva / f.precio;
      if (ratio > 1.005 && (ratio < 1.05 || ratio > 1.30)) {
        alertas.push(`"${nombre}": relación con-IVA/neto ${ratio.toFixed(3)} fuera de lo esperado (IVA 10,5%–27%).`);
      }
    }
    if (f.moneda === null) {
      alertas.push(`"${nombre}": no se pudo determinar la moneda.`);
    }
    validas.push(f);
  }

  if (descartadas > 0) alertas.unshift(`Se descartaron ${descartadas} fila(s) sin nombre o sin precio válido.`);
  if (duplicadas > 0) alertas.unshift(`Se omitieron ${duplicadas} fila(s) duplicada(s).`);
  if (validas.length === 0) alertas.unshift("No se extrajo ninguna fila válida del archivo.");

  return { filas: validas, alertas };
}
