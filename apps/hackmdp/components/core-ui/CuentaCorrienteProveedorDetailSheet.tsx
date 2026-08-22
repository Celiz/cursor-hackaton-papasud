"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Plus,
  CreditCard,
  Receipt,
  Calendar,
  FileText,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { CuentaCorrienteProveedor, MovimientoProveedor, RemitoCompra } from "@/lib/types";
import { toast } from "sonner";
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import * as XLSX from "xlsx";
import { generateCuentaCorrienteProveedorPDF } from "@/lib/pdf-generator";
import { useSession } from "@/lib/hooks/use-session";
import { formatCurrency } from "@/lib/format-currency";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CuentaCorrienteProveedorDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta: CuentaCorrienteProveedor | null;
  onRefresh?: () => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateLong = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export function CuentaCorrienteProveedorDetailSheet({
  open,
  onOpenChange,
  cuenta,
  onRefresh,
}: CuentaCorrienteProveedorDetailSheetProps) {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const [movimientos, setMovimientos] = useState<MovimientoProveedor[]>([]);
  const [remitos, setRemitos] = useState<RemitoCompra[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingRemitos, setLoadingRemitos] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string>("all");

  // Fetch movimientos
  useEffect(() => {
    if (open && cuenta) {
      setLoadingMovimientos(true);
      fetch(`/api/cuentas-corrientes-proveedores/movimientos?proveedor_id=${cuenta.proveedor_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setMovimientos(data);
          }
        })
        .catch((err) => console.error("Error loading movimientos:", err))
        .finally(() => setLoadingMovimientos(false));
    }
  }, [open, cuenta]);

  // Fetch remitos de compra
  useEffect(() => {
    if (open && cuenta) {
      setLoadingRemitos(true);
      fetch(`/api/remitos-compra?proveedor_id=${cuenta.proveedor_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setRemitos(data);
          }
        })
        .catch((err) => console.error("Error loading remitos:", err))
        .finally(() => setLoadingRemitos(false));
    }
  }, [open, cuenta]);

  // Remitos pendientes
  const remitosPendientes = useMemo(() =>
    remitos.filter(r => r.estado === 'pendiente' || r.estado === 'parcial'),
    [remitos]
  );

  if (!cuenta) return null;

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "compra":
        return <ArrowUpCircle className="h-4 w-4 text-blue-600" />;
      case "pago":
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "compra":
        return "secondary";
      case "pago":
        return "default";
      default:
        return "outline";
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "compra":
        return "Compra";
      case "pago":
        return "Pago";
      default:
        return tipo;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "pagada":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Pagado</Badge>;
      case "pendiente":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case "parcial":
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Parcial</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const handlePrint = async () => {
    if (!cuenta) return;
    try {
      let movimientosFiltrados = movimientos;
      let dias: number | undefined;

      if (selectedDays !== "all") {
        dias = parseInt(selectedDays);
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - dias);
        movimientosFiltrados = movimientos.filter(
          (mov) => new Date(mov.fecha) >= fechaLimite
        );
      }

      const doc = await generateCuentaCorrienteProveedorPDF(cuenta, movimientosFiltrados, dias, orgId);
      doc.save(
        `cuenta-corriente-proveedor-${cuenta.nombre.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
      );
      toast.success("PDF generado exitosamente");
      setPrintDialogOpen(false);
    } catch (error) {
      toast.error("Error al generar PDF");
      console.error(error);
    }
  };

  const handleExportFullStatementExcel = () => {
    if (!cuenta) return;
    try {
      const wb = XLSX.utils.book_new();

      const resumenData = [
        ["Proveedor", cuenta.nombre],
        ["CUIT", cuenta.cuit || "-"],
        ["Condiciones de Pago", cuenta.condiciones_pago || "-"],
        ["Total Compras", cuenta.total_compras],
        ["Total Pagado", cuenta.total_pagado],
        ["Saldo Pendiente", cuenta.saldo_pendiente],
        ["Cant. Remitos", cuenta.cantidad_remitos],
        ["Cant. Pendientes", cuenta.cantidad_pendientes],
        ["Generado", new Date().toLocaleString("es-AR")],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet([["Concepto", "Valor"], ...resumenData]);
      wsResumen["!cols"] = [{ wch: 25 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      const movData = movimientos.map((mov) => ({
        Fecha: formatDate(mov.fecha),
        Tipo: mov.tipo_movimiento,
        Descripción: mov.descripcion,
        Débito: mov.debito > 0 ? mov.debito : "",
        Crédito: mov.credito > 0 ? mov.credito : "",
        "Saldo Acumulado": mov.saldo_acumulado,
        Estado: mov.estado || "",
      }));
      const wsMov = XLSX.utils.json_to_sheet(movData);
      wsMov["!cols"] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, wsMov, "Movimientos");

      const filename = `CuentaCorriente_Proveedor_${cuenta.nombre.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Excel exportado correctamente");
    } catch (error) {
      toast.error("Error al exportar Excel");
      console.error(error);
    }
  };

  const handleExportMovimientosExcel = () => {
    if (movimientos.length === 0) {
      toast.info('No hay movimientos para exportar');
      return;
    }

    const data = movimientos.map(mov => ({
      'Fecha': formatDate(mov.fecha),
      'Descripción': mov.descripcion,
      'Débito': mov.debito > 0 ? mov.debito : '',
      'Crédito': mov.credito > 0 ? mov.credito : '',
      'Saldo Acumulado': mov.saldo_acumulado,
      'Estado': mov.estado || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

    ws['!cols'] = [
      { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    ];

    const filename = `Movimientos_Proveedor_${cuenta.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Movimientos exportados correctamente');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-blue-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-blue-950/10"
        side="bottom"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-4 pb-3 pr-14 border-b border-gray-200/50 dark:border-gray-800/30 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-3 rounded-2xl border border-blue-200/30 dark:border-blue-800/30 shadow-sm">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {cuenta.nombre}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {cuenta.cuit && (
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                      CUIT: {cuenta.cuit}
                    </span>
                  )}
                  <Badge
                    variant={cuenta.saldo_pendiente > 0 ? "destructive" : cuenta.saldo_pendiente < 0 ? "default" : "outline"}
                    className={cn(
                      cuenta.saldo_pendiente > 0 && "bg-orange-100 text-orange-700 border-orange-200",
                      cuenta.saldo_pendiente < 0 && "bg-green-100 text-green-700 border-green-200",
                      cuenta.saldo_pendiente === 0 && "bg-gray-100 text-gray-700"
                    )}
                  >
                    {cuenta.saldo_pendiente > 0 ? "Pendiente" : cuenta.saldo_pendiente < 0 ? "A favor" : "Al Día"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFullStatementExcel}
                disabled={movimientos.length === 0}
                className="gap-1"
                title="Exportar Estado de Cuenta a Excel"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintDialogOpen(true)}
                className="gap-1"
                title="Imprimir Estado de Cuenta"
              >
                <Printer className="h-4 w-4 text-gray-600" />
                PDF
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden mt-4 px-6 pb-6">
          <Tabs defaultValue="resumen" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className={cn(sheetClasses.tabsList, "grid-cols-3")}>
              <TabsTrigger value="resumen" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Resumen</span>
              </TabsTrigger>
              <TabsTrigger value="compras" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <Receipt className="w-4 h-4" />
                <span className="text-sm">Compras</span>
              </TabsTrigger>
              <TabsTrigger value="movimientos" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <FileText className="w-4 h-4" />
                <span className="text-sm">Movimientos</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Resumen */}
            <TabsContent value="resumen" className="space-y-4 mt-0 p-4 overflow-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Resumen financiero */}
                <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900/50">
                  <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Resumen de Cuenta
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Compras</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {formatCurrency(cuenta.total_compras)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cuenta.cantidad_remitos} remito{cuenta.cantidad_remitos !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Pagado</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {formatCurrency(cuenta.total_pagado)}
                      </p>
                    </div>

                    <div className={cn(
                      "border rounded-lg p-3",
                      cuenta.saldo_pendiente > 0
                        ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                        : cuenta.saldo_pendiente < 0
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                        : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20"
                    )}>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Saldo Actual</p>
                      <div className={cn(
                        "flex items-center gap-2 mt-1",
                        cuenta.saldo_pendiente > 0 ? "text-orange-600" : cuenta.saldo_pendiente < 0 ? "text-green-600" : "text-gray-600"
                      )}>
                        {cuenta.saldo_pendiente > 0 ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : cuenta.saldo_pendiente < 0 ? (
                          <TrendingDown className="h-5 w-5" />
                        ) : null}
                        <p className="text-xl font-bold">
                          {formatCurrency(Math.abs(cuenta.saldo_pendiente))}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cuenta.saldo_pendiente > 0 ? "Por pagar" : cuenta.saldo_pendiente < 0 ? "A favor" : "Saldado"}
                      </p>
                    </div>

                    <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-950/20">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Remitos Pendientes</p>
                      <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                        {cuenta.cantidad_pendientes}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatCurrency(cuenta.total_pendiente)}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Remitos pendientes */}
                {remitosPendientes.length > 0 && (
                  <section className="space-y-3 p-4 border border-yellow-200/40 dark:border-yellow-800/30 rounded-xl bg-yellow-50/50 dark:bg-yellow-950/10">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                      <Receipt className="h-4 w-4 text-yellow-600" />
                      Remitos Pendientes ({remitosPendientes.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {remitosPendientes.slice(0, 5).map((remito, index) => (
                        <motion.div
                          key={remito.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        >
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{remito.numero}</p>
                              <p className="text-xs text-gray-500">{formatDate(remito.fecha)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{formatCurrency(remito.saldo_pendiente || remito.total)}</p>
                            {getEstadoBadge(remito.estado)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Info */}
                <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900/50">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Información
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Última Actividad</p>
                      <p className="text-sm font-medium">{formatDateLong(cuenta.ultima_actividad)}</p>
                    </div>
                    {cuenta.condiciones_pago && (
                      <div>
                        <p className="text-xs text-gray-500">Condiciones de Pago</p>
                        <p className="text-sm font-medium capitalize">{cuenta.condiciones_pago.replace('_', ' ')}</p>
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            </TabsContent>

            {/* Tab Compras */}
            <TabsContent value="compras" className="flex-1 overflow-hidden mt-0 p-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Remitos de Compra ({remitos.length})
                  </h3>
                </div>

                {loadingRemitos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : remitos.length > 0 ? (
                  <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                    <div className="space-y-2 pb-4">
                      <AnimatePresence mode="popLayout">
                        {remitos.map((remito, index) => (
                          <motion.div
                            key={remito.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  remito.estado === 'pagada' ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"
                                )}>
                                  <Receipt className={cn(
                                    "h-4 w-4",
                                    remito.estado === 'pagada' ? "text-green-600" : "text-yellow-600"
                                  )} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold">{remito.numero}</p>
                                    {getEstadoBadge(remito.estado)}
                                  </div>
                                  <p className="text-xs text-gray-500">{formatDate(remito.fecha)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{formatCurrency(remito.total)}</p>
                                {remito.saldo_pendiente !== undefined && remito.saldo_pendiente > 0 && (
                                  <p className="text-xs text-orange-600">
                                    Pendiente: {formatCurrency(remito.saldo_pendiente)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                    <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay compras registradas</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* Tab Movimientos */}
            <TabsContent value="movimientos" className="flex-1 overflow-hidden mt-0 p-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Historial de Movimientos ({movimientos.length})
                  </h3>
                </div>

                {loadingMovimientos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : movimientos.length > 0 ? (
                  <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                    <div className="space-y-2 pb-4">
                      <AnimatePresence mode="popLayout">
                        {movimientos.map((mov, index) => (
                          <motion.div
                            key={mov.movimiento_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {getTipoIcon(mov.tipo_movimiento)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getTipoBadgeVariant(mov.tipo_movimiento)} className="text-xs">
                                      {getTipoLabel(mov.tipo_movimiento)}
                                    </Badge>
                                    <span className="text-xs text-gray-500">{formatDate(mov.fecha)}</span>
                                  </div>
                                  <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{mov.descripcion}</p>
                                </div>
                              </div>

                              <div className="text-right space-y-1 ml-4">
                                {mov.debito > 0 && (
                                  <div className="font-semibold text-blue-600 text-sm">
                                    +{formatCurrency(mov.debito)}
                                  </div>
                                )}
                                {mov.credito > 0 && (
                                  <div className="font-semibold text-green-600 text-sm">
                                    -{formatCurrency(mov.credito)}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  Saldo: {formatCurrency(mov.saldo_acumulado)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay movimientos registrados</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      {/* Dialog para imprimir Estado de Cuenta */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imprimir Estado de Cuenta Proveedor</DialogTitle>
            <DialogDescription>
              Selecciona el período de movimientos que deseas incluir en el reporte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="days-filter-prov">Filtro por días</Label>
              <Select value={selectedDays} onValueChange={setSelectedDays}>
                <SelectTrigger id="days-filter-prov">
                  <SelectValue placeholder="Selecciona un período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los movimientos</SelectItem>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="15">Últimos 15 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="60">Últimos 60 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              Generar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
