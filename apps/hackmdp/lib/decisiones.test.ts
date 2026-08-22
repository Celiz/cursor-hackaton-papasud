import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toMonto,
  normalizePedido,
  normalizeSolicitud,
  normalizeAprobacion,
  buildDecisiones,
} from "./decisiones";

test("toMonto parsea numeros, strings y devuelve null para vacío", () => {
  assert.equal(toMonto(1250.5), 1250.5);
  assert.equal(toMonto("1250.50"), 1250.5);
  assert.equal(toMonto(null), null);
  assert.equal(toMonto(""), null);
  assert.equal(toMonto("abc"), null);
});

test("normalizePedido mapea a la forma común con acciones aprobar/rechazar", () => {
  const d = normalizePedido({
    id: "p1", numero: "PED-0007", total: "50000", cliente_nombre: "Lab Sur",
    created_at: "2026-07-20T10:00:00Z",
  });
  assert.deepEqual(d, {
    tipo: "pedido", id: "p1", numero: "PED-0007", cliente_nombre: "Lab Sur",
    monto: 50000, solicitante: null, fecha: "2026-07-20T10:00:00Z",
    acciones: ["aprobar", "rechazar"],
  });
});

test("normalizeSolicitud: monto null, acciones cotizar/rechazar", () => {
  const d = normalizeSolicitud({
    id: "s1", numero: "SOL-0003", cliente_nombre: "Vet Norte",
    created_at: "2026-07-21T09:00:00Z",
  });
  assert.equal(d.tipo, "cotizacion");
  assert.equal(d.monto, null);
  assert.deepEqual(d.acciones, ["cotizar", "rechazar"]);
});

test("normalizeAprobacion usa entity_name como numero y trae solicitante", () => {
  const d = normalizeAprobacion({
    id: "a1", entity_name: "Comodato #12", entity_type: "comodato",
    solicitante_nombre: "Ana", created_at: "2026-07-19T08:00:00Z",
  });
  assert.equal(d.tipo, "aprobacion");
  assert.equal(d.numero, "Comodato #12");
  assert.equal(d.solicitante, "Ana");
  assert.deepEqual(d.acciones, ["aprobar", "rechazar"]);
});

test("buildDecisiones ordena por antigüedad (más viejo primero) y cuenta por tipo", () => {
  const res = buildDecisiones(
    [{ id: "p1", numero: "PED-1", total: "100", cliente_nombre: "A", created_at: "2026-07-20T00:00:00Z" }],
    [{ id: "s1", numero: "SOL-1", cliente_nombre: "B", created_at: "2026-07-18T00:00:00Z" }],
    [{ id: "a1", entity_name: "X", entity_type: "y", solicitante_nombre: "C", created_at: "2026-07-22T00:00:00Z" }],
  );
  assert.deepEqual(res.items.map((i) => i.id), ["s1", "p1", "a1"]);
  assert.deepEqual(res.conteos, { pedido: 1, cotizacion: 1, aprobacion: 1, total: 3 });
});
