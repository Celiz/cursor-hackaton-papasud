export type DecisionTipo = "pedido" | "cotizacion" | "aprobacion";

export interface Decision {
  tipo: DecisionTipo;
  id: string;
  numero: string;
  cliente_nombre: string | null;
  monto: number | null;
  solicitante: string | null;
  fecha: string;
  acciones: string[];
}

export interface DecisionesResult {
  items: Decision[];
  conteos: { pedido: number; cotizacion: number; aprobacion: number; total: number };
}

export interface PedidoRow {
  id: string;
  numero: string | null;
  total: string | number | null;
  cliente_nombre: string | null;
  created_at: string;
}

export interface SolicitudRow {
  id: string;
  numero: string | null;
  cliente_nombre: string | null;
  created_at: string;
}

export interface AprobacionRow {
  id: string;
  entity_name: string | null;
  entity_type: string | null;
  solicitante_nombre: string | null;
  created_at: string;
}

export function toMonto(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export function normalizePedido(r: PedidoRow): Decision {
  return {
    tipo: "pedido",
    id: String(r.id),
    numero: r.numero ?? String(r.id),
    cliente_nombre: r.cliente_nombre ?? null,
    monto: toMonto(r.total),
    solicitante: null,
    fecha: r.created_at,
    acciones: ["aprobar", "rechazar"],
  };
}

export function normalizeSolicitud(r: SolicitudRow): Decision {
  return {
    tipo: "cotizacion",
    id: String(r.id),
    numero: r.numero ?? String(r.id),
    cliente_nombre: r.cliente_nombre ?? null,
    monto: null,
    solicitante: null,
    fecha: r.created_at,
    acciones: ["cotizar", "rechazar"],
  };
}

export function normalizeAprobacion(r: AprobacionRow): Decision {
  return {
    tipo: "aprobacion",
    id: String(r.id),
    numero: r.entity_name ?? String(r.id),
    cliente_nombre: null,
    monto: null,
    solicitante: r.solicitante_nombre ?? null,
    fecha: r.created_at,
    acciones: ["aprobar", "rechazar"],
  };
}

export function buildDecisiones(
  pedidos: PedidoRow[],
  solicitudes: SolicitudRow[],
  aprobaciones: AprobacionRow[],
): DecisionesResult {
  const items: Decision[] = [
    ...pedidos.map(normalizePedido),
    ...solicitudes.map(normalizeSolicitud),
    ...aprobaciones.map(normalizeAprobacion),
  ];
  items.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return {
    items,
    conteos: {
      pedido: pedidos.length,
      cotizacion: solicitudes.length,
      aprobacion: aprobaciones.length,
      total: items.length,
    },
  };
}
