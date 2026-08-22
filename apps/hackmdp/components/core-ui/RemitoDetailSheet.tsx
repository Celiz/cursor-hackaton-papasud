"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import {
  TableSecondaryText,
  TableCodeText,
} from "@/components/core-ui/TableTextTruncate";
import { ExpandableDeleteButton } from "@/components/core-ui/ExpandableConfirmButton";
import { ShareToInternalChatButton } from "@/components/core-ui/ShareToInternalChatButton";
import {
  FileText,
  Package,
  User,
  Truck,
  CheckCircle,
  PenLine,
  ClipboardCheck,
  Receipt,
  Calendar,
  Loader2,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RemitoItem {
  id: string;
  producto_id: string;
  cantidad: number;
  marca?: string;
  descripcion?: string;
  codigo?: string;
  producto_nombre?: string;
}

interface Remito {
  id: string;
  cliente_id: string;
  fecha: string;
  numero: string;
  created_at: string;
  factura_id?: string;
  pedido_id?: string;
  pedido_numero?: string;
  estado: string;
  firmado: boolean;
  firmado_por?: string;
  fecha_despacho?: string;
  cliente?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    identificador_unico?: number;
    cuit?: string;
    condicion_iva?: string;
  };
  items?: RemitoItem[];
  items_count?: number;
}

interface RemitoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remito: Remito;
  onRefresh: () => void;
  onFacturar: () => void;
}

const estadoPill = (estado: string) => {
  switch (estado) {
    case "confirmado":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Confirmado
        </span>
      );
    case "facturado":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Facturado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 dark:text-gray-400">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          Borrador
        </span>
      );
  }
};

