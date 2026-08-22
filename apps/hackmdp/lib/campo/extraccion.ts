/**
 * Normalización de lo que el modelo extrae de un dictado a una orden de trabajo real.
 *
 * El LLM interpreta lenguaje libre; esta capa es la que decide qué es verdad:
 * resuelve el lote contra las parcelas que existen, la tarea contra el catálogo,
 * los insumos contra el diccionario, y marca las dosis que caen fuera de lo
 * recomendado. Es pura y determinista a propósito — el modelo puede equivocarse,
 * pero no puede inventar un lote ni un insumo que no está en la base.
 */

export interface CatalogoParcela {
  id: string;
  codigo: string;
  nombre?: string | null;
  superficie_ha?: number | string | null;
}

export interface CatalogoTarea {
  id: string;
  codigo: string;
  nombre: string;
  alias?: string[] | null;
  requiere_insumos?: boolean;
}

export interface CatalogoInsumo {
  id: string;
  nombre: string;
  unidad?: string | null;
  dosis_min?: number | string | null;
  dosis_max?: number | string | null;
  alias?: string[] | null;
}

export interface Catalogos {
  parcelas: CatalogoParcela[];
  tareas: CatalogoTarea[];
  insumos: CatalogoInsumo[];
}

/** Lo que devuelve el modelo, sin validar. Todo es opcional a propósito. */
export interface ExtraccionCruda {
  lote?: string | null;
  tarea?: string | null;
  fecha?: string | null;
  responsable?: string | null;
  maquinaria?: string | null;
  horas?: number | string | null;
  descripcion?: string | null;
  insumos?: Array<{
    nombre?: string | null;
    dosis_ha?: number | string | null;
    unidad?: string | null;
  }> | null;
}

export interface InsumoResuelto {
  insumo_id: string | null;
  insumo_nombre: string;
  dosis_ha: number | null;
  unidad: string | null;
  cantidad: number | null;
  fuera_de_rango: boolean;
}

export interface OrdenExtraida {
  parcela_id: string | null;
  parcela_codigo: string | null;
  superficie_ha: number | null;
  tarea: string | null;
  tarea_tipo_id: string | null;
  fecha: string;
  responsable_nombre: string | null;
  maquinaria: string | null;
  horas: number | null;
  descripcion: string | null;
  insumos: InsumoResuelto[];
  /** Lo que el operador tiene que revisar antes de guardar. */
  avisos: string[];
}

// ───────────────────────────────────────────────────────────────────────────
// Utilidades
// ───────────────────────────────────────────────────────────────────────────

/** Minúsculas sin acentos, para comparar como habla la gente y no como escribe. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const NUMEROS_EN_PALABRAS: Record<string, number> = {
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
};

/**
 * Saca el número de lote de cualquier forma en que lo diga el ingeniero:
 * "lote 8", "el 8", "el ocho", "L8", "8".
 */
