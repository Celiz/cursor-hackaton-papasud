import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProductoPickerUrl, mapProductosResponse } from "./producto-picker";

test("buildProductoPickerUrl usa search= (no q=) y escapa el texto", () => {
  assert.equal(
    buildProductoPickerUrl({ search: "guante nitrilo" }),
    "/api/productos?search=guante+nitrilo&pageSize=30"
  );
});

test("buildProductoPickerUrl sin texto no manda search=", () => {
  assert.equal(buildProductoPickerUrl({ search: "   " }), "/api/productos?pageSize=30");
});

test("buildProductoPickerUrl: soloConStock agrega estado_stock=con_stock", () => {
  assert.equal(
    buildProductoPickerUrl({ search: "", soloConStock: true }),
    "/api/productos?estado_stock=con_stock&pageSize=30"
  );
});

test("buildProductoPickerUrl: soloConStock falso NO agrega estado_stock", () => {
  const url = buildProductoPickerUrl({ search: "", soloConStock: false });
  assert.ok(!url.includes("estado_stock"));
});

test("buildProductoPickerUrl: categoria y marca sólo cuando están seteadas", () => {
  assert.equal(
    buildProductoPickerUrl({ search: "", categoria: "Consumible", marca: "Wiener" }),
    "/api/productos?categoria=Consumible&marca=Wiener&pageSize=30"
  );
  const sinFiltros = buildProductoPickerUrl({ search: "", categoria: "", marca: undefined });
  assert.ok(!sinFiltros.includes("categoria"));
  assert.ok(!sinFiltros.includes("marca"));
});

test("mapProductosResponse extrae de { data: [...] }", () => {
  const filas = mapProductosResponse({
    data: [
      {
        id: "abc",
        nombre: "Guante nitrilo",
        codigo: "GN-01",
        stock_actual: "12",
        categoria_nombre: "Descartables",
        marca_nombre: "Wiener",
        deposito_nombre: "Central",
        unidad_medida: "caja",
      },
    ],
    pagination: { page: 1 },
  });
  assert.equal(filas.length, 1);
  assert.deepEqual(filas[0], {
    id: "abc",
    nombre: "Guante nitrilo",
    codigo: "GN-01",
    stock_actual: 12,
    categoria_nombre: "Descartables",
    marca_nombre: "Wiener",
    deposito_nombre: "Central",
    unidad_medida: "caja",
  });
});

test("mapProductosResponse: formas que no son { data: [...] } devuelven [] sin tirar", () => {
  assert.deepEqual(mapProductosResponse({ rows: [{ id: "x" }] }), []);
  assert.deepEqual(mapProductosResponse([{ id: "x" }]), []);
  assert.deepEqual(mapProductosResponse(null), []);
  assert.deepEqual(mapProductosResponse(undefined), []);
  assert.deepEqual(mapProductosResponse({ data: null }), []);
});

test("mapProductosResponse: campos ausentes no rompen la fila", () => {
  const filas = mapProductosResponse({ data: [{ id: 7 }] });
  assert.deepEqual(filas[0], {
    id: "7",
    nombre: "",
    codigo: null,
    stock_actual: 0,
    categoria_nombre: null,
    marca_nombre: null,
    deposito_nombre: null,
    unidad_medida: null,
  });
});
