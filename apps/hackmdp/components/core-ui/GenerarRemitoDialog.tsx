"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Package, Truck } from "lucide-react";
import { toast } from "sonner";

interface GenerarRemitoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  pedidoNumero: string;
  items: Array<{
    id: string;
    producto_id?: string;
    nombre?: string;
    descripcion?: string;
    codigo?: string;
    cantidad: number;
    cantidad_remitida?: number;
    cantidad_cancelada?: number;
    precio_unitario?: number;
  }>;
  clienteNombre?: string;
  onSuccess: () => void;
}

interface ItemState {
  checked: boolean;
  cantidad: number;
  accion_resto: "pendiente" | "cancelar";
}

export function GenerarRemitoDialog({
  open,
  onOpenChange,
  pedidoId,
  pedidoNumero,
  items,
  clienteNombre,
  onSuccess,
}: GenerarRemitoDialogProps) {
  const pendingItems = useMemo(() => {
    return items
      .map((item) => {
        const pendiente =
          item.cantidad -
          (item.cantidad_remitida ?? 0) -
          (item.cantidad_cancelada ?? 0);
        return { ...item, pendiente };
      })
      .filter((item) => item.pendiente > 0);
  }, [items]);

  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(() =>
    buildInitialStates(pendingItems)
  );
  const [loading, setLoading] = useState(false);

  function buildInitialStates(
    pending: Array<{ id: string; pendiente: number }>
  ): Record<string, ItemState> {
    const states: Record<string, ItemState> = {};
    for (const item of pending) {
      states[item.id] = {
        checked: true,
        cantidad: item.pendiente,
        accion_resto: "pendiente",
      };
    }
    return states;
  }

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (value) {
        setItemStates(buildInitialStates(pendingItems));
        setLoading(false);
      }
      onOpenChange(value);
    },
    [onOpenChange, pendingItems]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<ItemState>) => {
      setItemStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...patch },
      }));
    },
    []
  );

  const summary = useMemo(() => {
    let totalItems = 0;
    let totalUnidades = 0;
    for (const item of pendingItems) {
      const state = itemStates[item.id];
      if (state?.checked) {
        totalItems++;
        totalUnidades += state.cantidad;
      }
    }
    return { totalItems, totalUnidades };
  }, [pendingItems, itemStates]);

  const canConfirm = summary.totalItems > 0 && !loading;

  async function handleConfirm() {
    const selectedItems = pendingItems
      .filter((item) => {
        const state = itemStates[item.id];
        return state?.checked && state.cantidad > 0;
      })
      .map((item) => {
        const state = itemStates[item.id];
        const needsAccionResto = state.cantidad < item.pendiente;
        return {
          pedido_item_id: item.id,
          cantidad: state.cantidad,
          ...(needsAccionResto ? { accion_resto: state.accion_resto } : {}),
        };
      });

    // For unchecked items that should be cancelled, include them with their full pending quantity and cancelar action
    const cancelledItems = pendingItems
      .filter((item) => {
        const state = itemStates[item.id];
        return !state?.checked && state?.accion_resto === "cancelar";
      })
      .map((item) => ({
        pedido_item_id: item.id,
        cantidad: 0,
        accion_resto: "cancelar" as const,
      }));

    // Send checked items + unchecked items marked for cancellation
    const payload = {
      items: [...selectedItems, ...cancelledItems],
    };

    setLoading(true);

    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/generar-remito`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al generar el remito");
      }

      const data = await res.json();
      toast.success(
        data.remito_numero
          ? `Remito ${data.remito_numero} generado correctamente`
          : "Remito generado correctamente"
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error al generar el remito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Generar Remito desde Pedido #{pedidoNumero}
          </DialogTitle>
          <DialogDescription>
            {clienteNombre
              ? `Cliente: ${clienteNombre} — Seleccioná los items y cantidades a incluir en el remito.`
              : "Seleccioná los items y cantidades a incluir en el remito."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
          {pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay items pendientes de remitir.
            </p>
          ) : (
            pendingItems.map((item) => {
              const state = itemStates[item.id];
              if (!state) return null;

              const showAccionResto =
                !state.checked || state.cantidad < item.pendiente;

              return (
                <div
                  key={item.id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={state.checked}
                      onCheckedChange={(checked) =>
                        updateItem(item.id, {
                          checked: !!checked,
                          cantidad: checked ? item.pendiente : 0,
                        })
                      }
                      className="mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {item.nombre || item.descripcion || "Sin nombre"}
                        </span>
                        {item.codigo && (
                          <Badge variant="outline" className="text-xs">
                            {item.codigo}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>
                          Pedido: {item.cantidad} u.
                        </span>
                        {(item.cantidad_remitida ?? 0) > 0 && (
                          <span>
                            Remitido: {item.cantidad_remitida} u.
                          </span>
                        )}
                        {(item.cantidad_cancelada ?? 0) > 0 && (
                          <span>
                            Cancelado: {item.cantidad_cancelada} u.
                          </span>
                        )}
                        <span className="font-medium text-foreground">
                          Pendiente: {item.pendiente} u.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-muted-foreground">
                        Cant:
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={item.pendiente}
                        value={state.checked ? state.cantidad : 0}
                        disabled={!state.checked}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            updateItem(item.id, {
                              cantidad: Math.max(
                                1,
                                Math.min(val, item.pendiente)
                              ),
                            });
                          }
                        }}
                        className="w-20 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {showAccionResto && (
                    <div className="flex items-center gap-2 ml-8 mt-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Resto ({state.checked
                          ? item.pendiente - state.cantidad
                          : item.pendiente}{" "}
                        u.):
                      </span>
                      <Select
                        value={state.accion_resto}
                        onValueChange={(value: "pendiente" | "cancelar") =>
                          updateItem(item.id, { accion_resto: value })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">
                            Dejar pendiente (próximo remito)
                          </SelectItem>
                          <SelectItem value="cancelar">
                            Cancelar restante
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-muted-foreground">
            {summary.totalItems === 0 ? (
              "No hay items seleccionados"
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {summary.totalItems}
                </span>{" "}
                {summary.totalItems === 1 ? "item" : "items"},{" "}
                <span className="font-medium text-foreground">
                  {summary.totalUnidades}
                </span>{" "}
                {summary.totalUnidades === 1 ? "unidad" : "unidades"} en este
                remito
              </>
            )}
          </span>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">&#9696;</span>
                Generando...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Generar Remito
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
