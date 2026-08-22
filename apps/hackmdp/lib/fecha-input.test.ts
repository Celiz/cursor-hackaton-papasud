/**
 * Test de lib/fecha-input.ts
 * Correr:  npx -y tsx@4 apps/gesti/lib/fecha-input.test.ts
 */
import assert from 'node:assert/strict';
import { toDateInput, formatFechaAR } from './fecha-input';

const casos: Array<[unknown, string, string]> = [
  // [entrada, esperado, por qué]
  [
    '2026-08-06T03:00:00.000Z',
    '2026-08-06',
    'columna DATE serializada por pg como Date -> ISO con offset AR (-03): el día es el mismo',
  ],
  [
    '2026-08-06T00:00:00.000Z',
    '2026-08-06',
    'columna DATE serializada con el contenedor en UTC',
  ],
  ['2026-08-06', '2026-08-06', 'ya viene como YYYY-MM-DD (json_agg lo manda así)'],
  [new Date('2026-08-06T03:00:00.000Z'), '2026-08-06', 'objeto Date de JS sin serializar'],
  ['', '', 'string vacío -> vacío, no "Invalid Date"'],
  [null, '', 'null -> vacío'],
  [undefined, '', 'undefined -> vacío'],
  ['no es una fecha', '', 'basura -> vacío, el input no debe romperse'],
  [
    '2026-12-31T03:00:00.000Z',
    '2026-12-31',
    'fin de año: no se corre al año siguiente',
  ],
  [
    '2026-08-06T21:00:00.000Z',
    '2026-08-06',
    'timestamp con hora de tarde: se queda en su día UTC, no retrocede',
  ],
];

let fallos = 0;
for (const [entrada, esperado, porQue] of casos) {
  const obtenido = toDateInput(entrada as never);
  try {
    assert.equal(obtenido, esperado);
    console.log(`  ok  ${JSON.stringify(entrada)} -> "${obtenido}"  (${porQue})`);
  } catch {
    fallos++;
    console.error(
      `  FALLA ${JSON.stringify(entrada)} -> "${obtenido}", esperaba "${esperado}"  (${porQue})`
    );
  }
}

const casosFormato: Array<[unknown, string, string]> = [
  [
    '2026-08-13',
    '13/08/2026',
    'NO retrocede un día: new Date("2026-08-13").toLocaleDateString("es-AR") daría 12/08',
  ],
  ['2026-08-13T03:00:00.000Z', '13/08/2026', 'timestamp de una columna DATE'],
  ['2026-01-01', '01/01/2026', 'año nuevo, con ceros a la izquierda'],
  [null, '', 'null -> vacío'],
  ['', '', 'vacío -> vacío'],
];

for (const [entrada, esperado, porQue] of casosFormato) {
  const obtenido = formatFechaAR(entrada as never);
  try {
    assert.equal(obtenido, esperado);
    console.log(`  ok  formatFechaAR(${JSON.stringify(entrada)}) -> "${obtenido}"  (${porQue})`);
  } catch {
    fallos++;
    console.error(
      `  FALLA formatFechaAR(${JSON.stringify(entrada)}) -> "${obtenido}", esperaba "${esperado}"  (${porQue})`
    );
  }
}

if (fallos > 0) {
  console.error(`\n${fallos} caso(s) fallaron`);
  process.exit(1);
}
console.log(`\n${casos.length + casosFormato.length} casos OK`);
