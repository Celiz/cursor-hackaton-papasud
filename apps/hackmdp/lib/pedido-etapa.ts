import {
  Clock,
  CheckCircle2,
  Wrench,
  PackageCheck,
  Send,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Pedido } from "./types";

export type PedidoEtapa =
  | "nuevo"
  | "confirmado"
  | "preparando"
  | "listo"
  | "despachado"
  | "en_transito"
  | "entregado"
  | "cancelado";

export const etapaConfig: Record<
  PedidoEtapa,
  {
    label: string;
    icon: LucideIcon;
    color: string;
    badgeClass: string;
    kanbanHeader: string;
    stripe: string;
    order: number;
  }
> = {
  nuevo: {
    label: "Nuevo",
    icon: Clock,
    color: "text-gray-700",
    badgeClass: "text-gray-700 bg-gray-50 border-gray-200",
    kanbanHeader: "bg-gray-100 text-gray-800",
    stripe: "bg-gray-400",
    order: 0,
  },
  confirmado: {
    label: "Confirmado",
    icon: CheckCircle2,
    color: "text-blue-700",
    badgeClass: "text-blue-700 bg-blue-50 border-blue-200",
    kanbanHeader: "bg-blue-100 text-blue-800",
    stripe: "bg-blue-500",
    order: 1,
  },
  preparando: {
    label: "Preparando",
    icon: Wrench,
    color: "text-purple-700",
    badgeClass: "text-purple-700 bg-purple-50 border-purple-200",
    kanbanHeader: "bg-purple-100 text-purple-800",
    stripe: "bg-purple-500",
    order: 2,
  },
  listo: {
    label: "Listo",
    icon: PackageCheck,
    color: "text-green-700",
    badgeClass: "text-green-700 bg-green-50 border-green-200",
    kanbanHeader: "bg-green-100 text-green-800",
    stripe: "bg-green-500",
    order: 3,
  },
  despachado: {
    label: "Despachado",
    icon: Send,
    color: "text-cyan-700",
    badgeClass: "text-cyan-700 bg-cyan-50 border-cyan-200",
    kanbanHeader: "bg-cyan-100 text-cyan-800",
    stripe: "bg-cyan-500",
    order: 4,
  },
  en_transito: {
    label: "En Tránsito",
    icon: Truck,
    color: "text-orange-700",
    badgeClass: "text-orange-700 bg-orange-50 border-orange-200",
    kanbanHeader: "bg-orange-100 text-orange-800",
    stripe: "bg-orange-500",
    order: 5,
  },
  entregado: {
    label: "Entregado",
    icon: CheckCircle2,
    color: "text-emerald-700",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    kanbanHeader: "bg-emerald-100 text-emerald-800",
    stripe: "bg-emerald-500",
    order: 6,
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-red-700",
    badgeClass: "text-red-700 bg-red-50 border-red-200",
    kanbanHeader: "bg-red-100 text-red-800",
    stripe: "bg-red-500",
    order: 7,
  },
};

export function computeEtapa(pedido: Pedido): PedidoEtapa {
  const estado = pedido.estado;
  const prepEstado = pedido.preparacion_estado;
  const entregaEstado = pedido.entrega_estado;

  if (estado === "cancelado") return "cancelado";

  // Delivery phase takes precedence
  if (entregaEstado === "entregado" || estado === "entregado")
    return "entregado";
  if (entregaEstado === "en_transito") return "en_transito";
  if (entregaEstado === "despachado") return "despachado";

  // Preparation phase
  if (prepEstado === "despachado") return "despachado";
  if (prepEstado === "listo") return "listo";
  if (
    pedido.preparacion_id &&
    ["pendiente", "en_preparacion", "parcial"].includes(prepEstado || "")
  )
    return "preparando";

  // Direct pedido states (e-commerce flow)
  if (estado === "enviado") return "despachado";
  if (estado === "preparando" || estado === "en_preparacion")
    return "preparando";
  if (["confirmado", "pagado", "procesando"].includes(estado))
    return "confirmado";

  return "nuevo";
}

export const KANBAN_COLUMNS: PedidoEtapa[] = [
  "nuevo",
  "confirmado",
  "preparando",
  "listo",
  "despachado",
  "en_transito",
  "entregado",
];
