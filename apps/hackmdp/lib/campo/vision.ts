/**
 * Diagnóstico de una foto de cultivo.
 *
 * Decisión de diseño, porque no es obvia: esto NO es un clasificador entrenado.
 * El dataset público de referencia (PlantVillage) tiene las dos enfermedades
 * que le importan a Papasud — tizón temprano y tizón tardío — pero sus imágenes
 * son hojas sueltas sobre fondo blanco, sacadas en laboratorio. Un modelo
 * entrenado ahí saca 99% en su propio test y se cae a 30-40% con fotos de
 * campo: tierra, sombra, varias plantas, sol de las tres de la tarde. Y se cae
 * dando respuestas con mucha confianza, que es lo peor que puede pasar cuando
 * de un diagnóstico sale una aplicación que cuesta plata.
 *
 * En su lugar se usa un modelo de lenguaje con visión, acotado al dominio y
 * obligado a declarar su confianza y a poder decir que no sabe. No acierta
 * siempre, pero falla de una manera que se puede leer: dice qué ve y por qué,
 * y el agrónomo decide.
 *
 * Nada de esto dispara una aplicación solo. Genera una observación, que va
 * adjunta al lote y a la orden de trabajo.
 */

/** Lo que puede reconocerse en una foto de un lote de papa. */
export const HALLAZGOS = [
  'tizon_tardio',
  'tizon_temprano',
  'sana',
  'estres_hidrico',
  'deficiencia_nutricional',
  'dano_por_insecto',
  'dano_por_herbicida',
  'virosis',
  'otro',
  'no_concluyente',
] as const;

export type Hallazgo = (typeof HALLAZGOS)[number];

export const ETIQUETA_HALLAZGO: Record<Hallazgo, string> = {
  tizon_tardio: 'Tizón tardío',
  tizon_temprano: 'Tizón temprano',
  sana: 'Sin síntomas',
  estres_hidrico: 'Estrés hídrico',
  deficiencia_nutricional: 'Deficiencia nutricional',
  dano_por_insecto: 'Daño por insecto',
  dano_por_herbicida: 'Fitotoxicidad por herbicida',
  virosis: 'Virosis',
  otro: 'Otro',
  no_concluyente: 'No concluyente',
};

/** Un hallazgo que exige acción rápida en semilla fiscalizada. */
export const URGENTES: ReadonlySet<Hallazgo> = new Set([
  'tizon_tardio',
  'virosis',
]);

export interface DiagnosticoCrudo {
  hallazgo?: string | null;
  confianza?: number | string | null;
  severidad?: string | null;
  observacion?: string | null;
  recomendacion?: string | null;
  visible?: string | null;
}

export interface Diagnostico {
  hallazgo: Hallazgo;
  etiqueta: string;
  /** 0..1. Por debajo del umbral el hallazgo se degrada a no concluyente. */
  confianza: number;
  severidad: 'baja' | 'media' | 'alta' | null;
  /** Qué se ve en la foto, en términos descriptivos. */
  visible: string | null;
  observacion: string | null;
  recomendacion: string | null;
  urgente: boolean;
  avisos: string[];
}

/**
 * Debajo de esto no se afirma nada. Es alto a propósito: en semilla
 * fiscalizada, un falso positivo dispara una aplicación innecesaria y un falso
 * negativo deja avanzar un foco. Ante la duda, que decida el agrónomo.
 */
export const UMBRAL_CONFIANZA = 0.6;

const aNumero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  // Algunos modelos devuelven porcentaje en vez de fracción.
  return n > 1 ? n / 100 : n;
};

