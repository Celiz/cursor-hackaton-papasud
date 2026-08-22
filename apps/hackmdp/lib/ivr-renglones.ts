/**
 * Renglón normalizado de un IVR. Forma única que consume el panel de historial,
 * sin importar de qué fuente venga (tabla facturas_items o detalles.insumos jsonb).
 */
export interface RenglonIvr {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto_id?: string;
}

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function prodId(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  return String(v);
}

interface IvrLike {
  facturas_items?: Array<Record<string, unknown>> | null;
  detalles?: { insumos?: Array<Record<string, unknown>> } | string | null;
}

/**
 * Devuelve los renglones de un IVR unificando las dos fuentes:
 *  - Si hay filas en `facturas_items`, se usan esas.
 *  - Si no, se leen de `detalles.insumos` (jsonb), mapeando `nombre`->descripcion
 *    y `subtotal ?? monto`->subtotal.
 *  - Si no hay ninguna, devuelve [].
 */
export function normalizarRenglonesIvr(ivr: IvrLike): RenglonIvr[] {
  const items = Array.isArray(ivr.facturas_items) ? ivr.facturas_items : [];
  if (items.length > 0) {
    return items.map((it) => ({
      descripcion: String(it.descripcion ?? ""),
      cantidad: num(it.cantidad),
      precio_unitario: num(it.precio_unitario),
      subtotal: num(it.subtotal),
      producto_id: prodId(it.producto_id),
    }));
  }

  let detalles = ivr.detalles;
  if (typeof detalles === "string") {
    try {
      detalles = JSON.parse(detalles);
    } catch {
      detalles = null;
    }
  }
  const insumos =
    detalles && typeof detalles === "object" && Array.isArray((detalles as any).insumos)
      ? (detalles as any).insumos as Array<Record<string, unknown>>
      : [];

  return insumos.map((ins) => {
    const cantidad = num(ins.cantidad);
    const precio = num(ins.precio_unitario);
    const subtotal =
      ins.subtotal != null
        ? num(ins.subtotal)
        : ins.monto != null
          ? num(ins.monto)
          : cantidad * precio;
    return {
      descripcion: String(ins.nombre ?? ""),
      cantidad,
      precio_unitario: precio,
      subtotal,
      producto_id: prodId(ins.producto_id),
    };
  });
}
