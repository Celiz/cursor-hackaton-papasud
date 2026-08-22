// Helper puro para trabajar con las especificaciones técnicas de un equipo,
// tanto en el catálogo (equipos.especificaciones) como en la copia de un
// presupuesto (presupuestos_equipos.especificaciones).
//
// Las specs pueden venir como objeto plano { clave: valor } o como array de
// strings. El diff y la propagación al catálogo trabajan sobre la vista
// aplanada clave -> valor legible (los arrays usan "Item N" como clave).

export type Especificaciones =
  | Record<string, unknown>
  | unknown[]
  | null
  | undefined;

export interface SpecCambio {
  clave: string;
  valorPresupuesto?: string;
  valorCatalogo?: string;
}

export interface SpecDiff {
  /** En el presupuesto, no en el catálogo. */
  agregadas: SpecCambio[];
  /** En ambos, con valor distinto. */
  cambiadas: SpecCambio[];
  /** En el catálogo, no en el presupuesto. */
  quitadas: SpecCambio[];
}

function valorLegible(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Aplana cualquier forma de specs a un Map clave -> valor legible, sin vacíos. */
export function normalizar(specs: Especificaciones): Map<string, string> {
  const map = new Map<string, string>();
  if (!specs) return map;
  if (Array.isArray(specs)) {
    specs.forEach((item, i) => {
      const val = valorLegible(item);
      if (val !== "") map.set(`Item ${i + 1}`, val);
    });
    return map;
  }
  for (const [k, v] of Object.entries(specs)) {
    const val = valorLegible(v);
    if (val !== "") map.set(k, val);
  }
  return map;
}

/**
 * Decide qué specs corresponde mostrar para un presupuesto:
 * - su copia propia si está personalizada o si ya no es borrador (congelado);
 * - las del catálogo si es un borrador sin personalizar (re-sync).
 */
export function resolverEspecificaciones(
  presupuesto: {
    especificaciones?: Especificaciones;
    especificaciones_personalizada?: boolean;
    estado?: string | null;
  },
  catalogo: Especificaciones,
): Especificaciones {
  const propio = presupuesto.especificaciones;
  if (
    propio &&
    (presupuesto.especificaciones_personalizada || presupuesto.estado !== "borrador")
  ) {
    return propio;
  }
  return catalogo ?? propio ?? null;
}

/** Compara las specs de un presupuesto contra las del catálogo. */
export function diffEspecificaciones(
  presupuesto: Especificaciones,
  catalogo: Especificaciones,
): SpecDiff {
  const pMap = normalizar(presupuesto);
  const cMap = normalizar(catalogo);
  const diff: SpecDiff = { agregadas: [], cambiadas: [], quitadas: [] };

  for (const [clave, valorP] of pMap) {
    if (!cMap.has(clave)) {
      diff.agregadas.push({ clave, valorPresupuesto: valorP });
    } else if (cMap.get(clave) !== valorP) {
      diff.cambiadas.push({
        clave,
        valorPresupuesto: valorP,
        valorCatalogo: cMap.get(clave),
      });
    }
  }
  for (const [clave, valorC] of cMap) {
    if (!pMap.has(clave)) {
      diff.quitadas.push({ clave, valorCatalogo: valorC });
    }
  }
  return diff;
}

export function hayDiferencias(diff: SpecDiff): boolean {
  return (
    diff.agregadas.length > 0 ||
    diff.cambiadas.length > 0 ||
    diff.quitadas.length > 0
  );
}

/**
 * Aplica las claves elegidas del presupuesto sobre las specs del catálogo.
 * Trabaja sobre la forma objeto plano. Si alguno de los dos lados es un array,
 * hace reemplazo completo (devuelve las specs del presupuesto tal cual).
 */
export function aplicarAlCatalogo(
  catalogo: Especificaciones,
  presupuesto: Especificaciones,
  claves: string[],
): Record<string, unknown> | unknown[] {
  if (Array.isArray(catalogo) || Array.isArray(presupuesto)) {
    return Array.isArray(presupuesto)
      ? [...presupuesto]
      : { ...((presupuesto as Record<string, unknown>) || {}) };
  }
  const resultado: Record<string, unknown> = { ...((catalogo as Record<string, unknown>) || {}) };
  const pObj = ((presupuesto as Record<string, unknown>) || {});
  for (const clave of claves) {
    if (Object.prototype.hasOwnProperty.call(pObj, clave)) {
      resultado[clave] = pObj[clave];
    } else {
      delete resultado[clave];
    }
  }
  return resultado;
}
