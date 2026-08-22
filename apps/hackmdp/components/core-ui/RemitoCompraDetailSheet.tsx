"use client";

import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  Building2,
  Calendar,
  Edit,
  Trash2,
  DollarSign,
  FileText,
  Package,
} from "lucide-react";
import { RemitoCompra } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";

interface RemitoCompraDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remito: RemitoCompra | null;
  onEdit?: (remito: RemitoCompra) => void;
  onDelete?: (remito: RemitoCompra) => void;
  onRefresh?: () => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const tipoComprobanteLabels: Record<string, string> = {
  factura_a: "Factura A",
  factura_b: "Factura B",
  factura_c: "Factura C",
  remito: "Remito",
  nota_credito: "Nota de Crédito",
  nota_debito: "Nota de Débito",
};

export function RemitoCompraDetailSheet({
  open,
  onOpenChange,
  remito,
  onEdit,
  onDelete,
}: RemitoCompraDetailSheetProps) {
  if (!remito) return null;

  const proveedorNombre = remito.proveedor?.nombre || (remito as any).proveedor_nombre;
  const proveedorCuit = remito.proveedor?.cuit || (remito as any).proveedor_cuit;

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, string> = {
      pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
      parcial: "bg-orange-100 text-orange-700 border-orange-200",
      pagada: "bg-green-100 text-green-700 border-green-200",
      cancelada: "bg-gray-100 text-gray-600 border-gray-200",
    };
    return (
      <Badge variant="outline" className={variants[estado] || ""}>
        {estado}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[550px] overflow-auto p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                <Receipt className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-bold">
                  #{remito.numero}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {tipoComprobanteLabels[remito.tipo_comprobante || "factura_a"]}
                  </Badge>
                  {getEstadoBadge(remito.estado)}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(remito)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(remito)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Proveedor */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border bg-white dark:bg-gray-900/50"
          >
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300">
              <Building2 className="h-4 w-4 text-blue-500" />
              Proveedor
            </h3>
            <div className="space-y-1">
              <p className="font-medium">{proveedorNombre || "Sin proveedor"}</p>
              {proveedorCuit && (
                <p className="text-sm text-muted-foreground font-mono">CUIT: {proveedorCuit}</p>
              )}
            </div>
          </motion.section>

          {/* Fechas */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-xl border bg-white dark:bg-gray-900/50"
          >
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300">
              <Calendar className="h-4 w-4 text-purple-500" />
              Fechas
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="text-sm font-medium">{formatDate(remito.fecha)}</p>
              </div>
              {remito.fecha_vencimiento && (
                <div>
                  <p className="text-xs text-muted-foreground">Vencimiento</p>
                  <p className="text-sm font-medium">{formatDate(remito.fecha_vencimiento)}</p>
                </div>
              )}
            </div>
          </motion.section>

          {/* Items */}
          {remito.items && remito.items.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl border bg-white dark:bg-gray-900/50"
            >
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300">
                <Package className="h-4 w-4 text-amber-500" />
                Items ({remito.items.length})
              </h3>
              <div className="space-y-2">
                {remito.items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.descripcion || "Sin descripción"}</p>
                      {item.marca && (
                        <p className="text-xs text-muted-foreground">{item.marca}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p>{item.cantidad} x {formatCurrency(item.precio_unitario)}</p>
                      <p className="font-semibold">
                        {formatCurrency(item.cantidad * item.precio_unitario)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Totales */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
          >
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-300">
              <DollarSign className="h-4 w-4" />
              Totales
            </h3>
            <div className="space-y-2">
              {remito.subtotal !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(remito.subtotal)}</span>
                </div>
              )}
              {remito.iva !== undefined && remito.iva > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA:</span>
                  <span>{formatCurrency(remito.iva)}</span>
                </div>
              )}
              {remito.otros_impuestos !== undefined && remito.otros_impuestos > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Otros Impuestos:</span>
                  <span>{formatCurrency(remito.otros_impuestos)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200 dark:border-blue-800">
                <span>Total:</span>
                <span className="text-blue-600">{formatCurrency(remito.total)}</span>
              </div>
              {remito.saldo_pendiente !== undefined && remito.saldo_pendiente > 0 && (
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-orange-600 font-medium">Pendiente:</span>
                  <span className="text-orange-600 font-bold">
                    {formatCurrency(remito.saldo_pendiente)}
                  </span>
                </div>
              )}
            </div>
          </motion.section>

          {/* Comentarios */}
          {remito.comentarios && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-xl border bg-white dark:bg-gray-900/50"
            >
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-4 w-4 text-gray-500" />
                Comentarios
              </h3>
              <p className="text-sm whitespace-pre-wrap">{remito.comentarios}</p>
            </motion.section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
