"use client";

import React, { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Calendar,
  DollarSign,
  User,
  FileText,
  Receipt,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  Hash,
  Clock,
  Banknote,
  Download,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Pago } from "@/lib/types";
import { generatePagoPDF } from "@/lib/pdf-generator";
import { useSession } from "@/lib/hooks/use-session";

// Type for pago with factura relation
export type PagoWithFactura = Pago & {
  facturas?: {
    id: string;
    tipo_factura: string;
    nro_factura?: string;
    total: number;
    estado: string;
    fecha_emision?: string;
    clientes?: {
      id: string;
      nombre: string;
      nombre_fantasia?: string;
      identificador_unico?: string;
      cuit?: string;
    };
  };
};

interface PagoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: PagoWithFactura;
  onRefresh?: () => void;
  onEdit?: (pago: PagoWithFactura) => void;
}

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const metodoPagoLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia Bancaria",
  cheque: "Cheque",
  debito: "Tarjeta de Débito",
  credito: "Tarjeta de Crédito",
  mercadopago: "MercadoPago",
  otro: "Otro",
};

const metodoPagoIcons: Record<string, React.ReactNode> = {
  efectivo: <Banknote className="h-4 w-4" />,
  transferencia: <Building2 className="h-4 w-4" />,
  cheque: <FileText className="h-4 w-4" />,
  debito: <CreditCard className="h-4 w-4" />,
  credito: <CreditCard className="h-4 w-4" />,
  mercadopago: <DollarSign className="h-4 w-4" />,
  otro: <Receipt className="h-4 w-4" />,
};