export function RemitoDetailSheet({
  open,
  onOpenChange,
  remito,
  onRefresh,
  onFacturar,
}: RemitoDetailSheetProps) {
  const [firmaDialogOpen, setFirmaDialogOpen] = useState(false);
  const [firmaPor, setFirmaPor] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFirming, setIsFirming] = useState(false);
  const [currentRemito, setCurrentRemito] = useState(remito);

  // Sync with prop
  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (value) {
        setCurrentRemito(remito);
      }
      onOpenChange(value);
    },
    [onOpenChange, remito]
  );

  // Keep currentRemito in sync when remito prop changes
  if (remito.id !== currentRemito.id || remito.estado !== currentRemito.estado || remito.firmado !== currentRemito.firmado) {
    setCurrentRemito(remito);
  }

  const handleConfirmar = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/remitos/${currentRemito.id}/confirmar`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al confirmar");
      toast.success(data.message || "Remito confirmado y despachado");
      onRefresh();
      // Re-fetch detail
      const detailRes = await fetch(`/api/remitos?id=${currentRemito.id}`);
      const detailData = await detailRes.json();
      if (Array.isArray(detailData) && detailData.length > 0) {
        setCurrentRemito(detailData[0]);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFirma = async () => {
    if (!firmaPor.trim()) return;
    setIsFirming(true);
    try {
      const res = await fetch(`/api/remitos/${currentRemito.id}/firma`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmado_por: firmaPor.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar firma");
      toast.success("Firma registrada");
      setFirmaDialogOpen(false);
      setFirmaPor("");
      onRefresh();
      setCurrentRemito({
        ...currentRemito,
        firmado: true,
        firmado_por: firmaPor.trim(),
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsFirming(false);
    }
  };

  const handleDelete = async () => {
    if (currentRemito.estado !== "borrador") {
      toast.error("Solo se pueden eliminar remitos en borrador");
      throw new Error("Solo se pueden eliminar remitos en borrador");
    }

    const res = await fetch(`/api/remitos?id=${currentRemito.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Error al eliminar remito");
    }

    toast.success("Remito eliminado correctamente");
    onOpenChange(false);
    onRefresh();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-white dark:bg-gray-950"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <SheetHeader className="px-6 py-3 border-b border-purple-200/50 dark:border-purple-800/30 shrink-0 overflow-visible">
              <div className="flex items-center gap-3 pr-8">
                <div className="flex items-center gap-3 min-w-0">
                  <SheetTitle className="text-lg font-semibold text-foreground shrink-0">
                    Remito
                  </SheetTitle>
                  <TableCodeText className="shrink-0">
                    #{currentRemito.numero}
                  </TableCodeText>
                  {estadoPill(currentRemito.estado)}
                  {isConfirming && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 ml-auto shrink-0 overflow-visible relative z-10">
                  {/* State-based primary actions */}
                  {currentRemito.estado === "borrador" && (
                    <Button
                      type="primary"
                      size="tiny"
                      onClick={handleConfirmar}
                      disabled={isConfirming}
                      icon={<Truck />}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                    >
                      {isConfirming ? "Confirmando..." : "Confirmar"}
                    </Button>
                  )}

                  {currentRemito.estado === "confirmado" &&
                    !currentRemito.firmado && (
                      <Button
                        type="primary"
                        size="tiny"
                        onClick={() => {
                          setFirmaPor("");
                          setFirmaDialogOpen(true);
                        }}
                        icon={<PenLine />}
                      >
                        Registrar Firma
                      </Button>
                    )}

                  {currentRemito.estado === "confirmado" &&
                    currentRemito.firmado && (
                      <Button
                        type="primary"
                        size="tiny"
                        onClick={onFacturar}
                        icon={<Receipt />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                      >
                        Facturar
                      </Button>
                    )}

                  {/* Imprimir — abre el PDF del remito en nueva pestaña.
                      Si el pedido origen tiene sin_cargo=true, el PDF renderiza
                      el modo "Remito Interno Sin Cargo" con banda amarilla y
                      disclaimer. */}
                  <Button
                    type="outline"
                    size="tiny"
                    onClick={() => {
                      window.open(`/api/remitos/${currentRemito.id}/pdf`, "_blank");
                    }}
                    icon={<Printer />}
                  >
                    Imprimir
                  </Button>

                  {/* Separator */}
                  <div className="w-px h-5 bg-border mx-0.5" />

                  {/* Share */}
                  <ShareToInternalChatButton
                    entity={{
                      type: "remito",
                      id: currentRemito.id,
                      label:
                        currentRemito.cliente?.nombre || "Remito",
                      number: currentRemito.numero,
                      link: `/dashboard/remitos?id=${currentRemito.id}`,
                    }}
                  />

                  {/* Delete (only borrador) */}
                  {currentRemito.estado === "borrador" && (
                    <>
                      <div className="w-px h-5 bg-border mx-0.5" />
                      <ExpandableDeleteButton
                        onDelete={handleDelete}
                        itemName="remito"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Pedido link */}
              {currentRemito.pedido_numero && (
                <p className="text-xs text-muted-foreground mt-1">
                  Desde Pedido{" "}
                  <span className="font-mono font-medium">
                    #{currentRemito.pedido_numero}
                  </span>
                </p>
              )}
            </SheetHeader>

            {/* Body */}
            <ScrollArea className="flex-1">
              <motion.div
                key={currentRemito.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="p-4 space-y-4"
              >
                {/* Two-column grid: Cliente + Remito Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Cliente Card (blue theme) */}
                  <div className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-900 dark:to-blue-950/10 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all">
                    <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-800/30 pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Cliente
                      </h3>
                      {currentRemito.cliente?.identificador_unico && (
                        <TableCodeText>
                          #{currentRemito.cliente.identificador_unico}
                        </TableCodeText>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <TableSecondaryText>Nombre</TableSecondaryText>
                        <p className="font-medium text-sm mt-0.5">
                          {currentRemito.cliente?.nombre_fantasia ||
                            currentRemito.cliente?.nombre ||
                            "-"}
                        </p>
                      </div>
                      {currentRemito.cliente?.nombre_fantasia &&
                        currentRemito.cliente?.nombre && (
                          <div>
                            <TableSecondaryText>
                              Razón Social
                            </TableSecondaryText>
                            <p className="font-medium text-sm mt-0.5">
                              {currentRemito.cliente.nombre}
                            </p>
                          </div>
                        )}
                      {currentRemito.cliente?.cuit && (
                        <div>
                          <TableSecondaryText>CUIT</TableSecondaryText>
                          <TableCodeText className="block mt-0.5">
                            {currentRemito.cliente.cuit}
                          </TableCodeText>
                        </div>
                      )}
                      {currentRemito.cliente?.condicion_iva && (
                        <div>
                          <TableSecondaryText>
                            Condición IVA
                          </TableSecondaryText>
                          <p className="font-medium text-sm mt-0.5">
                            {currentRemito.cliente.condicion_iva}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remito Info Card (cyan theme) */}
                  <div className="space-y-3 p-4 border border-cyan-200/40 dark:border-cyan-800/30 rounded-xl bg-gradient-to-br from-white to-cyan-50/20 dark:from-gray-900 dark:to-cyan-950/10 shadow-sm hover:shadow-md hover:shadow-cyan-500/10 transition-all">
                    <div className="flex items-center border-b border-cyan-200/50 dark:border-cyan-800/30 pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-cyan-900 dark:text-cyan-100">
                        <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        Información del Remito
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <TableSecondaryText>Fecha</TableSecondaryText>
                        <p className="font-medium text-sm mt-0.5">
                          {currentRemito.fecha
                            ? format(
                                new Date(currentRemito.fecha),
                                "PPP",
                                { locale: es }
                              )
                            : "-"}
                        </p>
                      </div>
                      {currentRemito.fecha_despacho && (
                        <div>
                          <TableSecondaryText>
                            Fecha de Despacho
                          </TableSecondaryText>
                          <p className="font-medium text-sm mt-0.5">
                            {format(
                              new Date(currentRemito.fecha_despacho),
                              "PPP",
                              { locale: es }
                            )}
                          </p>
                        </div>
                      )}
                      {currentRemito.firmado && (
                        <div>
                          <TableSecondaryText>Firmado por</TableSecondaryText>
                          <div className="flex items-center gap-2 mt-0.5">
                            <ClipboardCheck className="w-3.5 h-3.5 text-green-600" />
                            <p className="font-medium text-sm text-green-700 dark:text-green-400">
                              {currentRemito.firmado_por}
                            </p>
                          </div>
                        </div>
                      )}
                      {currentRemito.estado === "confirmado" &&
                        !currentRemito.firmado && (
                          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mt-1">
                            <PenLine className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                              Pendiente de firma
                            </span>
                          </div>
                        )}
                      {currentRemito.estado === "facturado" && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 mt-1">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs text-green-700 dark:text-green-400">
                            Facturado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Productos Section */}
                <div className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm">
                  <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/30 pb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
                      <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Productos
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {currentRemito.items?.length || 0} items
                    </Badge>
                  </div>

                  {currentRemito.items && currentRemito.items.length > 0 ? (
                    <div className="space-y-2">
                      {currentRemito.items.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {item.codigo && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono shrink-0"
                                >
                                  {item.codigo}
                                </Badge>
                              )}
                              <span className="font-medium text-sm truncate">
                                {item.producto_nombre ||
                                  item.descripcion ||
                                  "Producto"}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="font-semibold shrink-0"
                          >
                            x{item.cantidad}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
                      <Package className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                      <p className="text-muted-foreground text-sm">
                        Sin productos
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Firma Dialog */}
      <Dialog open={firmaDialogOpen} onOpenChange={setFirmaDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Firma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de quien firma *</Label>
              <Input
                value={firmaPor}
                onChange={(e) => setFirmaPor(e.target.value)}
                placeholder="Nombre completo"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFirmaDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFirma}
              disabled={!firmaPor.trim() || isFirming}
            >
              {isFirming ? "Registrando..." : "Confirmar Firma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
