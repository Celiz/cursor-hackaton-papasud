import pdf from 'pdf-parse';

// --- Types ---

export interface AnalisisMetadata {
  paciente: string | null;
  laboratorio: string | null;
  profesional: string | null;
  protocolo_nro: string | null;
  solicitado_por: string | null;
  fecha: string | null; // ISO date YYYY-MM-DD
}

export interface AnalisisResultado {
  nombre: string;
  valor: number | null;
  unidad: string | null;
  valor_texto: string | null;
  ref_min: number | null;
  ref_max: number | null;
  ref_texto: string | null;
  estado: 'normal' | 'alto' | 'bajo' | 'critico' | null;
  dimension: string | null;
}

export interface ParsedAnalisis {
  metadata: AnalisisMetadata;
  resultados: AnalisisResultado[];
}

// --- Dimension mapping ---

const DIMENSION_MAP: Record<string, string> = {
  // Nutricion
  'glucemia': 'nutricion',
  'colesterol': 'nutricion',
  'hdl colesterol': 'nutricion',
  'ldl colesterol': 'nutricion',
  'l.d.l. colesterol': 'nutricion',
  'colesterol no-hdl': 'nutricion',
  'colesterol remanente': 'nutricion',
  'trigliceridos': 'nutricion',
  'relacion colesterol total/hdl': 'nutricion',
  'relacion trigliceridos/hdl': 'nutricion',
  'uremia': 'nutricion',
  'creatinina': 'nutricion',
  'filtrado glomerular estimado': 'nutricion',

  // Descanso
  'tsh': 'descanso',
  'tsh - tirotrofina ultrasensible': 'descanso',
  'tsh -tirotrofina ultrasensible': 'descanso',
  'tiroxina libre': 'descanso',
  'eritrosedimentacion': 'descanso',

  // Biomarkers (hemograma)
  'hematies': 'biomarkers',
  'hematocrito': 'biomarkers',
  'hemoglobina': 'biomarkers',
  'vol.corp.medio': 'biomarkers',
  'r.d.w.': 'biomarkers',
  'hb. corp.media': 'biomarkers',
  'hb.corp.media': 'biomarkers',
  'conc. hb corp.': 'biomarkers',
  'conc.hbcorp.': 'biomarkers',
  'conc.hb corp.': 'biomarkers',
  'glob. blancos': 'biomarkers',
  'glob.blancos': 'biomarkers',
  'recuento de plaquetas': 'biomarkers',
  'recuentodeplaquetas': 'biomarkers',

  // Formula leucocitaria -> biomarkers
  'neutr.en cayado': 'biomarkers',
  'neutr.encayado': 'biomarkers',
  'neutr.segmentados': 'biomarkers',
  'neutr. segmentados': 'biomarkers',
  'eosinofilos': 'biomarkers',
  'basofilos': 'biomarkers',
  'linfocitos': 'biomarkers',
  'monocitos': 'biomarkers',

  // FGe
  'mdrd-4': 'nutricion',
};

// Qualitative tests that don't generate dimension registros
const QUALITATIVE_TESTS = new Set([
  'antic. anti virus de la inmunodeficiencia humana h.i.v.(i+ii)',
  'reaccion de v.d.r.l',
  'reaccionde v.d.r.l',
  'hepatitis b antigeno de superficie',
  'hepatitis b antigeno de superficie (hbs ag)',
  'hepatitis c',
  'hepatitis c (antic. anti hcv)',
]);

// --- Parsing helpers ---

function parseSpanishDate(text: string): string | null {
  const months: Record<string, string> = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  };
  // Handle no-spaces format: "10denoviembrede2025"
  const m = text.match(/(\d{1,2})\s*de\s*(\w+)\s*de\s*(\d{4})/i);
  if (!m) return null;
  const month = months[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
}

function parseNumericValue(raw: string): number | null {
  const cleaned = raw.trim();
  // 5.110.000 (thousands-separated integer)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/\./g, ''), 10);
  }
  // 14,9 or 1,02 (decimal comma)
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d+,\d+$/.test(cleaned)) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function computeEstado(
  valor: number | null,
  refMin: number | null,
  refMax: number | null,
): 'normal' | 'alto' | 'bajo' | null {
  if (valor === null) return null;
  if (refMin !== null && refMax !== null) {
    if (valor < refMin) return 'bajo';
    if (valor > refMax) return 'alto';
    return 'normal';
  }
  if (refMax !== null && valor > refMax) return 'alto';
  if (refMin !== null && valor < refMin) return 'bajo';
  return null;
}

