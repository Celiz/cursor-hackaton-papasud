"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Package, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";

interface RemitoItem {
  id: string;
  producto_id: string;
  cantidad: number;
  marca?: string;
  descripcion?: string;
  codigo?: string;
  producto_nombre?: string;
  pedido_item_id?: string;
}

interface Remito {
  id: string;
  cliente_id: string;
  fecha: string;
  numero: string;
  cliente?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    cuit?: string;
    condicion_iva?: string;
  };
  items?: RemitoItem[];
  factura_id?: string;
  pedido_id?: string;
}

interface ItemConPrecio extends RemitoItem {
  precio_unitario: number;
  alicuota_iva: number;
  subtotal: number;
}

interface ConvertirRemitoAFacturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remito: Remito | null;
  onSuccess: () => void;
}

const CONDICION_IVA_LABELS: Record<string, string> = {
  responsable_inscripto: "Responsable Inscripto",
  monotributista: "Monotributista",
  exento: "Exento",
  consumidor_final: "Consumidor Final",
};

const ALICUOTAS_IVA = [
  { value: 0, label: "0%" },
  { value: 2.5, label: "2.5%" },
  { value: 5, label: "5%" },
  { value: 10.5, label: "10.5%" },
  { value: 21, label: "21%" },
  { value: 27, label: "27%" },
];