export function numeroDeLote(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const t = normalizar(texto);

  const conDigito = t.match(/(?:lote|cuadro|l)?\s*#?\s*(\d{1,3})\b/);
  if (conDigito) return parseInt(conDigito[1], 10);

  for (const [palabra, valor] of Object.entries(NUMEROS_EN_PALABRAS)) {
    if (new RegExp(`\\b${palabra}\\b`).test(t)) return valor;
  }
  return null;
}

function aNumero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function sumaDias(iso: string, dias: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * El modelo puede devolver una fecha ISO, o una expresión relativa que no supo
 * resolver. Todo lo que no se entienda cae en hoy, que es el caso real: el
 * ingeniero dicta el mismo día que trabajó.
 */
export function resolverFecha(valor: string | null | undefined, hoy: string): string {
  if (!valor) return hoy;
  const v = normalizar(valor);

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (v.includes("anteayer") || v.includes("antes de ayer")) return sumaDias(hoy, -2);
  if (v.includes("ayer")) return sumaDias(hoy, -1);
  if (v.includes("hoy")) return hoy;

  // dd/mm o dd/mm/aaaa
  const barras = v.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (barras) {
    const [, d, m, a] = barras;
    const anio = a ? (a.length === 2 ? `20${a}` : a) : hoy.slice(0, 4);
    return `${anio}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return hoy;
}

/** Busca en nombre y alias. Devuelve el match más largo, que es el más específico. */
function buscarPorNombreOAlias<T extends { nombre: string; alias?: string[] | null }>(
  candidatos: T[],
  texto: string | null | undefined
): T | null {
  if (!texto) return null;
  const t = normalizar(texto);
  if (!t) return null;

  let mejor: T | null = null;
  let mejorLargo = 0;

  for (const c of candidatos) {
    const claves = [c.nombre, ...(c.alias ?? [])];
    for (const clave of claves) {
      const k = normalizar(clave);
      if (!k) continue;
      if (t.includes(k) || k.includes(t)) {
        if (k.length > mejorLargo) {
          mejor = c;
          mejorLargo = k.length;
        }
      }
    }
  }
  return mejor;
}

// ───────────────────────────────────────────────────────────────────────────
// Normalización
// ───────────────────────────────────────────────────────────────────────────

export function normalizarExtraccion(
  cruda: ExtraccionCruda,
  catalogos: Catalogos,
  hoy: string
): OrdenExtraida {
  const avisos: string[] = [];

  // ── Lote ────────────────────────────────────────────────────────────────
  let parcela: CatalogoParcela | null = null;
  const nro = numeroDeLote(cruda.lote);
  if (nro !== null) {
    parcela =
      catalogos.parcelas.find((p) => numeroDeLote(p.codigo) === nro) ?? null;
  }
  if (!parcela && cruda.lote) {
    const t = normalizar(cruda.lote);
    parcela =
      catalogos.parcelas.find(
        (p) => normalizar(p.codigo) === t || (p.nombre && normalizar(p.nombre).includes(t))
      ) ?? null;
  }
  if (!parcela) {
    avisos.push(
      cruda.lote
        ? `No se pudo identificar el lote "${cruda.lote}". Elegilo a mano.`
        : "No se mencionó ningún lote."
    );
  }

  const superficie = parcela ? aNumero(parcela.superficie_ha) : null;

  // ── Tarea ───────────────────────────────────────────────────────────────
  const tarea = buscarPorNombreOAlias(catalogos.tareas, cruda.tarea);
  if (!tarea) {
    avisos.push(
      cruda.tarea
        ? `La tarea "${cruda.tarea}" no está en el catálogo. Se guarda como texto libre.`
        : "No se pudo identificar la tarea."
    );
  }

  // ── Insumos ─────────────────────────────────────────────────────────────
  const insumos: InsumoResuelto[] = [];
  for (const bruto of cruda.insumos ?? []) {
    const nombreDicho = (bruto.nombre ?? "").trim();
    if (!nombreDicho) continue;

    const match = buscarPorNombreOAlias(catalogos.insumos, nombreDicho);
    const dosis = aNumero(bruto.dosis_ha);
    const unidad = bruto.unidad ?? match?.unidad ?? null;

    let fueraDeRango = false;
    if (match && dosis !== null) {
      const min = aNumero(match.dosis_min);
      const max = aNumero(match.dosis_max);
      if ((min !== null && dosis < min) || (max !== null && dosis > max)) {
        fueraDeRango = true;
        avisos.push(
          `${match.nombre}: ${dosis} ${unidad ?? ""} está fuera del rango recomendado ` +
            `(${min ?? "?"}–${max ?? "?"} ${match.unidad ?? ""}).`
        );
      }
    }

    if (!match) {
      avisos.push(`"${nombreDicho}" no está en el diccionario de insumos.`);
    }

    insumos.push({
      insumo_id: match?.id ?? null,
      insumo_nombre: match?.nombre ?? nombreDicho,
      dosis_ha: dosis,
      unidad,
      cantidad:
        dosis !== null && superficie !== null
          ? Math.round(dosis * superficie * 1000) / 1000
          : null,
      fuera_de_rango: fueraDeRango,
    });
  }

  if (tarea?.requiere_insumos && insumos.length === 0) {
    avisos.push(`"${tarea.nombre}" normalmente lleva insumos y no se mencionó ninguno.`);
  }

  // ── Resto ───────────────────────────────────────────────────────────────
  const horas = aNumero(cruda.horas);

  return {
    parcela_id: parcela?.id ?? null,
    parcela_codigo: parcela?.codigo ?? null,
    superficie_ha: superficie,
    tarea: tarea?.nombre ?? (cruda.tarea ? cruda.tarea.trim() : null),
    tarea_tipo_id: tarea?.id ?? null,
    fecha: resolverFecha(cruda.fecha, hoy),
    responsable_nombre: cruda.responsable?.trim() || null,
    maquinaria: cruda.maquinaria?.trim() || null,
    horas,
    descripcion: cruda.descripcion?.trim() || null,
    insumos,
    avisos,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Prompt
// ───────────────────────────────────────────────────────────────────────────

/**
 * El catálogo va DENTRO del prompt. El modelo elige de una lista cerrada en vez
 * de inventar, y lo que igual invente lo caza `normalizarExtraccion`.
 */
export function construirPrompt(texto: string, catalogos: Catalogos, hoy: string): string {
  const lotes = catalogos.parcelas.map((p) => p.codigo).join(", ");
  const tareas = catalogos.tareas
    .map((t) => `${t.nombre} (${(t.alias ?? []).join(", ")})`)
    .join("; ");
  const insumos = catalogos.insumos
    .map(
      (i) =>
        `${i.nombre} [${(i.alias ?? []).join(", ")}] ${i.dosis_min}-${i.dosis_max} ${i.unidad}`
    )
    .join("; ");

  return `Sos un asistente que convierte el relato de un ingeniero agrónomo en una orden de trabajo estructurada.
Trabajás para Papasud, productor de semilla de papa en el sudeste bonaerense.
Hoy es ${hoy}.

LOTES QUE EXISTEN: ${lotes}
TAREAS DEL CATÁLOGO: ${tareas}
INSUMOS DEL DICCIONARIO: ${insumos}

Reglas:
- Elegí SIEMPRE de las listas de arriba. Si algo no está, devolvelo tal como lo dijo y no inventes un reemplazo.
- No completes datos que no se dijeron. Lo que falta va en null.
- Las dosis van por hectárea, tal como se dictaron. No las conviertas.
- "el 8", "el ocho" y "lote 8" son el mismo lote.

Respondé SOLO con este JSON, sin texto alrededor y sin bloque de código:
{"lote":string|null,"tarea":string|null,"fecha":string|null,"responsable":string|null,"maquinaria":string|null,"horas":number|null,"descripcion":string|null,"insumos":[{"nombre":string,"dosis_ha":number|null,"unidad":string|null}]}

Relato del ingeniero:
"""${texto}"""`;
}

/** El modelo a veces envuelve el JSON en prosa o en un bloque de código. */
export function extraerJson(respuesta: string): ExtraccionCruda | null {
  if (!respuesta) return null;
  const bloque = respuesta.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidato = bloque ? bloque[1] : respuesta;
  const inicio = candidato.indexOf("{");
  const fin = candidato.lastIndexOf("}");
  if (inicio === -1 || fin === -1 || fin <= inicio) return null;
  try {
    return JSON.parse(candidato.slice(inicio, fin + 1)) as ExtraccionCruda;
  } catch {
    return null;
  }
}