function findDimension(nombre: string): string | null {
  const key = nombre.toLowerCase().trim();
  if (DIMENSION_MAP[key]) return DIMENSION_MAP[key];
  for (const [pattern, dim] of Object.entries(DIMENSION_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) return dim;
  }
  for (const q of QUALITATIVE_TESTS) {
    if (key.includes(q) || q.includes(key)) return null;
  }
  return null;
}

// --- Page header detection ---

/** Lines that appear on every page as repeated header */
function isPageHeaderLine(line: string): boolean {
  const l = line.trim();
  // Dr. header (with or without spaces)
  if (/^Dr\.?\s*Jorge/i.test(l) || /^Dr\.JorgeA/i.test(l)) return true;
  // Address
  if (/^Dorrego/i.test(l)) return true;
  // Phone
  if (/^Tel:/i.test(l) || /^Tel:\s*/i.test(l)) return true;
  // Email
  if (/^E-mail:/i.test(l)) return true;
  // Protocolo validation boilerplate
  if (/^Este\s*protocolo\s*fue/i.test(l) || /^Esteprotocolofue/i.test(l)) return true;
  if (/^Dr\.?\s*Jorge\s*Aquiles/i.test(l) || /^Dr\.Jorge\s*Aquiles/i.test(l)) return true;
  if (/^El\s*laboratorio\s*atiende/i.test(l) || /^Ellaboratorioatiende/i.test(l)) return true;
  if (/^de\s*la\s*obra\s*social/i.test(l) || /^delaobrasocial/i.test(l)) return true;
  return false;
}

/** Metadata label lines that appear on every page */
function isRepeatedMetadataLabel(line: string): boolean {
  const l = line.trim();
  return /^Paciente:$/i.test(l)
    || /^Solicitado\s*por:$/i.test(l) || /^Solicitadopor:$/i.test(l)
    || /^Protocolo\s*N[ºo°]/i.test(l) || /^ProtocoloN[ºo°]/i.test(l)
    || /^Fecha:$/i.test(l);
}

// --- Metadata extraction ---

function extractMetadata(lines: string[]): AnalisisMetadata {
  const meta: AnalisisMetadata = {
    paciente: null,
    laboratorio: null,
    profesional: null,
    protocolo_nro: null,
    solicitado_por: null,
    fecha: null,
  };

  // Scan all lines for metadata, but prefer page 2+ (with proper spacing).
  // Page 1 has no spaces in text, page 2+ has proper spacing.
  // We collect the LAST occurrence of each metadata field (page 2+ overwrites page 1).
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Professional: "Dr.JorgeA.Zaccagni-M.P.425" or "Dr. Jorge A. Zaccagni - M.P. 425"
    if (/^Dr\.?\s*Jorge/i.test(line) && /M\.P\./i.test(line)) {
      const m = line.match(/^(Dr\.?\s*.+?)(?:\s*-\s*M\.P\.|\s*$)/i);
      if (m) meta.profesional = m[1].replace(/\s+/g, ' ').trim();
    }

    // Paciente: next line has the name
    if (/^Paciente:$/i.test(line)) {
      const next = lines[i + 1]?.trim();
      if (next) {
        meta.paciente = next.replace(/,(\S)/g, ', $1').trim();
      }
    }

    // Solicitado por: next line has the name
    if (/^Solicitado\s*por:$/i.test(line)) {
      const next = lines[i + 1]?.trim();
      if (next) {
        meta.solicitado_por = next.replace(/,(\S)/g, ', $1').trim();
      }
    }

    // Protocolo Nº: next line has the number
    if (/^Protocolo\s*N[ºo°]/i.test(line)) {
      const next = lines[i + 1]?.trim();
      if (next && /^\d+$/.test(next)) {
        meta.protocolo_nro = next;
      }
    }

    // Fecha: next line has the date
    if (/^Fecha:$/i.test(line)) {
      const next = lines[i + 1]?.trim();
      if (next) {
        const parsed = parseSpanishDate(next);
        if (parsed) meta.fecha = parsed;
      }
    }
  }

  // Lab name from address line
  if (!meta.laboratorio) {
    for (let i = 0; i < lines.length; i++) {
      if (/Dorrego/i.test(lines[i])) {
        meta.laboratorio = 'Laboratorio Zaccagni';
        break;
      }
    }
  }

  return meta;
}

