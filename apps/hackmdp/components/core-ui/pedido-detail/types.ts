import type { Pedido } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

export interface PedidoNota {
  id: string;
  tipo: string;
  contenido: string;
  usuario_nombre?: string;
  estado_anterior?: string;
  estado_nuevo?: string;
  items_agregados?: any[];
  items_eliminados?: any[];
  items_modificados?: any[];
  created_at: string;
}

export interface PedidoCallbacks {
  mutate: () => void;
  mutateNotas: () => void;
  onSuccess?: () => void;
}

export interface StatusTransition {
  label: string;
  value: string;
  color: string;
  icon: LucideIcon;
}

export interface PedidoFeatureFlags {
  hasEcommerce: boolean;
  hasPaymentInfo: boolean;
  hasStatusTransitions: boolean;
  hasPreparationFlow: boolean;
  hasInvoiceConversion: boolean;
  hasRemitoGeneration: boolean;
}

export type { Pedido };
