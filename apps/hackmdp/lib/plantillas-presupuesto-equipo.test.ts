import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toPlantillaItem,
  toPlantillaDefaults,
  aplicarPrecio,
} from './plantillas-presupuesto-equipo';

test('toPlantillaItem conserva estructura y descarta precios', () => {
  const row = {
    tipo: 'equipo', equipo_id: 'eq-1', producto_id: null, descripcion: 'Diestro',
    cantidad: 2, iva_porcentaje: 10.5, descuento_porcentaje: 5, condicion: 'nuevo',
    comentario: 'ok', es_opcional: false, incluido_en_precio: true,
    especificaciones: { a: 1 }, especificaciones_personalizada: true,
    forma_pago: 'contado', tiempo_entrega: '30 dias', garantia: '12 meses',
    incluye_instalacion: true, incluye_capacitacion: false, incluye_flete: false,
    // precios que DEBEN descartarse:
    precio_costo: 100, precio_unitario: 150, subtotal: 300, moneda: 'USD',
  };
  const item = toPlantillaItem(row);
  assert.equal(item.equipo_id, 'eq-1');
  assert.equal(item.cantidad, 2);
  assert.equal(item.iva_porcentaje, 10.5);
  assert.equal(item.descuento_porcentaje, 5);
  assert.equal(item.es_opcional, false);
  assert.equal(item.incluye_instalacion, true);
  assert.deepEqual(item.especificaciones, { a: 1 });
  assert.ok(!('precio_costo' in item));
  assert.ok(!('precio_unitario' in item));
  assert.ok(!('subtotal' in item));
  assert.ok(!('moneda' in item));
});

test('toPlantillaItem aplica defaults sanos a campos faltantes', () => {
  const item = toPlantillaItem({ equipo_id: 'eq-1' });
  assert.equal(item.cantidad, 1);
  assert.equal(item.es_opcional, false);
  assert.equal(item.incluido_en_precio, true);
  assert.equal(item.producto_id, null);
});

test('toPlantillaDefaults toma solo campos de cabecera reutilizables', () => {
  const d = toPlantillaDefaults({
    forma_pago: 'contado', validez_dias: 30, titulo: 'X',
    cliente_id: 'c-1', numero: 'PRES-1', estado: 'enviado', // NO deben aparecer
  });
  assert.equal(d.forma_pago, 'contado');
  assert.equal(d.validez_dias, 30);
  assert.equal(d.titulo, 'X');
  assert.ok(!('cliente_id' in d));
  assert.ok(!('numero' in d));
  assert.ok(!('estado' in d));
});

test('aplicarPrecio calcula subtotal con precio fresco, cantidad y descuento', () => {
  const item = toPlantillaItem({ equipo_id: 'eq-1', cantidad: 2, descuento_porcentaje: 10 });
  const linea = aplicarPrecio(item, { precio_costo: 100, precio_unitario: 150, moneda: 'USD' });
  assert.equal(linea.precio_costo, 100);
  assert.equal(linea.precio_unitario, 150);
  assert.equal(linea.moneda, 'USD');
  assert.equal(linea.subtotal, 270); // 150 * 2 * (1 - 0.10)
  assert.equal(linea.equipo_id, 'eq-1');
});

test('aplicarPrecio sin descuento usa subtotal = precio * cantidad', () => {
  const item = toPlantillaItem({ producto_id: 'p-1', cantidad: 3 });
  const linea = aplicarPrecio(item, { precio_costo: 10, precio_unitario: 20, moneda: 'ARS' });
  assert.equal(linea.subtotal, 60);
});