export function ConvertirRemitoAFacturaDialog({
  open,
  onOpenChange,
  remito,
  onSuccess,
}: ConvertirRemitoAFacturaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemConPrecio[]>([]);
  const [tipoFactura, setTipoFactura] = useState("B");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [pricesPreFilled, setPricesPreFilled] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Inicializar items cuando cambia el remito
  useEffect(() => {
    if (!open || !remito) return;

    setPricesPreFilled(false);
    setTipoFactura("B");
    setFechaEmision(
      remito?.fecha
        ? new Date(remito.fecha).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );

    if (remito.pedido_id) {
      // Fetch pedido items for prices
      setLoadingPrices(true);
      fetch(`/api/pedidos-ventas/${remito.pedido_id}`)
        .then((res) => res.json())
        .then((pedidoData) => {
          const pedidoItems =
            pedidoData.items || pedidoData.pedidos_items || [];

          if (remito.items) {
            setItems(
              remito.items.map((item) => {
                // Match by pedido_item_id first, then by producto_id
                const pedidoItem = pedidoItems.find(
                  (pi: any) =>
                    (item.pedido_item_id && pi.id === item.pedido_item_id) ||
                    (item.producto_id && pi.producto_id === item.producto_id)
                );

                const precio = pedidoItem?.precio_unitario || 0;
                return {
                  ...item,
                  precio_unitario: precio,
                  alicuota_iva: 21,
                  subtotal: item.cantidad * precio,
                };
              })
            );

            if (pedidoItems.length > 0) {
              setPricesPreFilled(true);
            }
          }
        })
        .catch(() => {
          // If fetch fails, initialize with 0 prices
          if (remito.items) {
            setItems(
              remito.items.map((item) => ({
                ...item,
                precio_unitario: 0,
                alicuota_iva: 21,
                subtotal: 0,
              }))
            );
          }
        })
        .finally(() => setLoadingPrices(false));
    } else {
      // No pedido — manual pricing as before
      if (remito.items) {
        setItems(
          remito.items.map((item) => ({
            ...item,
            precio_unitario: 0,
            alicuota_iva: 21,
            subtotal: 0,
          }))
        );
      } else {
        setItems([]);
      }
    }
  }, [remito, open]);

  // Calcular totales
  const { subtotal, totalIva, total } = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalIva = items.reduce(
      (sum, item) => sum + (item.subtotal * item.alicuota_iva) / 100,
      0
    );
    return {
      subtotal,
      totalIva,
      total: subtotal + totalIva,
    };
  }, [items]);

  // Verificar si puede recibir Factura A
  const puedeFacturaA =
    !remito?.cliente?.condicion_iva ||
    remito?.cliente?.condicion_iva === "responsable_inscripto";

  // Actualizar item
  const handleUpdateItem = (
    index: number,
    field: keyof ItemConPrecio,
    value: number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const updated = { ...item, [field]: value };

        // Recalcular subtotal
        if (field === "cantidad" || field === "precio_unitario") {
          updated.subtotal = updated.cantidad * updated.precio_unitario;
        }

        return updated;
      })
    );
  };

  const handleSubmit = async () => {
    if (!remito) return;

    // Validar que todos los items tengan precio
    const sinPrecio = items.filter((item) => item.precio_unitario <= 0);
    if (sinPrecio.length > 0) {
      toast.error("Todos los items deben tener un precio unitario");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/remitos/${remito.id}/convertir-a-factura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            producto_id: item.producto_id,
            descripcion: item.producto_nombre || item.descripcion || "Producto",
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            alicuota_iva: item.alicuota_iva,
          })),
          tipo_factura: tipoFactura,
          fecha_emision: fechaEmision,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al convertir remito");
      }

      toast.success("Remito convertido a factura exitosamente");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!remito) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Convertir Remito a Factura
          </DialogTitle>
          <DialogDescription>
            Remito <strong>{remito.numero}</strong> -{" "}
            {remito.cliente?.nombre_fantasia || remito.cliente?.nombre}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Info del cliente */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <span className="font-medium">
                {remito.cliente?.nombre_fantasia || remito.cliente?.nombre}
              </span>
            </div>
            {remito.cliente?.cuit && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CUIT:</span>
                <span>{remito.cliente.cuit}</span>
              </div>
            )}
            {remito.cliente?.condicion_iva && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Condicion IVA:
                </span>
                <Badge variant="secondary">
                  {CONDICION_IVA_LABELS[remito.cliente.condicion_iva] ||
                    remito.cliente.condicion_iva}
                </Badge>
              </div>
            )}
          </div>

          {/* Alerta si no puede recibir Factura A */}
          {!puedeFacturaA && tipoFactura === "A" && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Este cliente es{" "}
                <strong>
                  {CONDICION_IVA_LABELS[
                    remito.cliente?.condicion_iva || ""
                  ] || "no Responsable Inscripto"}
                </strong>
                . Solo puede recibir facturas tipo B, C o E.
              </p>
            </div>
          )}

          {/* Banner de precios pre-llenados desde pedido */}
          {pricesPreFilled && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Precios pre-llenados desde el pedido original. Podes
                modificarlos si es necesario.
              </p>
            </div>
          )}

          {/* Datos de la factura */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Emision</Label>
              <Input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Factura</Label>
              <Select value={tipoFactura} onValueChange={setTipoFactura}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A" disabled={!puedeFacturaA}>
                    Factura A{!puedeFacturaA && " (No disponible)"}
                  </SelectItem>
                  <SelectItem value="B">Factura B</SelectItem>
                  <SelectItem value="C">Factura C</SelectItem>
                  <SelectItem value="E">Factura E (Exportacion)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Items con precios */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">
                Productos del Remito ({items.length})
              </h3>
            </div>

            <p className="text-sm text-muted-foreground">
              Ingresa el precio unitario y alicuota de IVA para cada producto.
            </p>

            {loadingPrices ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando precios del pedido...
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                  <div className="col-span-4">Producto</div>
                  <div className="col-span-2 text-center">Cantidad</div>
                  <div className="col-span-2 text-right">Precio Unit.</div>
                  <div className="col-span-2 text-center">IVA</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="col-span-4">
                        <p className="font-medium text-sm">
                          {item.producto_nombre ||
                            item.descripcion ||
                            "Producto"}
                        </p>
                        {item.codigo && (
                          <p className="text-xs text-muted-foreground">
                            {item.codigo}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <Badge variant="secondary">x{item.cantidad}</Badge>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.precio_unitario || ""}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              "precio_unitario",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm text-right"
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={item.alicuota_iva.toString()}
                          onValueChange={(v) =>
                            handleUpdateItem(
                              index,
                              "alicuota_iva",
                              parseFloat(v)
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALICUOTAS_IVA.map((ali) => (
                              <SelectItem
                                key={ali.value}
                                value={ali.value.toString()}
                              >
                                {ali.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 text-right font-medium text-sm">
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>

                {items.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
                    Este remito no tiene productos
                  </div>
                )}
              </>
            )}
          </div>

          {/* Totales */}
          {items.length > 0 && !loadingPrices && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA:</span>
                <span className="font-medium">{formatCurrency(totalIva)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingPrices || items.length === 0 || total <= 0}
          >
            {loading ? "Convirtiendo..." : "Crear Factura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