// --- Reference value parsing ---

interface RefValues {
  refMin: number | null;
  refMax: number | null;
  refTexto: string | null;
}

/**
 * Parse reference value from a no-spaces page 1 line like:
 * "Valordereferencia:Hombres:4.300.000a5.700.000pormm3"
 * "Valordereferencia:de4.000a10.000pormm3"
 * "Valordereferencia:hasta15,0"
 * "Valordereferencia:de80a96fl"
 */
function parseNoSpaceRef(line: string): RefValues {
  const result: RefValues = { refMin: null, refMax: null, refTexto: line };

  // Try "Hombres:" first (male reference)
  const maleMatch = line.match(/Hombres?:[\s]*([\d.,]+)\s*a\s*([\d.,]+)/i)
    || line.match(/Hombre[s]?:([\d.,]+)a([\d.,]+)/i);
  if (maleMatch) {
    result.refMin = parseNumericValue(maleMatch[1]);
    result.refMax = parseNumericValue(maleMatch[2]);
    return result;
  }

  // Try "Adulto Hombre" pattern
  const adultoHombreMatch = line.match(/Adulto\s*Hombre\s*:?\s*([\d.,]+)\s*a\s*([\d.,]+)/i);
  if (adultoHombreMatch) {
    result.refMin = parseNumericValue(adultoHombreMatch[1]);
    result.refMax = parseNumericValue(adultoHombreMatch[2]);
    return result;
  }

  // Try "Adulto:" or "Adultos:" pattern
  const adultoMatch = line.match(/Adultos?\s*:?\s*(?:de\s*)?([\d.,]+)\s*a\s*([\d.,]+)/i);
  if (adultoMatch) {
    result.refMin = parseNumericValue(adultoMatch[1]);
    result.refMax = parseNumericValue(adultoMatch[2]);
    return result;
  }

  // Try "En adultos:" pattern (e.g. TSH)
  const enAdultosMatch = line.match(/En\s*adultos\s*:?\s*(?:de\s*)?([\d.,]+)\s*a\s*([\d.,]+)/i);
  if (enAdultosMatch) {
    result.refMin = parseNumericValue(enAdultosMatch[1]);
    result.refMax = parseNumericValue(enAdultosMatch[2]);
    return result;
  }

  // "hasta X" pattern
  const hastaMatch = line.match(/hasta\s*([\d.,]+)/i);
  if (hastaMatch) {
    result.refMax = parseNumericValue(hastaMatch[1]);
    return result;
  }

  // Generic "de X a Y" or "X a Y" range
  const rangeMatch = line.match(/(?:de\s*)?([\d.,]+)\s*a\s*([\d.,]+)/i)
    || line.match(/([\d.,]+)a([\d.,]+)/i);
  if (rangeMatch) {
    result.refMin = parseNumericValue(rangeMatch[1]);
    result.refMax = parseNumericValue(rangeMatch[2]);
    return result;
  }

  // "menor a/de X" pattern
  const menorMatch = line.match(/menor\s*(?:a|de)\s*([\d.,]+)/i);
  if (menorMatch) {
    result.refMax = parseNumericValue(menorMatch[1]);
    return result;
  }

  return result;
}

/**
 * Parse reference lines from pages 2+ (with spaces).
 * Collects all reference lines and extracts male/adult/generic ranges.
 */
