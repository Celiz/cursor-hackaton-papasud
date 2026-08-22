"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/format-currency";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Building2,
  Calendar,
  Edit,
  Trash2,
  Package,
  FileText,
  Send,
} from "lucide-react";
import { OrdenCompra } from "@/lib/types";

interface OrdenCompraDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: OrdenCompra | null;
  onEdit?: (orden: OrdenCompra) => void;
  onDelete?: (orden: OrdenCompra) => void;
  onRefresh?: () => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const estadoLabels: Record<string, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  enviada: "Enviada",
  parcial: "Parcial",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

const estadoVariants: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700 border-gray-200",
  pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  enviada: "bg-blue-100 text-blue-700 border-blue-200",
  parcial: "bg-orange-100 text-orange-700 border-orange-200",
  recibida: "bg-green-100 text-green-700 border-green-200",
  cancelada: "bg-red-100 text-red-600 border-red-200",
};

export function OrdenCompraDetailSheet({
  open,
  onOpenChange,
  orden,
  onEdit,
  onDelete,
}: OrdenCompraDetailSheetProps) {
  if (!orden) return null;

  const proveedorNombre = orden.proveedor?.nombre || (orden as any).proveedor_nombre;
  const proveedorCuit = orden.proveedor?.cuit || (orden as any).proveedor_cuit;

  const calcularTotal = () => {
    if (!orden.items) return 0;
    return orden.items.reduce(
      (sum, item) => sum + (item.cantidad || 0) * (item.precio_unitario || 0),
      0
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
                <ClipboardList className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-bold">
                  OC-{orden.id.slice(0, 8)}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className={estadoVariants[orden.estado] || ""}>
                    {estadoLabels[orden.estado] || orden.estado}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(orden)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(orden)}
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
                <p className="text-xs text-muted-foreground">Fecha de Creación</p>
                <p className="text-sm font-medium">{formatDate(orden.created_at)}</p>
              </div>
              {orden.fecha_entrega_estimada && (
                <div>
                  <p className="text-xs text-muted-foreground">Entrega Estimada</p>
                  <p className="text-sm font-medium">{formatDate(orden.fecha_entrega_estimada)}</p>
                </div>
              )}
            </div>
          </motion.section>

          {/* Items */}
          {orden.items && orden.items.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl border bg-white dark:bg-gray-900/50"
            >
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300">
                <Package className="h-4 w-4 text-amber-500" />
                Items ({orden.items.length})
              </h3>
              <div className="space-y-2">
                {orden.items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {item.producto?.nombre || item.descripcion || `Producto ${index + 1}`}
                      </p>
                      {item.lote && (
                        <p className="text-xs text-muted-foreground">Lote: {item.lote}</p>
                      )}
                      {item.vencimiento && (
                        <p className="text-xs text-muted-foreground">
                          Vto: {formatDate(item.vencimiento)}
                        </p>
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

                {/* Total */}
                <div className="flex justify-between pt-3 mt-3 border-t">
                  <span className="font-semibold">Total Estimado:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(calcularTotal())}
                  </span>
                </div>
              </div>
            </motion.section>
          )}

          {/* Estado del envío */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl border bg-white dark:bg-gray-900/50"
          >
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300">
              <Send className="h-4 w-4 text-green-500" />
              Estado de la Orden
            </h3>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`${estadoVariants[orden.estado]} text-sm px-3 py-1`}>
                {estadoLabels[orden.estado] || orden.estado}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {orden.estado === 'borrador' && 'Pendiente de envío al proveedor'}
                {orden.estado === 'pendiente' && 'Esperando confirmación del proveedor'}
                {orden.estado === 'enviada' && 'En proceso de preparación'}
                {orden.estado === 'parcial' && 'Recibido parcialmente'}
                {orden.estado === 'recibida' && 'Orden completa'}
                {orden.estado === 'cancelada' && 'Orden cancelada'}
              </span>
            </div>
          </motion.section>

          {/* Comentarios */}
          {orden.comentarios && (
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
              <p className="text-sm whitespace-pre-wrap">{orden.comentarios}</p>
            </motion.section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
