import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseNumeroLocal,
  parseFormateadoLocal,
  formatMientrasEscribe,
  toTextoDisplay,
  insertarSeparadorDecimal,
} from './number-format'

// --- parseFormateadoLocal: el punto SIEMPRE es miles (bug 1.000–999.999) ---
test('parseFormateadoLocal: punto = miles, nunca decimal', () => {
  assert.equal(parseFormateadoLocal('456.878'), 456878)
  assert.equal(parseFormateadoLocal('1.234'), 1234)
  assert.equal(parseFormateadoLocal('999.999'), 999999)
  assert.equal(parseFormateadoLocal('1.355.153,50'), 1355153.5)
  assert.equal(parseFormateadoLocal('456,87'), 456.87)
})
test('round-trip: tipear N y parsear el display da N (incluida la banda 1k–999k)', () => {
  for (const v of [12, 1234, 456878, 999999, 1000000, 1355153]) {
    assert.equal(parseFormateadoLocal(formatMientrasEscribe(String(v), 2)), v)
  }
})

// --- parseNumeroLocal ---
test('parseNumeroLocal: coma decimal es-AR + miles con punto', () => {
  assert.equal(parseNumeroLocal('1.355.153,50'), 1355153.5)
})
test('parseNumeroLocal: varios puntos sin coma = miles', () => {
  assert.equal(parseNumeroLocal('1.355.153'), 1355153)
})

// --- formatMientrasEscribe ---
test('formatMientrasEscribe: agrupa miles mientras se escribe', () => {
  assert.equal(formatMientrasEscribe('1355153', 2), '1.355.153')
})
test('formatMientrasEscribe: coma como decimal, limita decimales', () => {
  assert.equal(formatMientrasEscribe('1355153,567', 2), '1.355.153,56')
})

// --- toTextoDisplay (formato en blur) ---
test('toTextoDisplay: agrega los decimales en es-AR', () => {
  assert.equal(toTextoDisplay(1355153, 2), '1.355.153,00')
})

// --- insertarSeparadorDecimal: el punto del numpad → coma decimal ---
test('insertarSeparadorDecimal: punto al final inserta coma decimal', () => {
  // Simula al usuario apretando el punto del numpad con el cursor al final
  // del entero ya formateado "1.355.153".
  const res = insertarSeparadorDecimal('1.355.153', 9, 9, 2)
  assert.deepEqual(res, { text: '1.355.153,', caret: 10 })
})

test('insertarSeparadorDecimal: tras la coma se pueden tipear decimales', () => {
  const res = insertarSeparadorDecimal('1.355.153', 9, 9, 2)!
  // El usuario sigue escribiendo "5" después de la coma.
  assert.equal(formatMientrasEscribe(res.text + '5', 2), '1.355.153,5')
})

test('insertarSeparadorDecimal: no duplica si ya hay coma', () => {
  assert.equal(insertarSeparadorDecimal('1.234,5', 7, 7, 2), null)
})

test('insertarSeparadorDecimal: campos enteros (decimals=0) no llevan coma', () => {
  assert.equal(insertarSeparadorDecimal('100', 3, 3, 0), null)
})
