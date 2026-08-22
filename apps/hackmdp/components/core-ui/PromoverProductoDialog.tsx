"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PackagePlus, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { CatalogoItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_MARKUP = 40; // 40%

interface PromoverProductoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogoItem | null;
  onSuccess: () => void;
}

export function PromoverProductoDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: PromoverProductoDialogProps) {
  const [codigo, setCodigo] = useState("");
  const [precioCosto, setPrecioCosto] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [loading, setLoading] = useState(false);

  // Populate fields when item changes
  useEffect(() => {
    if (item) {
      setCodigo(item.codigo_proveedor ?? "");
      const costo = item.precio_costo ?? 0;
      const markup = item.markup_default ?? DEFAULT_MARKUP;
      const venta = costo > 0 ? costo * (1 + markup / 100) : 0;
      setPrecioCosto(costo > 0 ? String(costo) : "");
      setPrecioVenta(venta > 0 ? String(Math.round(venta)) : "");
    }
  }, [item]);

  const costoNum = parseFloat(precioCosto) || 0;
  const ventaNum = parseFloat(precioVenta) || 0;
  const markup =
    costoNum > 0 && ventaNum > 0
      ? (((ventaNum - costoNum) / costoNum) * 100).toFixed(1)
      : null;

  const handleVentaChange = (val: string) => {
    setPrecioVenta(val);
  };

  const handleCostoChange = (val: string) => {
    setPrecioCosto(val);
    // Recalculate venta keeping same markup if we had one
    const costo = parseFloat(val) || 0;
    if (costo > 0 && costoNum > 0 && ventaNum > 0) {
      const currentMarkup = (ventaNum - costoNum) / costoNum;
      setPrecioVenta(String(Math.round(costo * (1 + currentMarkup))));
    }
  };

  const handleSubmit = async () => {
    if (!item) return;
    if (!codigo.trim()) {
      toast.error("Ingresá un código para el producto");
      return;
    }
    if (ventaNum <= 0) {
      toast.error("Ingresá un precio de venta válido");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/catalogo-items/promover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogo_item_id: item.id,
          codigo: codigo.trim(),
          precio_venta: ventaNum,
          precio_costo: costoNum > 0 ? costoNum : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al crear el producto");
      }

      toast.success(`Producto "${item.nombre}" creado correctamente`);
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al promover el item");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-emerald-500" />
            Crear como producto
          </DialogTitle>
          <DialogDescription>
            Promover este item del catálogo a un producto en tu stock
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Item info */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.nombre}</p>
            <div className="flex items-center gap-2 mt-1">
              {item.codigo_proveedor && (
                <Badge variant="outline" className="text-xs">
                  {item.codigo_proveedor}
                </Badge>
              )}
              {item.categoria && (
                <span className="text-xs text-muted-foreground">{item.categoria}</span>
              )}
            </div>
          </div>

          {/* Codigo */}
          <div className="space-y-1">
            <Label htmlFor="prod-codigo">Código del producto</Label>
            <Input
              id="prod-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="SKU o código interno"
            />
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="prod-costo">Precio costo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="prod-costo"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-6"
                  value={precioCosto}
                  onChange={(e) => handleCostoChange(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prod-venta">Precio venta</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="prod-venta"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-6"
                  value={precioVenta}
                  onChange={(e) => handleVentaChange(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Markup indicator */}
          {markup !== null && (
            <div
              className={cn(
                "flex items-center gap-2 text-sm p-2 rounded-lg",
                parseFloat(markup) >= 20
                  ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
              )}
            >
              <TrendingUp className="h-4 w-4" />
              <span>
                Markup: <strong>{markup}%</strong>
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !codigo.trim() || ventaNum <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <PackagePlus className="h-4 w-4 mr-2" />
                Crear producto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