export function PagoDetailSheet({
  open,
  onOpenChange,
  pago,
  onRefresh,
  onEdit,
}: PagoDetailSheetProps) {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const cliente = pago.facturas?.clientes;
  const factura = pago.facturas;
  const metodo = pago.metodo_pago || "otro";

  const handleExportPDF = async () => {
    try {
      const doc = await generatePagoPDF({
        id: pago.id,
        monto: pago.monto,
        fecha_pago: pago.fecha_pago,
        metodo_pago: pago.metodo_pago || "otro",
        cliente: cliente ? {
          nombre: cliente.nombre,
          nombre_fantasia: cliente.nombre_fantasia,
          cuit: cliente.cuit,
        } : undefined,
        factura: factura ? {
          id: factura.id,
          tipo_factura: factura.tipo_factura,
          nro_factura: factura.nro_factura,
          total: factura.total,
          estado: factura.estado,
        } as any : undefined,
      }, orgId);
      doc.save(`recibo-${pago.id.slice(0, 8)}.pdf`);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      toast.error("Error al generar PDF");
      console.error("Error generando PDF:", error);
    }
  };

  const handleSendEmail = async () => {
    // El email del cliente viene de la factura asociada
    // No tenemos acceso directo al email aquí, así que usamos el endpoint
    setSendingEmail(true);
    try {
      const res = await fetch("/api/pagos/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pago_id: pago.id,
          adjuntar_pdf: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar email");
      }

      toast.success(data.message || "Comprobante enviado");
    } catch (error: any) {
      toast.error(error.message || "Error al enviar comprobante");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/pagos?id=${pago.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar pago");
      }

      toast.success("Pago eliminado correctamente");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar pago");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-green-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-green-950/10"
          side="bottom"
        >
          {/* Header */}
          <SheetHeader className="px-6 pt-4 pb-3 pr-14 border-b border-green-200/50 dark:border-green-800/30 shrink-0 bg-gradient-to-r from-green-50/30 to-transparent dark:from-green-950/10 dark:to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30 shadow-sm">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-semibold">
                    Pago {formatCurrency(pago.monto)}
                  </SheetTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">ID: {pago.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>{formatDate(pago.fecha_pago)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                >
                  Registrado
                </Badge>
                <Button
                  type="default"
                  size="tiny"
                  onClick={handleExportPDF}
                  icon={<Download />}
                  title="Descargar PDF"
                />
                <Button
                  type="default"
                  size="tiny"
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  icon={sendingEmail ? <Loader2 className="animate-spin" /> : <Mail />}
                  title="Enviar por email"
                />
                {onEdit && (
                  <Button
                    type="default"
                    size="tiny"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(pago);
                    }}
                    icon={<Pencil />}
                    title="Editar pago"
                  />
                )}
                <Button
                  type="default"
                  size="tiny"
                  onClick={() => setShowDeleteDialog(true)}
                  icon={<Trash2 />}
                  title="Eliminar pago"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                />
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 h-[calc(90vh-80px)]">
            <div className="p-6 space-y-6">
              {/* Monto Principal */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-100 dark:border-green-900/30"
              >
                <p className="text-sm text-muted-foreground mb-1">Monto del Pago</p>
                <p className="text-4xl font-bold text-green-600">
                  {formatCurrency(pago.monto)}
                </p>
                <p className="text-sm text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(pago.fecha_pago)}
                </p>
              </motion.div>

              {/* Grid de información */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Método de Pago */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    Método de Pago
                  </h3>
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                        {metodoPagoIcons[metodo] || <Receipt className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">
                          {metodoPagoLabels[metodo] || metodo}
                        </p>
                        {pago.referencia && (
                          <p className="text-xs text-muted-foreground">
                            Ref: {pago.referencia}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Cliente */}
                {cliente && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3"
                  >
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      Cliente
                    </h3>
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border">
                      <div className="space-y-1.5">
                        <p className="font-medium">
                          {cliente.nombre_fantasia || cliente.nombre}
                        </p>
                        {cliente.nombre_fantasia && cliente.nombre && (
                          <p className="text-sm text-muted-foreground">
                            {cliente.nombre}
                          </p>
                        )}
                        {cliente.identificador_unico && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            ID: {cliente.identificador_unico}
                          </div>
                        )}
                        {cliente.cuit && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            CUIT: {cliente.cuit}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Factura Asociada */}
              {factura && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    Factura Asociada
                  </h3>
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-lg">
                          {factura.tipo_factura}
                          {factura.nro_factura && ` ${factura.nro_factura}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total: {formatCurrency(factura.total)}
                        </p>
                        {factura.fecha_emision && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Emitida: {formatDate(factura.fecha_emision)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-sm",
                          factura.estado === "pagada" &&
                            "bg-green-50 text-green-700 border-green-200",
                          factura.estado === "pendiente" &&
                            "bg-yellow-50 text-yellow-700 border-yellow-200",
                          factura.estado === "vencida" &&
                            "bg-red-50 text-red-700 border-red-200",
                          factura.estado === "parcial" &&
                            "bg-blue-50 text-blue-700 border-blue-200"
                        )}
                      >
                        {factura.estado}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Recibo */}
              {pago.recibo_url && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-500" />
                    Comprobante
                  </h3>
                  <a
                    href={pago.recibo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="font-medium">Ver Recibo</span>
                  </a>
                </motion.div>
              )}

              {/* Notas */}
              {pago.notas && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Notas
                  </h3>
                  <p className="text-sm text-muted-foreground p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border">
                    {pago.notas}
                  </p>
                </motion.div>
              )}

              {/* Timestamps */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4 border-t"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Creado:{" "}
                    {pago.created_at
                      ? new Date(pago.created_at).toLocaleString("es-AR")
                      : "-"}
                  </span>
                  {pago.updated_at && pago.updated_at !== pago.created_at && (
                    <span>
                      Actualizado: {new Date(pago.updated_at).toLocaleString("es-AR")}
                    </span>
                  )}
                </div>
              </motion.div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pago de{" "}
              <strong>{formatCurrency(pago.monto)}</strong> será eliminado
              permanentemente y el saldo de la factura asociada se actualizará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