function normalizarHallazgo(v: string | null | undefined): Hallazgo | null {
  if (!v) return null;
  const t = String(v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
  if ((HALLAZGOS as readonly string[]).includes(t)) return t as Hallazgo;
  // Sinónimos que suele devolver el modelo
  if (/late_blight|phytophthora|tizon_tardio/.test(t)) return 'tizon_tardio';
  if (/early_blight|alternaria|tizon_temprano/.test(t)) return 'tizon_temprano';
  if (/healthy|sano|sana|normal/.test(t)) return 'sana';
  if (/water|hidrico|sequia|marchit/.test(t)) return 'estres_hidrico';
  if (/nutrient|deficien|clorosis/.test(t)) return 'deficiencia_nutricional';
  if (/insect|pulgon|polilla|plaga|bicho/.test(t)) return 'dano_por_insecto';
  if (/herbicid|fitotox/.test(t)) return 'dano_por_herbicida';
  if (/virus|virosis|mosaico|enrollamiento/.test(t)) return 'virosis';
  return null;
}

function normalizarSeveridad(v: string | null | undefined): Diagnostico['severidad'] {
  if (!v) return null;
  const t = String(v).toLowerCase();
  if (/alta|severa|grave|high/.test(t)) return 'alta';
  if (/media|moderada|medium/.test(t)) return 'media';
  if (/baja|leve|incipiente|low/.test(t)) return 'baja';
  return null;
}

/**
 * Convierte la respuesta del modelo en un diagnóstico utilizable, degradando a
 * `no_concluyente` todo lo que no llegue al umbral o no se entienda.
 */
export function normalizarDiagnostico(crudo: DiagnosticoCrudo): Diagnostico {
  const avisos: string[] = [];

  let hallazgo = normalizarHallazgo(crudo.hallazgo);
  if (!hallazgo) {
    if (crudo.hallazgo) {
      avisos.push(`El modelo devolvió "${crudo.hallazgo}", que no está en el catálogo.`);
    }
    hallazgo = 'no_concluyente';
  }

  let confianza = aNumero(crudo.confianza) ?? 0;
  confianza = Math.max(0, Math.min(1, confianza));

  if (hallazgo !== 'no_concluyente' && confianza < UMBRAL_CONFIANZA) {
    avisos.push(
      `Confianza ${(confianza * 100).toFixed(0)}%, por debajo del ${UMBRAL_CONFIANZA * 100}% ` +
        `mínimo. Se registra la observación pero no el diagnóstico.`
    );
    hallazgo = 'no_concluyente';
  }

  const severidad = normalizarSeveridad(crudo.severidad);
  const urgente = URGENTES.has(hallazgo) && confianza >= UMBRAL_CONFIANZA;
  if (urgente) {
    avisos.push('Hallazgo que en semilla fiscalizada conviene confirmar el mismo día.');
  }

  return {
    hallazgo,
    etiqueta: ETIQUETA_HALLAZGO[hallazgo],
    confianza,
    severidad,
    visible: crudo.visible?.trim() || null,
    observacion: crudo.observacion?.trim() || null,
    recomendacion: crudo.recomendacion?.trim() || null,
    urgente,
    avisos,
  };
}

export interface ContextoFoto {
  lote?: string | null;
  variedad?: string | null;
  pivote?: string | null;
  tercio?: number | null;
  fecha?: string | null;
}

/** El contexto entra en el prompt: la misma mancha no significa lo mismo en enero que en abril. */
export function construirPromptVision(ctx: ContextoFoto = {}): string {
  const donde = [
    ctx.lote ? `lote ${ctx.lote}` : null,
    ctx.pivote ? `pivote ${ctx.pivote}${ctx.tercio ? `, tercio ${ctx.tercio}` : ''}` : null,
    ctx.variedad ? `variedad ${ctx.variedad}` : null,
    ctx.fecha ? `fecha ${ctx.fecha}` : null,
  ].filter(Boolean).join(' · ');

  return `Sos un asistente de un ingeniero agrónomo en un lote de PAPA de semilla fiscalizada,
en el sudeste de la provincia de Buenos Aires.

${donde ? `Contexto de la foto: ${donde}.\n` : ''}
Mirá la foto y decí qué se ve. Elegí UNO de estos hallazgos:
- tizon_tardio: manchas irregulares oscuras, húmedas, con halo claro; suele avanzar rápido
- tizon_temprano: manchas circulares con anillos concéntricos, más frecuentes en hojas viejas
- sana: sin síntomas visibles
- estres_hidrico: marchitez, hojas plegadas, sin lesiones
- deficiencia_nutricional: clorosis, patrones de amarillamiento
- dano_por_insecto: perforaciones, minas, presencia de insectos
- dano_por_herbicida: deformaciones, decoloración en el brote
- virosis: mosaicos, enrollamiento de hojas
- otro: algo visible que no encaja en lo anterior
- no_concluyente: la foto no permite decidir

Reglas, y son importantes:
- Si la foto está borrosa, muy lejos, oscura, o no muestra el cultivo, devolvé
  "no_concluyente". Es una respuesta correcta, no una falla.
- La confianza tiene que ser honesta. Un diagnóstico va a derivar en una
  aplicación que cuesta dinero; preferí quedarte corto.
- No inventes lo que no se ve en la imagen. Describí primero lo visible y
  recién después interpretá.
- La recomendación es para un agrónomo: concreta y breve. Nunca indiques una
  dosis; eso lo decide él.

Respondé SOLO con este JSON, sin texto alrededor y sin bloque de código:
{"visible":string,"hallazgo":string,"confianza":number,"severidad":"baja"|"media"|"alta"|null,"observacion":string,"recomendacion":string}`;
}

/** El modelo a veces envuelve el JSON en prosa o en un bloque de código. */
export function extraerJsonDiagnostico(respuesta: string): DiagnosticoCrudo | null {
  if (!respuesta) return null;
  const bloque = respuesta.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidato = bloque ? bloque[1] : respuesta;
  const i = candidato.indexOf('{');
  const f = candidato.lastIndexOf('}');
  if (i === -1 || f === -1 || f <= i) return null;
  try {
    return JSON.parse(candidato.slice(i, f + 1)) as DiagnosticoCrudo;
  } catch {
    return null;
  }
}
