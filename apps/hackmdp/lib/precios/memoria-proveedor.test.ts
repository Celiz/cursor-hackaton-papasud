import assert from "node:assert/strict";
import { test } from "node:test";
import { mapeoMemoria } from "./memoria-proveedor";

test("item con producto_id y código → mapeo a persistir", () => {
  assert.deepEqual(
    mapeoMemoria({
      producto_id: "p1",
      codigo_proveedor: "G-RT30",
      nombre_proveedor: "Timer mecánico",
      precio_neto: 96000,
      precio_costo: 90000,
    }),
    { productoId: "p1", codigoProveedor: "G-RT30", nombreProveedor: "Timer mecánico", ultimoPrecio: 96000 }
  );
});

test("usa precio_costo si no hay precio_neto", () => {
  assert.equal(
    mapeoMemoria({ producto_id: "p1", codigo_proveedor: "X", precio_costo: 500 })?.ultimoPrecio,
    500
  );
});

test("sin producto_id → null (no hay nada que recordar)", () => {
  assert.equal(mapeoMemoria({ producto_id: null, codigo_proveedor: "G-RT30" }), null);
});

test("sin código de proveedor → null (no se puede mapear)", () => {
  assert.equal(mapeoMemoria({ producto_id: "p1", codigo_proveedor: "  " }), null);
});

test("trim de código y nombre; nombre vacío → null", () => {
  assert.deepEqual(mapeoMemoria({ producto_id: "p1", codigo_proveedor: " G-1 ", nombre_proveedor: "  " }), {
    productoId: "p1",
    codigoProveedor: "G-1",
    nombreProveedor: null,
    ultimoPrecio: null,
  });
});
