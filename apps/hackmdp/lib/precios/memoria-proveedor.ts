// "Memoria" de vinculación proveedor↔producto. Cuando se vincula un item de una lista
// de proveedor a un producto, se persiste el mapeo (proveedor + codigo_proveedor →
// producto) en producto_proveedores, para que la PRÓXIMA lista del mismo proveedor
// auto-vincule por código sin re-trabajo. Acá vive solo la lógica pura de qué persistir;
// el upsert lo hace la ruta PATCH de items.

export interface ItemVinculado {
  producto_id?: string | null;
  codigo_proveedor?: string | null;
  nombre_proveedor?: string | null;
  precio_neto?: number | null;
  precio_costo?: number | null;
}

export interface MapeoProveedor {
  productoId: string;
  codigoProveedor: string;
  nombreProveedor: string | null;
  ultimoPrecio: number | null;
}

/**
 * Mapeo a guardar en producto_proveedores, o null si el item no aporta memoria
 * (sin producto vinculado o sin código de proveedor).
 */
export function mapeoMemoria(item: ItemVinculado): MapeoProveedor | null {
  const productoId = item.producto_id ?? null;
  const codigo = (item.codigo_proveedor ?? "").trim();
  if (!productoId || !codigo) return null;
  return {
    productoId,
    codigoProveedor: codigo,
    nombreProveedor: (item.nombre_proveedor ?? "").trim() || null,
    ultimoPrecio: item.precio_neto ?? item.precio_costo ?? null,
  };
}