function parseSpacedRef(refLines: string[]): RefValues {
  const joined = refLines.join(' ');
  const result: RefValues = {
    refMin: null,
    refMax: null,
    refTexto: refLines.join(' | ').substring(0, 200),
  };

  // Try male-specific first: "Hombres: hasta 10 mm" or "Hombre mayor de 0.40"
  const maleHasta = joined.match(/Hombre[s]?\s*:?\s*hasta\s*([\d.,]+)/i);
  if (maleHasta) {
    result.refMax = parseNumericValue(maleHasta[1]);
    return result;
  }

  const maleMayor = joined.match(/Hombre[s]?\s*:?\s*mayor\s*(?:de|a)\s*([\d.,]+)/i);
  if (maleMayor) {
    result.refMin = parseNumericValue(maleMayor[1]);
    return result;
  }

  const maleRange = joined.match(/Hombre[s]?\s*:?\s*(?:de\s*)?([\d.,]+)\s*a\s*([\d.,]+)/i);
  if (maleRange) {
    result.refMin = parseNumericValue(maleRange[1]);
    result.refMax = parseNumericValue(maleRange[2]);
    return result;
  }

  // Adulto Hombre range
  const adultoHombreRange = joined.match(/Adulto\s*Hombre\s*:?\s*(?:de\s*)?([\d.,]+)\s*a\s*([\d.,]+)/i);
  if (adultoHombreRange) {
    result.refMin = parseNumericValue(adultoHombreRange[1]);
    result.refMax = parseNumericValue(adultoHombreRange[2]);
    return result;
  }

  // En adultos range (e.g. TSH: "En adultos:   de 0,4 a 4,0")
  const enAdultosRange = joined.match(/En\s*adultos\s*:?\s*(?:de\s*)?([\d.,]+)\s*a\s*([\d.,]+)/i);
  if (enAdultosRange) {
    result.refMin = parseNumericValue(enAdultosRange[1]);
    result.refMax = parseNumericValue(enAdultosRange[2]);
    return result;
  }

  // Adulto/Adultos range
  const adultoRange = joined.match(/Adultos?\s*:?\s*(?:de\s*)?([\d.,]+)\s*a\s*([\d.,]+)/i);
  if (adultoRange) {
    result.refMin = parseNumericValue(adultoRange[1]);
    result.refMax = parseNumericValue(adultoRange[2]);
    return result;
  }

  // Adultos hasta
  const adultoHasta = joined.match(/Adultos?\s*:?\s*(?:meta\s*deseable\s*)?(?:hasta|menor\s*(?:a|de))\s*([\d.,]+)/i);
  if (adultoHasta) {
    result.refMax = parseNumericValue(adultoHasta[1]);
    return result;
  }

  // Generic "Sin riesgo: menor de X"
  const sinRiesgo = joined.match(/Sin\s*riesgo\s*:?\s*menor\s*(?:de|a)\s*([\d.,]+)/i);
  if (sinRiesgo) {
    result.refMax = parseNumericValue(sinRiesgo[1]);
    return result;
  }

  // Generic "hasta X"
  const hastaMatch = joined.match(/hasta\s*(?:a\s*)?([\d.,]+)/i);
  if (hastaMatch) {
    result.refMax = parseNumericValue(hastaMatch[1]);
    return result;
  }

  // Generic range "X a Y"
  const genericRange = joined.match(/([\d.,]+)\s*a\s*([\d.,]+)/);
  if (genericRange) {
    result.refMin = parseNumericValue(genericRange[1]);
    result.refMax = parseNumericValue(genericRange[2]);
    return result;
  }

  // "menor de/a X"
  const menorMatch = joined.match(/menor\s*(?:de|a)\s*([\d.,]+)/i);
  if (menorMatch) {
    result.refMax = parseNumericValue(menorMatch[1]);
    return result;
  }

  return result;
}

// --- Result extraction ---

/** Check if a line looks like a numeric value */
function isNumericLine(line: string): boolean {
  return /^[\d.,]+$/.test(line.trim());
}

/** Check if a line looks like a unit (short, no digits, or common units) */
function isUnitLine(line: string): boolean {
  const l = line.trim();
  if (l.length > 15) return false;
  if (/^(g\/[ld]|mg\/[ld]|gr\/dl|%|fl|pg|mm|pormm3|uUI\/ml|ng\s*\/\s*dl|ml\/min)$/i.test(l)) return true;
  // Short text without digits that starts lowercase or is known unit
  if (l.length <= 8 && !/^\d/.test(l) && !/^[A-Z]{2,}/.test(l)) return true;
  return false;
}

