"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Hash,
  ListOrdered,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetClasses } from "@/lib/design-system";
import { AsientoContable } from "@/app/dashboard/contabilidad/asientos/columns";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
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
import { toast } from "sonner";

interface AsientoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asiento: AsientoContable | null;
  onEdit?: (asiento: AsientoContable) => void;
  onSuccess?: () => void;
}

const getEstadoConfig = (estado: string) => {
  switch (estado) {
    case "borrador":
      return { label: "Borrador", className: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock };
    case "confirmado":
      return { label: "Confirmado", className: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 };
    case "revertido":
      return { label: "Revertido", className: "bg-red-100 text-red-800 border-red-300", icon: RotateCcw };
    default:
      return { label: estado, className: "bg-gray-100 text-gray-800 border-gray-300", icon: FileText };
  }
};

const getTipoConfig = (tipo: string) => {
  switch (tipo) {
    case "manual":
      return { label: "Manual", className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "automatico":
      return { label: "Automático", className: "bg-purple-100 text-purple-800 border-purple-300" };
    case "ajuste":
      return { label: "Ajuste", className: "bg-orange-100 text-orange-800 border-orange-300" };
    case "cierre":
      return { label: "Cierre", className: "bg-slate-100 text-slate-800 border-slate-300" };
    default:
      return { label: tipo, className: "bg-gray-100 text-gray-800 border-gray-300" };
  }
};

export function AsientoDetailSheet({
  open,
  onOpenChange,
  asiento,
  onEdit,
  onSuccess,
}: AsientoDetailSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!asiento) return null;

  const estadoConfig = getEstadoConfig(asiento.estado);
  const tipoConfig = getTipoConfig(asiento.tipo);
  const EstadoIcon = estadoConfig.icon;

  const handleEdit = () => {
    if (onEdit && asiento.estado === "borrador") {
      onEdit(asiento);
      onOpenChange(false);
    }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/contabilidad/asientos/${asiento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "confirmado" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al confirmar asiento");
      }

      toast.success("Asiento confirmado correctamente");
      onSuccess?.();
      setShowConfirmDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevert = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/contabilidad/asientos/${asiento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "revertido" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al revertir asiento");
      }

      toast.success("Asiento revertido correctamente");
      onSuccess?.();
      setShowRevertDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/contabilidad/asientos/${asiento.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar asiento");
      }

      toast.success("Asiento eliminado correctamente");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
      setShowDeleteDialog(false);
    }
  };

  const totalDebe = Number(asiento.total_debe) || 0;
  const totalHaber = Number(asiento.total_haber) || 0;
  const diferencia = totalDebe - totalHaber;
  const isBalanceado = Math.abs(diferencia) < 0.01;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-full h-[95vh] overflow-hidden p-0 bg-purple-50 dark:bg-gray-950"
          side="bottom"
        >
          <div className="h-full flex flex-col">
            <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">
                      Asiento #{asiento.numero}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={estadoConfig.className}>
                        <EstadoIcon className="h-3 w-3 mr-1" />
                        {estadoConfig.label}
                      </Badge>
                      <Badge variant="outline" className={tipoConfig.className}>
                        {tipoConfig.label}
                      </Badge>
                      {asiento.fecha && (
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(asiento.fecha), "PPP", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {asiento.estado === "borrador" && (
                    <>
                      <Button
                        size="tiny"
                        type="primary"
                        onClick={() => setShowConfirmDialog(true)}
                        iconLeft={<Check className="h-4 w-4" />}
                      >
                        Confirmar
                      </Button>
                      {onEdit && (
                        <Button
                          size="tiny"
                          type="default"
                          onClick={handleEdit}
                          iconLeft={<Edit className="h-4 w-4" />}
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        size="tiny"
                        type="danger"
                        onClick={() => setShowDeleteDialog(true)}
                        iconLeft={<Trash2 className="h-4 w-4" />}
                      >
                        Eliminar
                      </Button>
                    </>
                  )}
                  {asiento.estado === "confirmado" && (
                    <Button
                      size="tiny"
                      type="warning"
                      onClick={() => setShowRevertDialog(true)}
                      iconLeft={<RotateCcw className="h-4 w-4" />}
                    >
                      Revertir
                    </Button>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <Tabs id="asiento-detail-tabs" defaultValue="detalle" className="w-full">
                <TabsList className={cn(sheetClasses.tabsList, "grid-cols-2")}>
                  <TabsTrigger value="detalle" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Información General</span>
                  </TabsTrigger>
                  <TabsTrigger value="lineas" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <ListOrdered className="w-4 h-4" />
                    <span className="text-sm">Líneas del Asiento</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="detalle" className="space-y-6 mt-0 p-4">
                  {/* Información Básica */}
                  <div className="space-y-4 p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                      <FileText className="h-5 w-5" />
                      Información del Asiento
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Número</Label>
                        <p className="font-mono font-medium text-sm mt-1">{asiento.numero}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Fecha</Label>
                        <p className="font-medium text-sm mt-1">
                          {asiento.fecha ? format(parseISO(asiento.fecha), "dd/MM/yyyy", { locale: es }) : "-"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <div className="mt-1">
                          <Badge variant="outline" className={tipoConfig.className}>
                            {tipoConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Libro</Label>
                        <p className="font-medium text-sm mt-1 capitalize">{asiento.libro || "Diario"}</p>
                      </div>
                    </div>

                    {asiento.glosa && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">Concepto / Glosa</Label>
                        <p className="text-sm mt-2 p-3 bg-muted/50 rounded-lg">{asiento.glosa}</p>
                      </div>
                    )}

                    {asiento.referencia && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">Referencia</Label>
                        <p className="text-sm mt-1">{asiento.referencia}</p>
                      </div>
                    )}

                    {asiento.origen_tipo && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">Origen</Label>
                        <p className="text-sm mt-1">
                          {asiento.origen_tipo} {asiento.origen_numero && `- ${asiento.origen_numero}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Totales */}
                  <div className="space-y-4 p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                      <Hash className="h-5 w-5" />
                      Resumen de Totales
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <ArrowUpRight className="h-4 w-4" />
                          <Label className="text-xs font-medium">Total Debe</Label>
                        </div>
                        <p className="font-mono font-bold text-xl mt-2 text-green-800 dark:text-green-300">
                          ${totalDebe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                          <ArrowDownRight className="h-4 w-4" />
                          <Label className="text-xs font-medium">Total Haber</Label>
                        </div>
                        <p className="font-mono font-bold text-xl mt-2 text-red-800 dark:text-red-300">
                          ${totalHaber.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className={cn(
                        "p-4 rounded-lg border",
                        isBalanceado
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                      )}>
                        <div className={cn(
                          "flex items-center gap-2",
                          isBalanceado ? "text-blue-700 dark:text-blue-400" : "text-yellow-700 dark:text-yellow-400"
                        )}>
                          {isBalanceado ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          <Label className="text-xs font-medium">Diferencia</Label>
                        </div>
                        <p className={cn(
                          "font-mono font-bold text-xl mt-2",
                          isBalanceado ? "text-blue-800 dark:text-blue-300" : "text-yellow-800 dark:text-yellow-300"
                        )}>
                          ${Math.abs(diferencia).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          {isBalanceado ? "Asiento balanceado" : "Asiento desbalanceado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metadatos */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg bg-card">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha de Creación
                      </Label>
                      <p className="font-semibold mt-1">
                        {asiento.created_at ? format(new Date(asiento.created_at), "PPP", { locale: es }) : "-"}
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg bg-card">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Última Actualización
                      </Label>
                      <p className="font-semibold mt-1">
                        {asiento.updated_at ? format(new Date(asiento.updated_at), "PPP", { locale: es }) : "-"}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="lineas" className="space-y-6 mt-0 p-4">
                  <div className="space-y-4 p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                      <ListOrdered className="h-5 w-5" />
                      Líneas del Asiento ({asiento.items?.length || 0})
                    </h3>

                    {asiento.items && asiento.items.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Cuenta</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead className="text-right">Debe</TableHead>
                              <TableHead className="text-right">Haber</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {asiento.items.map((item, index) => (
                              <TableRow key={item.id || index}>
                                <TableCell className="font-mono text-muted-foreground">
                                  {item.linea || index + 1}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {item.cuenta?.codigo}
                                    </span>
                                    <p className="font-medium text-sm">{item.cuenta?.nombre}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {item.descripcion || "-"}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {Number(item.debe) > 0 ? (
                                    <span className="text-green-700 dark:text-green-400">
                                      ${Number(item.debe).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {Number(item.haber) > 0 ? (
                                    <span className="text-red-700 dark:text-red-400">
                                      ${Number(item.haber).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/30 font-bold">
                              <TableCell colSpan={3} className="text-right">
                                TOTALES
                              </TableCell>
                              <TableCell className="text-right font-mono text-green-700 dark:text-green-400">
                                ${totalDebe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-mono text-red-700 dark:text-red-400">
                                ${totalHaber.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No hay líneas en este asiento</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmar Asiento */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar asiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Al confirmar el asiento <strong>#{asiento.numero}</strong>, se registrará permanentemente en el libro diario y no podrá ser editado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isProcessing}>
              {isProcessing ? "Confirmando..." : "Confirmar Asiento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revertir Asiento */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revertir asiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Al revertir el asiento <strong>#{asiento.numero}</strong>, se marcará como revertido. Esta acción creará un contra-asiento para anular los efectos contables.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevert}
              disabled={isProcessing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? "Revirtiendo..." : "Revertir Asiento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Eliminar Asiento */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar asiento?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el asiento <strong>#{asiento.numero}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
