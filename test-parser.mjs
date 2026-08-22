import { readFileSync } from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

// Inline the parser logic for testing (since it's TypeScript)
const DIMENSION_MAP = {
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
  'tsh': 'descanso',
  'tsh - tirotrofina ultrasensible': 'descanso',
  'tiroxina libre': 'descanso',
  'eritrosedimentacion': 'descanso',
  'hematies': 'biomarkers',
  'hematocrito': 'biomarkers',
  'hemoglobina': 'biomarkers',
  'vol.corp.medio': 'biomarkers',
  'r.d.w.': 'biomarkers',
  'hb. corp.media': 'biomarkers',
  'conc. hb corp.': 'biomarkers',
  'glob. blancos': 'biomarkers',
  'recuento de plaquetas': 'biomarkers',
  'neutr.en cayado': 'biomarkers',
  'neutr.segmentados': 'biomarkers',
  'eosinofilos': 'biomarkers',
  'basofilos': 'biomarkers',
  'linfocitos': 'biomarkers',
  'monocitos': 'biomarkers',
};

function findDimension(nombre) {
  const key = nombre.toLowerCase().trim();
  if (DIMENSION_MAP[key]) return DIMENSION_MAP[key];
  for (const [pattern, dim] of Object.entries(DIMENSION_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) return dim;
  }
  return null;
}

const buffer = readFileSync('/home/aeterna/210355.pdf');
const data = await pdf(buffer);

console.log('=== RAW TEXT (first 2000 chars) ===');
console.log(data.text.substring(0, 2000));
console.log('\n=== TOTAL TEXT LENGTH:', data.text.length, '===');

// Check what lines look like value lines
const lines = data.text.split('\n').map(l => l.trim()).filter(Boolean);
const valuePattern = /^([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s\.\-\(\)\+\/]+?)\s*:\s*(.+)/;

console.log('\n=== POTENTIAL VALUE LINES ===');
for (const line of lines) {
  const m = valuePattern.exec(line);
  if (m) {
    const nombre = m[1].trim();
    const rest = m[2].trim();
    const dim = findDimension(nombre);
    console.log(`  ${nombre}: ${rest} ${dim ? '-> ' + dim : ''}`);
  }
}