/** Check if this is a "Valor de referencia" line (with or without spaces) */
function isRefLine(line: string): boolean {
  return /^Valor\s*de\s*referencia/i.test(line) || /^Valordereferencia/i.test(line);
}

/** Check if this is a method line */
function isMethodLine(line: string): boolean {
  return /^M[eé]todo\s*:/i.test(line);
}

/** Check if a line is an uppercase test header (for pages 2+) */
function isTestHeader(line: string): boolean {
  const l = line.trim();
  // Must start with uppercase letter, mostly uppercase content
  if (!/^[A-ZÁÉÍÓÚÑ]/.test(l)) return false;
  // Skip known non-test headers
  if (/^(BIOMETRIA|Contador|Formula|Fórmula|Valor|Metodo|Método|Observacion|Interpretac)/i.test(l)) return false;
  if (isPageHeaderLine(l)) return false;
  if (isRepeatedMetadataLabel(l)) return false;
  // Should be mostly uppercase (allowing dots, parens, slashes, spaces, hyphens)
  const upper = l.replace(/[\s.\-()\/+,:0-9]/g, '');
  const uppercaseCount = (upper.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
  return uppercaseCount > upper.length * 0.6 && l.length > 2;
}

function extractResultados(lines: string[]): AnalisisResultado[] {
  const resultados: AnalisisResultado[] = [];
  const seen = new Set<string>(); // avoid duplicates from repeated pages

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty, page headers, repeated metadata values
    if (!line || isPageHeaderLine(line) || isRepeatedMetadataLabel(line)) {
      i++;
      continue;
    }

    // Skip boilerplate and known patient data values (that follow repeated metadata labels)
    if (/^SIGISMONDI/i.test(line) || /^GARRIDO/i.test(line) || /^210355$/.test(line)
      || /^\d{1,2}\s*de\s*\w+\s*de\s*\d{4}$/i.test(line) || /^\d{1,2}de\w+de\d{4}$/i.test(line)) {
      i++;
      continue;
    }

    // Skip section headers
    if (/^BIOMETRIA\s*HEMATICA/i.test(line) || /^BIOMETRIAHEMATICA/i.test(line)
      || /^Contador\s*hematol/i.test(line) || /^Contadorhematol/i.test(line)
      || /^F[oó]rmula\s*leucocitaria/i.test(line) || /^F[oó]rmulaleucocitaria/i.test(line)
      || /^Valor\s*confirmado/i.test(line)) {
      i++;
      continue;
    }

    // --- Pattern 1: No-spaces page 1 format ---
    // "Hematies:" or "Vol.corp.Medio:" or "R.D.W.:" or "RecuentodePlaquetas:"
    // Followed by numeric value, optional unit, optional "Valordereferencia:..."
    const noSpaceTestMatch = line.match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ][A-Za-záéíóúñ.\-()\/+]+):$/);
    if (noSpaceTestMatch && !isRefLine(line) && !isMethodLine(line)
      && !/^Paciente:$/i.test(line) && !/^Fecha:$/i.test(line)
      && !/^Solicitado/i.test(line) && !/^Protocolo/i.test(line)
      && !/^Resultado/i.test(line)) {
      const rawName = noSpaceTestMatch[1];
      // Check if next line is numeric
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && isNumericLine(nextLine)) {
        const nombre = addSpacesToName(rawName);
        const valor = parseNumericValue(nextLine);
        let unidad: string | null = null;
        let refStart = i + 2;

        // Check for unit on next line
        const unitCandidate = lines[i + 2]?.trim();
        if (unitCandidate && isUnitLine(unitCandidate)) {
          unidad = unitCandidate === 'pormm3' ? 'por mm3' : unitCandidate;
          refStart = i + 3;
        }

        // Look for reference values
        const refs = collectRefs(lines, refStart);
        const estado = computeEstado(valor, refs.refMin, refs.refMax);
        const dimension = findDimension(nombre);

        const key = nombre.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          resultados.push({
            nombre,
            valor,
            unidad,
            valor_texto: null,
            ref_min: refs.refMin,
            ref_max: refs.refMax,
            ref_texto: refs.refTexto,
            estado,
            dimension,
          });
        }
        i = refs.nextIndex;
        continue;
      }
    }

    // --- Pattern 2: "Primera hora:" (e.g. ERITROSEDIMENTACION) ---
    if (/^Primera\s*hora:$/i.test(line)) {
      // Look back for section name
      let sectionName = 'Eritrosedimentacion';
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prev = lines[j].trim();
        if (/^ERITROSEDIMENTACION/i.test(prev)) {
          sectionName = 'Eritrosedimentacion';
          break;
        }
      }

      const nextLine = lines[i + 1]?.trim();
      if (nextLine && isNumericLine(nextLine)) {
        const valor = parseNumericValue(nextLine);
        let unidad: string | null = null;
        let refStart = i + 2;

        const unitCandidate = lines[i + 2]?.trim();
        if (unitCandidate && isUnitLine(unitCandidate)) {
          unidad = unitCandidate;
          refStart = i + 3;
        }

        const refs = collectRefs(lines, refStart);
        const estado = computeEstado(valor, refs.refMin, refs.refMax);

        const key = sectionName.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          resultados.push({
            nombre: sectionName,
            valor,
            unidad,
            valor_texto: null,
            ref_min: refs.refMin,
            ref_max: refs.refMax,
            ref_texto: refs.refTexto,
            estado,
            dimension: findDimension(sectionName),
          });
        }
        i = refs.nextIndex;
        continue;
      }
    }

    // --- Pattern 3: Uppercase test header with colon on same line ---
    // "RELACION COLESTEROL TOTAL/HDL:" or "COLESTEROL NO-HDL:" followed by value
    const inlineColonMatch = line.match(/^([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s.\-()\/+]+\S):$/);
    if (inlineColonMatch && !isRefLine(line) && !isMethodLine(line)
      && !/^Paciente:/i.test(line) && !/^Fecha:/i.test(line)
      && !/^Solicitado/i.test(line) && !/^Resultado/i.test(line)) {
      const rawName = inlineColonMatch[1].trim();
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && isNumericLine(nextLine)) {
        const nombre = rawName.replace(/\s+/g, ' ');
        const valor = parseNumericValue(nextLine);
        let unidad: string | null = null;
        let refStart = i + 2;

        const unitCandidate = lines[i + 2]?.trim();
        if (unitCandidate && isUnitLine(unitCandidate)) {
          unidad = unitCandidate;
          refStart = i + 3;
        }

        const refs = collectRefs(lines, refStart);
        const estado = computeEstado(valor, refs.refMin, refs.refMax);
        const dimension = findDimension(nombre);

        const key = nombre.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          resultados.push({
            nombre,
            valor,
            unidad,
            valor_texto: null,
            ref_min: refs.refMin,
            ref_max: refs.refMax,
            ref_texto: refs.refTexto,
            estado,
            dimension,
          });
        }
        i = refs.nextIndex;
        continue;
      }
    }

    // --- Pattern 4: Uppercase test header, colon on NEXT line ---
    // "GLUCEMIA" / ":" / "1,02" / "g/l"
    // or "TSH -TIROTROFINA ULTRASENSIBLE" / ":" / "6,08"
    if (isTestHeader(line) && !line.endsWith(':')) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine === ':') {
        // Colon on its own line, value after
        const valueLine = lines[i + 2]?.trim();
        if (valueLine && (isNumericLine(valueLine) || /^Negativo$/i.test(valueLine) || /^No\s*reactivo$/i.test(valueLine))) {
          const nombre = line.replace(/\s+/g, ' ').trim();

          if (/^Negativo$/i.test(valueLine) || /^No\s*reactivo$/i.test(valueLine)) {
            // Qualitative with colon on separate line
            const key = nombre.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              resultados.push({
                nombre,
                valor: null,
                unidad: null,
                valor_texto: valueLine,
                ref_min: null,
                ref_max: null,
                ref_texto: null,
                estado: null,
                dimension: findDimension(nombre),
              });
            }
            i += 3;
            continue;
          }

          const valor = parseNumericValue(valueLine);
          let unidad: string | null = null;
          let refStart = i + 3;

          const unitCandidate = lines[i + 3]?.trim();
          if (unitCandidate && isUnitLine(unitCandidate)) {
            unidad = unitCandidate;
            refStart = i + 4;
          }

          const refs = collectRefs(lines, refStart);
          const estado = computeEstado(valor, refs.refMin, refs.refMax);
          const dimension = findDimension(nombre);

          const key = nombre.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            resultados.push({
              nombre,
              valor,
              unidad,
              valor_texto: null,
              ref_min: refs.refMin,
              ref_max: refs.refMax,
              ref_texto: refs.refTexto,
              estado,
              dimension,
            });
          }
          i = refs.nextIndex;
          continue;
        }
      }
    }

    // --- Pattern 5: Qualitative "Resultado:" on its own line ---
    if (/^Resultado[s]?:$/i.test(line)) {
      const valueLine = lines[i + 1]?.trim();
      if (valueLine) {
        // Look back for test name
        let testName = '';
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          const prev = lines[j].trim();
          if (prev.length > 5 && /^[A-ZÁÉÍÓÚÑ]/.test(prev)
            && !isPageHeaderLine(prev) && !isRepeatedMetadataLabel(prev)
            && !/^Valor/i.test(prev) && !/^M[eé]todo/i.test(prev)
            && !/^\(/.test(prev)) {
            testName = prev.replace(/\s+/g, ' ').trim();
            break;
          }
        }
        if (testName) {
          // Parse "No reactivo: 0.08" format
          const qualVal = valueLine.match(/^(.+?):\s*([\d.,]+)$/);
          const displayValue = qualVal ? qualVal[1].trim() : valueLine;

          const key = testName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            resultados.push({
              nombre: testName,
              valor: null,
              unidad: null,
              valor_texto: displayValue,
              ref_min: null,
              ref_max: null,
              ref_texto: null,
              estado: null,
              dimension: findDimension(testName),
            });
          }
        }
        i += 2;
        continue;
      }
    }

    // --- Pattern 6: FGe special case ---
    // "FILTRADOGLOMERULAR ESTIMADO(FGe)" followed by "MDRD-4:" / value / unit
    if (/^FILTRADO\s*GLOMERULAR/i.test(line) || /^FILTRADOGLOMERULAR/i.test(line)) {
      // Next line should be "MDRD-4:" or similar sub-method
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && /^MDRD/i.test(nextLine)) {
        const valueLine = lines[i + 2]?.trim();
        if (valueLine && isNumericLine(valueLine)) {
          const valor = parseNumericValue(valueLine);
          let unidad: string | null = null;
          let refStart = i + 3;

          const unitCandidate = lines[i + 3]?.trim();
          if (unitCandidate && isUnitLine(unitCandidate)) {
            unidad = unitCandidate;
            refStart = i + 4;
          }

          const refs = collectRefs(lines, refStart);
          const estado = computeEstado(valor, refs.refMin, refs.refMax);

          const nombre = 'Filtrado Glomerular Estimado';
          const key = nombre.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            resultados.push({
              nombre,
              valor,
              unidad,
              valor_texto: null,
              ref_min: refs.refMin,
              ref_max: refs.refMax,
              ref_texto: refs.refTexto,
              estado,
              dimension: findDimension(nombre),
            });
          }
          i = refs.nextIndex;
          continue;
        }
      }
    }

    i++;
  }

  return resultados;
}

