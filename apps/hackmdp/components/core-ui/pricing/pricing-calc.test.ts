import assert from 'node:assert/strict'
import { test } from 'node:test'
import { recalcPricing, convMoneda } from './pricing-calc'

test('convMoneda: USD→ARS multiplica por cotización', () => {
  assert.equal(convMoneda(100, 'USD', 'ARS', 1000), 100000)
})

test('convMoneda: misma moneda no cambia', () => {
  assert.equal(convMoneda(100, 'ARS', 'ARS', 1000), 100)
})

test('convMoneda: sin cotización devuelve el monto', () => {
  assert.equal(convMoneda(100, 'USD', 'ARS', 0), 100)
})

test('recalcPricing calculado: deriva precio_venta de costo + ganancia', () => {
  const r = recalcPricing(
    { precio_costo: '100', moneda_compra: 'ARS', moneda: 'ARS', ganancia: '50', precio_venta: '', precio_venta_modo: 'calculado' },
    0,
  )
  assert.equal(r.precio_venta, '150.00')
})

test('recalcPricing fijo: deriva ganancia de precio_venta / costo', () => {
  const r = recalcPricing(
    { precio_costo: '100', moneda_compra: 'ARS', moneda: 'ARS', ganancia: '', precio_venta: '150', precio_venta_modo: 'fijo' },
    0,
  )
  assert.equal(r.ganancia, '50.00')
})

test('recalcPricing calculado cross-moneda usa cotización', () => {
  const r = recalcPricing(
    { precio_costo: '10', moneda_compra: 'USD', moneda: 'ARS', ganancia: '0', precio_venta: '', precio_venta_modo: 'calculado' },
    1000,
  )
  assert.equal(r.precio_venta, '10000.00')
})
