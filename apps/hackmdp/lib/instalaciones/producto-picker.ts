/**
 * Utilidades puras del buscador de productos del ItemPicker de instalaciones.
 * Sin acceso a DB ni a React — testeable con `node:test` vía `tsx --test`.
 *
 * Existe porque el picker apuntaba a parámetros que /api/productos no lee
 * (`q`, `stock_positive`) y leía una forma de respuesta que la ruta nunca
 * devuelve (`rows`), con lo cual el listado quedaba siempre vacío.
 */

export interface ProductoPickerFiltros {
  search: string;
  categoria?: string;
  marca?: string;
  soloConStock?: boolean;
}

export interface ProductoPickerRow {
  id: string;
  nombre: string;
  codigo: string | null;
  stock_actual: number;
  categoria_nombre: string | null;
  marca_nombre: string | null;
  deposito_nombre: string | null;
  unidad_medida: string | null;
}

export function buildProductoPickerUrl(f: ProductoPickerFiltros): string {
  const sp = new URLSearchParams();
  const texto = f.search.trim();
  if (texto) sp.set('search', texto);
  if (f.categoria) sp.set('categoria', f.categoria);
  if (f.marca) sp.set('marca', f.marca);
  if (f.soloConStock) sp.set('estado_stock', 'con_stock');
  sp.set('pageSize', '30');
  return `/api/productos?${sp.toString()}`;
}

export function mapProductosResponse(json: unknown): ProductoPickerRow[] {
  const data = (json as { data?: unknown } | null | undefined)?.data;
  if (!Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    id: String(r.id),
    nombre: r.nombre ?? '',
    codigo: r.codigo ?? null,
    stock_actual: Number(r.stock_actual ?? 0),
    categoria_nombre: r.categoria_nombre ?? null,
    marca_nombre: r.marca_nombre ?? null,
    deposito_nombre: r.deposito_nombre ?? null,
    unidad_medida: r.unidad_medida ?? null,
  }));
}
