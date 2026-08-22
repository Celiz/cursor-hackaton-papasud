import { describe, it, expect } from 'vitest';
import {
  estadoInventarioParaTipo,
  estadoCabeceraDesdeItems,
  validarPayloadCreacion,
} from './prestamos-garantias';

describe('estadoInventarioParaTipo', () => {
  it('préstamo → prestamo', () => expect(estadoInventarioParaTipo('prestamo')).toBe('prestamo'));
  it('garantía → garantia', () => expect(estadoInventarioParaTipo('garantia')).toBe('garantia'));
});

describe('estadoCabeceraDesdeItems', () => {
  it('sin ítems → abierto', () => expect(estadoCabeceraDesdeItems([])).toBe('abierto'));
  it('algún ítem afuera → abierto', () =>
    expect(estadoCabeceraDesdeItems([{ estado: 'devuelto' }, { estado: 'afuera' }])).toBe('abierto'));
  it('todos devueltos → devuelto', () =>
    expect(estadoCabeceraDesdeItems([{ estado: 'devuelto' }, { estado: 'devuelto' }])).toBe('devuelto'));
});

describe('validarPayloadCreacion', () => {
  it('tipo inválido', () => expect(validarPayloadCreacion('x', [{ tipo_item: 'equipo', descripcion: 'a' }])).toBe('tipo inválido'));
  it('sin renglones', () => expect(validarPayloadCreacion('prestamo', [])).toBe('se requiere al menos un renglón'));
  it('renglón sin descripción', () =>
    expect(validarPayloadCreacion('prestamo', [{ tipo_item: 'equipo', descripcion: '' }])).toBe('cada renglón requiere descripción'));
  it('tipo_item inválido', () =>
    expect(validarPayloadCreacion('garantia', [{ tipo_item: 'x', descripcion: 'a' }])).toBe('tipo_item inválido'));
  it('payload válido', () =>
    expect(validarPayloadCreacion('prestamo', [{ tipo_item: 'equipo', descripcion: 'Centrífuga' }])).toBeNull());
});
