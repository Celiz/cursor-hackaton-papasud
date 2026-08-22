"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Producto } from "@/lib/types";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface StockAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productos: Producto[];
  onViewProduct?: (producto: Producto) => void;
}

export function StockAlertsDialog({
  open,
  onOpenChange,
  productos,
  onViewProduct,
}: StockAlertsDialogProps) {
  // Filtrar productos con stock bajo
  const sinStock = productos.filter((p) => (p.stock_actual ?? 0) <= 0);
  const stockBajo = productos.filter(
    (p) => p.stock_minimo && (p.stock_actual ?? 0) > 0 && (p.stock_actual ?? 0) <= p.stock_minimo
  );
  const stockCritico = productos.filter(
    (p) => p.stock_minimo && (p.stock_actual ?? 0) <= p.stock_minimo * 0.5 && (p.stock_actual ?? 0) > 0
  );

  const totalAlertas = sinStock.length + stockBajo.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Alertas de Stock ({totalAlertas})
          </DialogTitle>
          <DialogDescription>
            Productos que requieren reposición de inventario
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sin Stock */}
          {sinStock.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  Sin Stock ({sinStock.length})
                </Badge>
              </div>
              <div className="border rounded-md divide-y">
                {sinStock.map((producto) => (
                  <div
                    key={producto.id}
                    className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (onViewProduct) {
                        onViewProduct(producto);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-red-600" />
                        <div>
                          <div className="font-medium text-sm">
                            {producto.nombre}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Código: {producto.codigo}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">0</div>
                        <div className="text-xs text-muted-foreground">
                          Mín: {producto.stock_minimo || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock Crítico */}
          {stockCritico.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs bg-orange-600">
                    Stock Crítico ({stockCritico.length})
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Menos del 50% del stock mínimo
                  </span>
                </div>
                <div className="border rounded-md divide-y">
                  {stockCritico.map((producto) => (
                    <div
                      key={producto.id}
                      className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (onViewProduct) {
                          onViewProduct(producto);
                          onOpenChange(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                          <div>
                            <div className="font-medium text-sm">
                              {producto.nombre}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Código: {producto.codigo}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-600">
                            {producto.stock_actual}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Mín: {producto.stock_minimo}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Stock Bajo */}
          {stockBajo.length > 0 && stockCritico.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-orange-600 text-orange-600">
                    Stock Bajo ({stockBajo.filter(p => !stockCritico.includes(p)).length})
                  </Badge>
                </div>
                <div className="border rounded-md divide-y">
                  {stockBajo
                    .filter(p => !stockCritico.includes(p))
                    .map((producto) => (
                      <div
                        key={producto.id}
                        className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (onViewProduct) {
                            onViewProduct(producto);
                            onOpenChange(false);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-yellow-600" />
                            <div>
                              <div className="font-medium text-sm">
                                {producto.nombre}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Código: {producto.codigo}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-600">
                              {producto.stock_actual}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Mín: {producto.stock_minimo}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {totalAlertas === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay alertas de stock en este momento
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
