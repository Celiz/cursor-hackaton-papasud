import {
  agruparTotalesPorMoneda,
  normalizarMoneda,
  type MonedaPresupuesto,
  type TotalPorMoneda,
} from "../presupuesto-equipo-totales";

/** Equipo de catálogo (campos que usan los helpers/editor). */
export interface EquipoLineaEquipo {
  id: string;
  marca?: string | null;
  modelo?: string | null;
  imagen_url?: string | null;
  precio_lista?: number | null;
  precio_lista_moneda?: string | null;
  moneda_compra?: string | null;
  precio_costo?: number | null;
  iva?: number | null;
  especificaciones?: Record<string, unknown> | string[] | null;
  [k: string]: unknown;
}

/** Una línea de equipo/insumo compartida por presupuesto y oportunidad. */
export interface EquipoLinea {
  id: string;                 // key local (crypto.randomUUID())
  equipo_id: string | null;
  equipo: EquipoLineaEquipo | null;
  cantidad: number;
  precio_unitario: number;    // venta, en la moneda de la línea
  precio_costo: number;       // costo, en la moneda de la línea
  ganancia: string;           // % markup, buffer editable
  iva_porcentaje: number;
  descuento_porcentaje: number;
  moneda: MonedaPresupuesto;  // moneda nativa de la línea (source of truth)
  especificaciones?: Record<string, unknown> | string[] | null;
  especificaciones_personalizada?: boolean;
  // opcionales que usa oportunidad (presupuesto los ignora):
  producto_id?: string | null;
  equipo_unidad_id?: string | null;
  numero_serie?: string | null;
  descripcion?: string;
}

/** Ganancia % derivada del precio de venta y el costo (string, para el input). */
export function deriveGanancia(precio: number, costo: number): string {
  return costo > 0 && precio > 0 ? (((precio / costo) - 1) * 100).toFixed(2) : "";
}

/** Costo del equipo convertido a la moneda del presupuesto usando la cotización. */
export function costoEnMoneda(
  equipo: EquipoLineaEquipo,
  monedaPresupuesto: MonedaPresupuesto,
  cotizacionUsd: number,
): number {
  const raw = Number(equipo?.precio_costo) || 0;
  if (raw <= 0) return 0;
  const equipoMoneda = normalizarMoneda(
    (equipo?.moneda_compra as string) || (equipo?.precio_lista_moneda as string),
  );
  if (equipoMoneda === monedaPresupuesto || !cotizacionUsd || cotizacionUsd <= 0) {
    return Number(raw.toFixed(2));
  }
  return Number((monedaPresupuesto === "ARS" ? raw * cotizacionUsd : raw / cotizacionUsd).toFixed(2));
}

/** Subtotal de una línea (sin IVA), en su moneda nativa. */
export function cardSubtotal(
  l: Pick<EquipoLinea, "cantidad" | "precio_unitario" | "descuento_porcentaje">,
): number {
  return (l.cantidad || 0) * (l.precio_unitario || 0) * (1 - (l.descuento_porcentaje || 0) / 100);
}

/** Totales agrupados por moneda (USD, ARS), sin convertir entre monedas. */
export function lineasATotales(lineas: EquipoLinea[]): TotalPorMoneda[] {
  return agruparTotalesPorMoneda(
    lineas.map((l) => ({
      subtotal: cardSubtotal(l),
      ivaPorcentaje: l.iva_porcentaje ?? 10.5,
      moneda: l.moneda,
    })),
  );
}
