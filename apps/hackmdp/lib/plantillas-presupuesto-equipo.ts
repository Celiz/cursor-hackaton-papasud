// Lógica pura de plantillas de presupuestos de equipos.
// - toPlantillaItem / toPlantillaDefaults: arman el snapshot de estructura (sin precios).
// - aplicarPrecio: al instanciar, combina la estructura con un precio fresco del catálogo.
// Sin dependencias de DB ni de React (testeable con node:test).

export interface PlantillaItem {
  tipo: string;
  equipo_id: string | null;
  producto_id: string | null;
  descripcion: string | null;
  cantidad: number;
  iva_porcentaje: number | null;
  descuento_porcentaje: number | null;
  condicion: string | null;
  comentario: string | null;
  es_opcional: boolean;
  incluido_en_precio: boolean;
  especificaciones: unknown | null;
  especificaciones_personalizada: boolean;
  forma_pago: string | null;
  tiempo_entrega: string | null;
  garantia: string | null;
  incluye_instalacion: boolean;
  incluye_capacitacion: boolean;
  incluye_flete: boolean;
}

export interface PlantillaDefaults {
  forma_pago: string | null;
  tiempo_entrega: string | null;
  garantia: string | null;
  validez_dias: number | null;
  validez_texto: string | null;
  incluye_instalacion: boolean;
  incluye_capacitacion: boolean;
  incluye_flete: boolean;
  titulo: string | null;
  descripcion_comercial: string | null;
  especificaciones_tecnicas: string | null;
  beneficios: string | null;
  terminos_condiciones: string | null;
  observaciones: string | null;
  mostrar_iva_desglosado: boolean;
  usar_label_precio_final: boolean;
  condicion: string | null;
}

export interface PrecioResuelto {
  precio_costo: number;
  precio_unitario: number;
  moneda: string;
}

export interface LineaResuelta extends PlantillaItem {
  precio_costo: number;
  precio_unitario: number;
  moneda: string;
  subtotal: number;
}

const str = (v: unknown): string | null => (v == null || v === '' ? null : String(v));
const num = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));
const bool = (v: unknown, def = false): boolean => (v == null ? def : Boolean(v));

/** Toma una fila de presupuestos_equipos_items (o una línea del form) y guarda
 *  solo la ESTRUCTURA, descartando precios (precio_costo/precio_unitario/subtotal/moneda). */
export function toPlantillaItem(row: Record<string, unknown>): PlantillaItem {
  return {
    tipo: str(row.tipo) ?? (row.equipo_id ? 'equipo' : 'insumo'),
    equipo_id: str(row.equipo_id),
    producto_id: str(row.producto_id),
    descripcion: str(row.descripcion),
    cantidad: num(row.cantidad) ?? 1,
    iva_porcentaje: num(row.iva_porcentaje),
    descuento_porcentaje: num(row.descuento_porcentaje),
    condicion: str(row.condicion),
    comentario: str(row.comentario),
    es_opcional: bool(row.es_opcional, false),
    incluido_en_precio: bool(row.incluido_en_precio, true),
    especificaciones: row.especificaciones ?? null,
    especificaciones_personalizada: bool(row.especificaciones_personalizada, false),
    forma_pago: str(row.forma_pago),
    tiempo_entrega: str(row.tiempo_entrega),
    garantia: str(row.garantia),
    incluye_instalacion: bool(row.incluye_instalacion, false),
    incluye_capacitacion: bool(row.incluye_capacitacion, false),
    incluye_flete: bool(row.incluye_flete, false),
  };
}

/** Snapshot de la cabecera reutilizable de un presupuesto-equipo (sin cliente/número/fechas/estado). */
export function toPlantillaDefaults(row: Record<string, unknown>): PlantillaDefaults {
  return {
    forma_pago: str(row.forma_pago),
    tiempo_entrega: str(row.tiempo_entrega),
    garantia: str(row.garantia),
    validez_dias: num(row.validez_dias),
    validez_texto: str(row.validez_texto),
    incluye_instalacion: bool(row.incluye_instalacion, false),
    incluye_capacitacion: bool(row.incluye_capacitacion, false),
    incluye_flete: bool(row.incluye_flete, false),
    titulo: str(row.titulo),
    descripcion_comercial: str(row.descripcion_comercial),
    especificaciones_tecnicas: str(row.especificaciones_tecnicas),
    beneficios: str(row.beneficios),
    terminos_condiciones: str(row.terminos_condiciones),
    observaciones: str(row.observaciones),
    mostrar_iva_desglosado: bool(row.mostrar_iva_desglosado, false),
    usar_label_precio_final: bool(row.usar_label_precio_final, false),
    condicion: str(row.condicion),
  };
}

/** Combina la estructura de una línea con un precio fresco del catálogo y recalcula el subtotal. */
export function aplicarPrecio(item: PlantillaItem, precio: PrecioResuelto): LineaResuelta {
  const cantidad = item.cantidad ?? 1;
  const descuento = item.descuento_porcentaje ?? 0;
  const subtotal = precio.precio_unitario * cantidad * (1 - descuento / 100);
  return {
    ...item,
    precio_costo: precio.precio_costo,
    precio_unitario: precio.precio_unitario,
    moneda: precio.moneda,
    subtotal,
  };
}