/**
 * Collect reference value lines starting from index `start`.
 * Returns parsed refs and the next index to continue from.
 */
function collectRefs(lines: string[], start: number): RefValues & { nextIndex: number } {
  const result: RefValues & { nextIndex: number } = {
    refMin: null,
    refMax: null,
    refTexto: null,
    nextIndex: start,
  };

  let idx = start;

  // Skip method lines, annotation lines in parentheses, and "Valor confirmado" lines
  // to reach the "Valor de referencia" line (may be several lines away)
  const maxLookahead = Math.min(start + 6, lines.length);
  while (idx < maxLookahead) {
    const l = lines[idx]?.trim();
    if (!l) { idx++; continue; }
    if (isMethodLine(l)) { idx++; continue; }
    if (/^\(/.test(l)) { idx++; continue; } // parenthetical annotations
    if (/^Valor\s*confirmado/i.test(l)) { idx++; continue; }
    break;
  }

  // Check for "Valor de referencia" or "Valordereferencia"
  if (idx < lines.length && isRefLine(lines[idx].trim())) {
    const refLines: string[] = [];
    // Collect the reference line and continuation lines
    const firstRef = lines[idx].trim();

    // No-spaces format: everything is on one line
    if (/^Valordereferencia:/i.test(firstRef)) {
      refLines.push(firstRef);
      idx++;
      // Collect continuation lines (e.g. "Mujeres:...")
      while (idx < lines.length) {
        const l = lines[idx].trim();
        if (!l || isPageHeaderLine(l) || isRepeatedMetadataLabel(l)) break;
        if (isTestHeader(l) || /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(l) && l.endsWith(':')) break;
        if (isNumericLine(l)) break;
        if (/^(Mujeres|Niños|Neonato|Hombres)/i.test(l)) {
          refLines.push(l);
          idx++;
          continue;
        }
        break;
      }

      const parsed = parseNoSpaceRef(refLines.join(' '));
      result.refMin = parsed.refMin;
      result.refMax = parsed.refMax;
      result.refTexto = parsed.refTexto;
      result.nextIndex = idx;
      return result;
    }

    // Spaced format: collect multi-line reference
    refLines.push(firstRef);
    idx++;
    while (idx < lines.length) {
      const l = lines[idx].trim();
      if (!l) break;
      if (isPageHeaderLine(l) || isRepeatedMetadataLabel(l)) break;
      // Stop if we hit a new test or method or another "Valor de referencia"
      if (isTestHeader(l)) break;
      if (isMethodLine(l)) break;
      if (/^Valor\s*confirmado/i.test(l)) { idx++; break; }
      // Continue collecting ref lines (sub-categories like Mujeres, Niños, etc.)
      if (/^(Hombre|Mujer|Niño|Neonato|Adulto|Embaraz|Lactant|H\.\s*\d|paciente|con\s|1-|2-|13\s)/i.test(l)
        || /^(Sin\s|Riesgo|Alto|Observ|moder|alto|muy\s|hasta\s|\(Hiper|\d+-\d+)/i.test(l)) {
        refLines.push(l);
        idx++;
        continue;
      }
      // If it's a short continuation line with numbers (e.g. "valor muy alto  mayor a 3.10 g/l")
      if (/(?:menor|mayor|hasta|de\s+\d)/i.test(l)) {
        refLines.push(l);
        idx++;
        continue;
      }
      break;
    }

    const parsed = parseSpacedRef(refLines);
    result.refMin = parsed.refMin;
    result.refMax = parsed.refMax;
    result.refTexto = parsed.refTexto;
    result.nextIndex = idx;
    return result;
  }

  result.nextIndex = idx;
  return result;
}

/**
 * Add spaces to no-space names from page 1.
 * "RecuentodePlaquetas" → "Recuento de Plaquetas"
 * "Vol.corp.Medio" → "Vol.corp.Medio"
 * "Glob.blancos" → "Glob.blancos"
 */
function addSpacesToName(raw: string): string {
  // Known mappings for page 1 names
  const mappings: Record<string, string> = {
    'Hematies': 'Hematies',
    'Hematocrito': 'Hematocrito',
    'Hemoglobina': 'Hemoglobina',
    'Vol.corp.Medio': 'Vol.corp.Medio',
    'R.D.W.': 'R.D.W.',
    'Hb.corp.media': 'Hb.corp.media',
    'Conc.Hbcorp.': 'Conc.Hb corp.',
    'Glob.blancos': 'Glob.blancos',
    'Neutr.enCayado': 'Neutr.en Cayado',
    'Neutr.Segmentados': 'Neutr.Segmentados',
    'Eosinofilos': 'Eosinofilos',
    'Basofilos': 'Basofilos',
    'Linfocitos': 'Linfocitos',
    'Monocitos': 'Monocitos',
    'RecuentodePlaquetas': 'Recuento de Plaquetas',
    'Primerahora': 'Primera hora',
  };
  if (mappings[raw]) return mappings[raw];
  return raw;
}

// --- Main entry point ---

export async function parsePdfAnalisis(buffer: Buffer): Promise<ParsedAnalisis> {
  const data = await pdf(buffer);
  const text = data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  return {
    metadata: extractMetadata(lines),
    resultados: extractResultados(lines),
  };
}
