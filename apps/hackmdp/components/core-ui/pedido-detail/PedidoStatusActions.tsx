"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  PackageCheck,
  XCircle,
  CreditCard,
  Package,
  Truck,
  CheckCircle,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { PedidoFeatureFlags, StatusTransition } from "./types";

const ECOMMERCE_TRANSITIONS: Record<string, StatusTransition[]> = {
  pendiente: [
    { label: 'Marcar como Pagado', value: 'pagado', color: 'bg-green-600 hover:bg-green-700 border-green-600', icon: CreditCard },
    { label: 'Preparar', value: 'preparando', color: 'bg-purple-600 hover:bg-purple-700 border-purple-600', icon: Package },
  ],
  pagado: [
    { label: 'Preparar', value: 'preparando', color: 'bg-purple-600 hover:bg-purple-700 border-purple-600', icon: Package },
    { label: 'Marcar como Enviado', value: 'enviado', color: 'bg-cyan-600 hover:bg-cyan-700 border-cyan-600', icon: Truck },
  ],
  preparando: [
    { label: 'Marcar como Enviado', value: 'enviado', color: 'bg-cyan-600 hover:bg-cyan-700 border-cyan-600', icon: Truck },
  ],
  enviado: [
    { label: 'Marcar como Entregado', value: 'entregado', color: 'bg-green-600 hover:bg-green-700 border-green-600', icon: CheckCircle },
  ],
};

interface PedidoStatusActionsProps {
  estado: string;
  featureFlags: PedidoFeatureFlags;
  canEnviarAPreparacion: boolean;
  canConvertToFactura: boolean;
  canGenerarRemito: boolean;
  canCancel: boolean;
  onStatusChange: (nuevoEstado: string) => Promise<void>;
  onShowPrepararDialog: () => void;
  onShowConvertDialog: () => void;
  onShowRemitoDialog: () => void;
  onShowCancelDialog: () => void;
  isChangingEstado: boolean;
  renderCancel?: boolean;
}

export function PedidoStatusActions({
  estado,
  featureFlags,
  canEnviarAPreparacion,
  canConvertToFactura,
  canGenerarRemito,
  canCancel,
  onStatusChange,
  onShowPrepararDialog,
  onShowConvertDialog,
  onShowRemitoDialog,
  onShowCancelDialog,
  isChangingEstado,
  renderCancel = true,
}: PedidoStatusActionsProps) {
  const nextStates = featureFlags.hasStatusTransitions
    ? (ECOMMERCE_TRANSITIONS[estado] || [])
    : [];

  return (
    <>
      {nextStates.map((ns) => {
        const Icon = ns.icon;
        return (
          <Button
            key={ns.value}
            type="primary"
            size="tiny"
            onClick={() => onStatusChange(ns.value)}
            disabled={isChangingEstado}
            loading={isChangingEstado}
            icon={<Icon />}
            className={`${ns.color} text-white`}
          >
            {ns.label}
          </Button>
        );
      })}
      {canGenerarRemito && (
        <Button
          type="primary"
          size="tiny"
          onClick={onShowRemitoDialog}
          icon={<FileText />}
          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
        >
          Generar Remito
        </Button>
      )}
      {canEnviarAPreparacion && (
        <Button
          type="primary"
          size="tiny"
          onClick={onShowPrepararDialog}
          icon={<PackageCheck />}
          className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
        >
          Enviar a Preparación
        </Button>
      )}
      {canConvertToFactura && (
        <Button
          type="primary"
          size="tiny"
          onClick={onShowConvertDialog}
          icon={<ArrowRight />}
          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
        >
          Convertir a Factura
        </Button>
      )}
      {renderCancel && canCancel && (
        <Button
          type="danger"
          size="tiny"
          onClick={onShowCancelDialog}
          icon={<XCircle />}
        >
          Cancelar
        </Button>
      )}
    </>
  );
}
