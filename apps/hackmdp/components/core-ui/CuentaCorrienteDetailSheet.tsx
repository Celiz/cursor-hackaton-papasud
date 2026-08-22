"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Plus,
  CreditCard,
  FileMinus,
  Receipt,
  Calendar,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Mail,
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  Building2,
  Phone,
  AtSign,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { CuentaCorriente, MovimientoCuentaCorriente, Factura, Pago, NotaCredito } from "@/lib/types";
import { generateCuentaCorrientePDF } from "@/lib/pdf-generator";
import { useSession } from "@/lib/hooks/use-session";
import { toast } from "sonner";
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";

// Import dialogs
import { ExpandableEmailButton } from "@/components/core-ui/ExpandableEmailButton";
import { ShareToInternalChatButton } from './ShareToInternalChatButton';
import { EmailTrackingBadge, EmailTrackingStatus } from "@/components/core-ui/EmailTrackingBadge";
import { FacturaFormDialog } from "@/components/core-ui/FacturaFormDialog";
import { PagoFormDialog } from "@/components/core-ui/PagoFormDialog";
import { NotaCreditoFormDialog } from "@/components/core-ui/NotaCreditoFormDialog";
import { ExportDialog, ExportColumnOption, ExportFilterOption, ExportReportType, ExportFormat } from "@/components/core-ui/ExportDialog";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/format-currency";

interface CuentaCorrienteDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta: CuentaCorriente;
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

export function CuentaCorrienteDetailSheet({
  open,
  onOpenChange,
  cuenta,
  onRefresh,
}: CuentaCorrienteDetailSheetProps) {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const [movimientos, setMovimientos] = useState<MovimientoCuentaCorriente[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string>("all");
  const [emailTracking, setEmailTracking] = useState<EmailTrackingStatus[]>([]);

  // Dialog states
  const [facturaFormOpen, setFacturaFormOpen] = useState(false);
  const [pagoFormOpen, setPagoFormOpen] = useState(false);
  const [ncFormOpen, setNcFormOpen] = useState(false);
  const [selectedFacturaId, setSelectedFacturaId] = useState<string | null>(null);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [editingNC, setEditingNC] = useState<NotaCredito | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Obtener emails del cliente como array
  const clienteEmails: string[] = React.useMemo(() => {
    const email = cuenta.email;
    if (!email) return [];
    if (Array.isArray(email)) return email.filter(Boolean);
    return [email].filter(Boolean);
  }, [cuenta.email]);

  const handleSendEmail = async (email: string) => {
    const toastId = toast.loading(`Enviando resumen a ${email}...`);

    try {
      const res = await fetch('/api/cuentas-corrientes/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cuenta.cliente_id,
          email_destino: email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar');
      }

      toast.success('Resumen enviado correctamente', {
        id: toastId,
        description: `Email enviado a ${email}`,
      });

      // Refrescar tracking después de enviar
      fetch(`/api/email-tracking?cliente_id=${cuenta.cliente_id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEmailTracking(data);
          }
        })
        .catch(console.error);
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar email', { id: toastId });
    }
  };

  // Fetch movimientos
  useEffect(() => {
    if (open && cuenta) {
      setLoadingMovimientos(true);
      fetch(`/api/cuentas-corrientes/movimientos?cliente_id=${cuenta.cliente_id}`)
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

  // Fetch facturas del cliente
  useEffect(() => {
    if (open && cuenta) {
      setLoadingFacturas(true);
      fetch(`/api/facturas?cliente_id=${cuenta.cliente_id}`)
        .then((res) => res.json())
        .then((data) => {
          // API returns { data: [], pagination: {} }
          const facturasList = data?.data || data;
          if (Array.isArray(facturasList)) {
            setFacturas(facturasList);
          }
        })
        .catch((err) => console.error("Error loading facturas:", err))
        .finally(() => setLoadingFacturas(false));
    }
  }, [open, cuenta]);

  // Fetch email tracking del cliente
  useEffect(() => {
    if (open && cuenta?.cliente_id) {
      fetch(`/api/email-tracking?cliente_id=${cuenta.cliente_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setEmailTracking(data);
          }
        })
        .catch((err) => console.error("Error loading email tracking:", err));
    }
  }, [open, cuenta?.cliente_id]);

  // Refetch data
  const refetchData = async () => {
    if (cuenta) {
      // Refetch movimientos
      const movRes = await fetch(`/api/cuentas-corrientes/movimientos?cliente_id=${cuenta.cliente_id}`);
      const movData = await movRes.json();
      if (Array.isArray(movData)) setMovimientos(movData);

      // Refetch facturas - API returns { data: [], pagination: {} }
      const facRes = await fetch(`/api/facturas?cliente_id=${cuenta.cliente_id}`);
      const facData = await facRes.json();
      const facturasList = facData?.data || facData;
      if (Array.isArray(facturasList)) setFacturas(facturasList);

      // Notify parent
      if (onRefresh) onRefresh();
    }
  };

  // Separate facturas by status
  const facturasPendientes = useMemo(() =>
    facturas.filter(f => f.estado === 'pendiente' || f.estado === 'vencida'),
    [facturas]
  );

  const facturasPagadas = useMemo(() =>
    facturas.filter(f => f.estado === 'pagada'),
    [facturas]
  );

  // Get all pagos from facturas
  const todosPagos = useMemo(() => {
    const pagos: Array<Pago & { factura?: Factura }> = [];
    facturas.forEach(f => {
      if (f.pagos) {
        f.pagos.forEach(p => pagos.push({ ...p, factura: f }));
      }
    });
    return pagos.sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
  }, [facturas]);

  // Get all notas de credito
  const todasNC = useMemo(() => {
    const ncs: Array<NotaCredito & { factura?: Factura }> = [];
    facturas.forEach(f => {
      if (f.notas_credito) {
        f.notas_credito.forEach(nc => ncs.push({ ...nc, factura: f }));
      }
    });
    return ncs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [facturas]);

  if (!cuenta) return null;

  const clienteNombre = cuenta.nombre_fantasia || cuenta.nombre;

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "factura":
        return <ArrowUpCircle className="h-4 w-4 text-red-600" />;
      case "pago":
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case "nota_credito":
        return <ArrowDownCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "factura":
        return "destructive";
      case "pago":
        return "default";
      case "nota_credito":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "factura":
        return "Factura";
      case "pago":
        return "Pago";
      case "nota_credito":
        return "Nota Crédito";
      default:
        return tipo;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "pagada":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Pagada</Badge>;
      case "pendiente":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case "vencida":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Vencida</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const handlePrint = async () => {
    try {
      let movimientosFiltrados = movimientos;
      let dias: number | undefined;

      if (selectedDays !== "all") {
        dias = parseInt(selectedDays);
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - dias);

        movimientosFiltrados = movimientos.filter(mov => {
          const fechaMov = new Date(mov.fecha);
          return fechaMov >= fechaLimite;
        });
      }

      const doc = await generateCuentaCorrientePDF(cuenta, movimientosFiltrados, dias, orgId);
      doc.save(`cuenta-corriente-${cuenta.identificador_unico || cuenta.cliente_id.slice(0, 8)}.pdf`);
      toast.success('PDF generado exitosamente');
      setPrintDialogOpen(false);
    } catch (error) {
      toast.error('Error al generar PDF');
      console.error(error);
    }
  };

  const handleExportFullStatementExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const resumenData = [
        ["Cliente", cuenta.nombre_fantasia || cuenta.nombre],
        ["ID", cuenta.identificador_unico || "-"],
        ["CUIT", cuenta.cuit || "-"],
        ["Total Facturado", cuenta.total_facturado],
        ["Total Pagado", cuenta.total_pagado],
        ["Notas de Crédito", cuenta.total_notas_credito],
        ["Saldo Actual", cuenta.saldo_actual],
        ["Total Vencido", cuenta.total_vencido],
        ["Cant. Facturas", cuenta.cantidad_facturas],
        ["Cant. Pagos", cuenta.cantidad_pagos],
        ["Generado", new Date().toLocaleString("es-AR")],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet([["Concepto", "Valor"], ...resumenData]);
      wsResumen["!cols"] = [{ wch: 25 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      const movData = movimientos.map((mov) => ({
        Fecha: new Date(mov.fecha).toLocaleDateString("es-AR"),
        Tipo:
          mov.tipo_movimiento === "factura"
            ? "Factura"
            : mov.tipo_movimiento === "pago"
            ? "Pago"
            : mov.tipo_movimiento === "nota_credito"
            ? "N/C"
            : mov.tipo_movimiento,
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

      const nombre = (cuenta.nombre_fantasia || cuenta.nombre || "cliente").replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `CuentaCorriente_${nombre}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Excel exportado correctamente");
    } catch (error) {
      toast.error("Error al exportar Excel");
      console.error(error);
    }
  };

  const handleDeletePago = async (pagoId: string) => {
    if (!confirm('¿Eliminar este pago?')) return;
    try {
      const res = await fetch(`/api/pagos?id=${pagoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Pago eliminado');
      refetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar pago');
    }
  };

  const handleDeleteNC = async (ncId: string) => {
    if (!confirm('¿Eliminar esta nota de crédito?')) return;
    try {
      const res = await fetch(`/api/notas-credito?id=${ncId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Nota de crédito eliminada');
      refetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar nota de crédito');
    }
  };

  // Export configuration for client's data
  const exportColumnsFacturas: ExportColumnOption[] = [
    { id: 'tipo_factura', label: 'Tipo', accessorKey: 'tipo_factura' },
    { id: 'nro_factura', label: 'Número', accessorKey: 'nro_factura' },
    {
      id: 'fecha_emision',
      label: 'Fecha Emisión',
      accessorKey: 'fecha_emision',
      cell: (value) => value ? formatDate(value as string) : '-'
    },
    {
      id: 'fecha_vencimiento',
      label: 'Vencimiento',
      accessorKey: 'fecha_vencimiento',
      cell: (value) => value ? formatDate(value as string) : '-'
    },
    { id: 'estado', label: 'Estado', accessorKey: 'estado' },
    {
      id: 'total',
      label: 'Total',
      accessorKey: 'total',
      cell: (value) => formatCurrency(Number(value) || 0)
    },
    {
      id: 'saldo_pendiente',
      label: 'Saldo Pendiente',
      accessorKey: 'saldo_pendiente',
      cell: (value) => formatCurrency(Number(value) || 0)
    },
  ];

  const exportColumnsPagos: ExportColumnOption[] = [
    {
      id: 'fecha_pago',
      label: 'Fecha',
      accessorKey: 'fecha_pago',
      cell: (value) => value ? formatDate(value as string) : '-'
    },
    {
      id: 'monto',
      label: 'Monto',
      accessorKey: 'monto',
      cell: (value) => formatCurrency(Number(value) || 0)
    },
    { id: 'metodo_pago', label: 'Método', accessorKey: 'metodo_pago' },
  ];

  const exportColumnsMovimientos: ExportColumnOption[] = [
    {
      id: 'fecha',
      label: 'Fecha',
      accessorKey: 'fecha',
      cell: (value) => value ? formatDate(value as string) : '-'
    },
    { id: 'tipo_movimiento', label: 'Tipo', accessorKey: 'tipo_movimiento' },
    { id: 'descripcion', label: 'Descripción', accessorKey: 'descripcion' },
    {
      id: 'debito',
      label: 'Débito',
      accessorKey: 'debito',
      cell: (value) => Number(value) > 0 ? formatCurrency(Number(value)) : '-'
    },
    {
      id: 'credito',
      label: 'Crédito',
      accessorKey: 'credito',
      cell: (value) => Number(value) > 0 ? formatCurrency(Number(value)) : '-'
    },
    {
      id: 'saldo_acumulado',
      label: 'Saldo',
      accessorKey: 'saldo_acumulado',
      cell: (value) => formatCurrency(Number(value) || 0)
    },
  ];

  const exportFilters: ExportFilterOption[] = [
    { id: 'facturas', label: 'Facturas', value: 'facturas', icon: <FileText className="h-3.5 w-3.5" /> },
    { id: 'pagos', label: 'Pagos', value: 'pagos', icon: <CreditCard className="h-3.5 w-3.5" /> },
    { id: 'movimientos', label: 'Movimientos', value: 'movimientos', icon: <Receipt className="h-3.5 w-3.5" /> },
  ];

  const exportReportTypes: ExportReportType[] = [
    {
      id: 'facturas',
      label: 'Facturas del Cliente',
      description: 'Listado completo de facturas',
      columns: exportColumnsFacturas.map(c => c.id)
    },
    {
      id: 'pagos',
      label: 'Historial de Pagos',
      description: 'Todos los pagos recibidos',
      columns: exportColumnsPagos.map(c => c.id)
    },
    {
      id: 'movimientos',
      label: 'Movimientos de Cuenta',
      description: 'Historial completo de movimientos',
      columns: exportColumnsMovimientos.map(c => c.id)
    },
  ];

  const handleExportClient = async (options: {
    format: ExportFormat
    columns: ExportColumnOption[]
    dateFrom?: string
    dateTo?: string
    selectedFilters: string[]
    reportType?: string
  }) => {
    let dataToExport: unknown[] = [];
    let columnsToUse = options.columns;
    let reportName = 'cuenta_corriente';
    let summaryRow: Record<string, string> | undefined;

    // Determine what to export based on report type
    switch (options.reportType) {
      case 'facturas':
        dataToExport = facturas;
        columnsToUse = exportColumnsFacturas.filter(c => options.columns.some(oc => oc.id === c.id));
        reportName = 'facturas';
        break;
      case 'pagos':
        dataToExport = todosPagos;
        columnsToUse = exportColumnsPagos.filter(c => options.columns.some(oc => oc.id === c.id));
        reportName = 'pagos';
        break;
      case 'movimientos':
        dataToExport = movimientos;
        columnsToUse = exportColumnsMovimientos.filter(c => options.columns.some(oc => oc.id === c.id));
        reportName = 'movimientos';
        // Add summary row with current balance
        summaryRow = {
          'Descripción': 'Saldo Actual:',
          'Saldo': formatCurrency(cuenta.saldo_actual),
        };
        break;
      default:
        dataToExport = movimientos;
        columnsToUse = exportColumnsMovimientos;
        reportName = 'movimientos';
        summaryRow = {
          'Descripción': 'Saldo Actual:',
          'Saldo': formatCurrency(cuenta.saldo_actual),
        };
    }

    // Apply date filter if provided
    if (options.dateFrom || options.dateTo) {
      dataToExport = (dataToExport as any[]).filter(item => {
        const fecha = item.fecha || item.fecha_emision || item.fecha_pago;
        if (!fecha) return true;
        const itemDate = new Date(fecha);
        if (options.dateFrom && itemDate < new Date(options.dateFrom)) return false;
        if (options.dateTo && itemDate > new Date(options.dateTo)) return false;
        return true;
      });
    }

    const clientId = cuenta.identificador_unico || cuenta.cliente_id.slice(0, 8);
    const exportOptions = {
      filename: `${reportName}_${clientId}_${new Date().toISOString().split('T')[0]}`,
      title: `${clienteNombre} - ${options.reportType === 'facturas' ? 'Facturas' : options.reportType === 'pagos' ? 'Pagos' : 'Movimientos'}`,
      columns: columnsToUse.map(col => ({
        header: col.label,
        accessorKey: col.accessorKey,
        cell: col.cell,
      })),
      data: dataToExport,
      summaryRow,
    };

    switch (options.format) {
      case 'excel':
        exportToExcel(exportOptions);
        break;
      case 'csv':
        exportToCSV(exportOptions);
        break;
      case 'pdf':
        exportToPDF(exportOptions);
        break;
    }

    toast.success('Exportación completada');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] max-h-[100dvh] md:h-[90vh] overflow-y-auto p-0 flex flex-col bg-gradient-to-br from-white via-white to-purple-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-purple-950/10"
        side="bottom"
      >
        {/* Header compacto - responsive para pantallas pequeñas */}
        <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 pr-12 sm:pr-14 border-b border-purple-200/50 dark:border-purple-800/30 shrink-0 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-950/10 dark:to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center sm:items-start gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Icon con acento - más pequeño en mobile */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-purple-200/30 dark:border-purple-800/30 shadow-sm shadow-purple-500/10 shrink-0">
                <Building2 className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base sm:text-2xl bg-gradient-to-r from-purple-900 to-purple-700 dark:from-purple-100 dark:to-purple-300 bg-clip-text text-transparent truncate">
                  {clienteNombre}
                </SheetTitle>
                <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                  {cuenta.identificador_unico && (
                    <span className="text-[10px] sm:text-xs font-mono text-gray-600 dark:text-gray-400">
                      #{cuenta.identificador_unico}
                    </span>
                  )}
                  {cuenta.cuit && (
                    <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 hidden sm:inline">
                      CUIT: {cuenta.cuit}
                    </span>
                  )}
                  <Badge
                    variant={cuenta.saldo_actual > 0 ? "destructive" : cuenta.saldo_actual < 0 ? "default" : "outline"}
                    className={cn(
                      "text-[10px] sm:text-xs px-1 sm:px-2",
                      cuenta.saldo_actual > 0 && "bg-red-100 text-red-700 border-red-200",
                      cuenta.saldo_actual < 0 && "bg-green-100 text-green-700 border-green-200",
                      cuenta.saldo_actual === 0 && "bg-gray-100 text-gray-700"
                    )}
                  >
                    {cuenta.saldo_actual > 0 ? "Deudor" : cuenta.saldo_actual < 0 ? "A Favor" : "Al Día"}
                  </Badge>
                  <EmailTrackingBadge tracking={emailTracking} />
                </div>
              </div>
            </div>

            {/* Botones de acción compactos - scroll horizontal en mobile */}
            <div className="flex gap-1 sm:gap-2 flex-shrink-0 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
              <Button
                type="primary"
                size="tiny"
                onClick={() => setFacturaFormOpen(true)}
                icon={<Plus />}
                className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
              >
                Factura
              </Button>
              <Button
                type="default"
                size="tiny"
                onClick={() => {
                  if (facturasPendientes.length > 0) {
                    setSelectedFacturaId(facturasPendientes[0].id);
                    setPagoFormOpen(true);
                  } else {
                    toast.info('No hay facturas pendientes para registrar pagos');
                  }
                }}
                icon={<CreditCard />}
                className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
              >
                Pago
              </Button>
              <Button
                type="default"
                size="tiny"
                onClick={() => {
                  if (facturasPendientes.length > 0) {
                    setSelectedFacturaId(facturasPendientes[0].id);
                    setNcFormOpen(true);
                  } else {
                    toast.info('No hay facturas pendientes para emitir NC');
                  }
                }}
                icon={<FileMinus />}
              >
                NC
              </Button>
              <Button
                type="default"
                size="tiny"
                onClick={() => setExportDialogOpen(true)}
                icon={<Download />}
                title="Exportar datos"
              />
              <ExpandableEmailButton
                emails={clienteEmails}
                onSendEmail={handleSendEmail}
              />
              <ShareToInternalChatButton
                entity={{
                  type: 'cuenta_corriente',
                  id: cuenta.cliente_id,
                  label: cuenta.cliente_nombre || 'Cliente',
                  amount: cuenta.saldo_pendiente,
                  link: `/dashboard/cuentas-corrientes?cliente=${cuenta.cliente_id}`,
                }}
              />
              <Button
                type="default"
                size="tiny"
                onClick={handleExportFullStatementExcel}
                icon={<FileSpreadsheet />}
                title="Exportar Estado de Cuenta a Excel"
              />
              <Button
                type="default"
                size="tiny"
                onClick={() => setPrintDialogOpen(true)}
                icon={<Printer />}
                title="Imprimir Estado de Cuenta"
              />
            </div>
          </div>
        </SheetHeader>

        {/* Content con tabs - scroll nativo para mejor compatibilidad */}
        <div className="flex-1 overflow-y-auto mt-2 sm:mt-4">
          <div className="px-4 sm:px-6 pb-6">
            <Tabs defaultValue="resumen" className="w-full">
              <TabsList className={cn(sheetClasses.tabsList, "grid-cols-5 h-auto")}>
                <TabsTrigger value="resumen" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm">Resumen</span>
                </TabsTrigger>
                <TabsTrigger value="facturas" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm hidden xs:inline">Remitos</span>
                </TabsTrigger>
                <TabsTrigger value="pagos" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm">Cobros</span>
                </TabsTrigger>
                <TabsTrigger value="notas" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <FileMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm hidden xs:inline">NC</span>
                </TabsTrigger>
                <TabsTrigger value="movimientos" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm hidden sm:inline">Movimientos</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Resumen */}
              <TabsContent value="resumen" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Resumen financiero */}
                  <section className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-purple-200/50 dark:border-purple-800/30 pb-2 text-purple-900 dark:text-purple-100">
                      <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      Resumen Financiero
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Facturado</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                          {formatCurrency(cuenta.total_facturado)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cuenta.cantidad_facturas} factura{cuenta.cantidad_facturas !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Pagado</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                          {formatCurrency(cuenta.total_pagado)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cuenta.cantidad_pagos} pago{cuenta.cantidad_pagos !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {cuenta.total_notas_credito > 0 && (
                        <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Notas de Crédito</p>
                          <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                            {formatCurrency(cuenta.total_notas_credito)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {cuenta.cantidad_nc} NC
                          </p>
                        </div>
                      )}

                      <div className={cn(
                        "border rounded-lg p-3",
                        cuenta.saldo_actual > 0
                          ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
                          : cuenta.saldo_actual < 0
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                          : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20"
                      )}>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Saldo Actual</p>
                        <div className={cn(
                          "flex items-center gap-2 mt-1",
                          cuenta.saldo_actual > 0 ? "text-red-600" : cuenta.saldo_actual < 0 ? "text-green-600" : "text-gray-600"
                        )}>
                          {cuenta.saldo_actual > 0 ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : cuenta.saldo_actual < 0 ? (
                            <TrendingDown className="h-5 w-5" />
                          ) : null}
                          <p className="text-xl font-bold">
                            {formatCurrency(Math.abs(cuenta.saldo_actual))}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cuenta.saldo_actual > 0 ? "Debe" : cuenta.saldo_actual < 0 ? "A favor" : "Saldado"}
                        </p>
                      </div>
                    </div>

                    {/* Saldos a favor separados: Legal e IVR */}
                    {((cuenta.saldo_a_favor_legal || 0) > 0 || (cuenta.saldo_a_favor_ivr || 0) > 0) && (
                      <div className="mt-3 pt-3 border-t border-purple-200/50 dark:border-purple-800/30">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Saldos a Favor Disponibles:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {(cuenta.saldo_a_favor_legal || 0) > 0 && (
                            <div className="border border-green-200 dark:border-green-800 rounded-lg p-2 bg-green-50/50 dark:bg-green-950/10">
                              <div className="flex items-center gap-1.5">
                                <Wallet className="h-3.5 w-3.5 text-green-600" />
                                <p className="text-xs text-green-700 dark:text-green-300">Cuenta Legal</p>
                              </div>
                              <p className="text-sm font-bold text-green-600 mt-1">
                                {formatCurrency(cuenta.saldo_a_favor_legal || 0)}
                              </p>
                            </div>
                          )}
                          {(cuenta.saldo_a_favor_ivr || 0) > 0 && (
                            <div className="border border-cyan-200 dark:border-cyan-800 rounded-lg p-2 bg-cyan-50/50 dark:bg-cyan-950/10">
                              <div className="flex items-center gap-1.5">
                                <Wallet className="h-3.5 w-3.5 text-cyan-600" />
                                <p className="text-xs text-cyan-700 dark:text-cyan-300">Cuenta IVR</p>
                              </div>
                              <p className="text-sm font-bold text-cyan-600 mt-1">
                                {formatCurrency(cuenta.saldo_a_favor_ivr || 0)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Alerta de vencidos */}
                  {cuenta.total_vencido > 0 && (
                    <section className="space-y-3 p-4 border border-red-200/60 dark:border-red-800/40 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertTriangle className="h-4 w-4" />
                        Deuda Vencida
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(cuenta.total_vencido)}
                          </p>
                          <p className="text-xs text-red-600/80">
                            {cuenta.cantidad_vencidas} factura{cuenta.cantidad_vencidas !== 1 ? 's' : ''} vencida{cuenta.cantidad_vencidas !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button
                          type="default"
                          size="small"
                          className="border-red-300 text-red-600 hover:bg-red-100"
                          icon={<Mail />}
                        >
                          Enviar Recordatorio
                        </Button>
                      </div>
                    </section>
                  )}

                  {/* Facturas pendientes rápidas */}
                  {facturasPendientes.length > 0 && (
                    <section className="space-y-3 p-4 border border-yellow-200/40 dark:border-yellow-800/30 rounded-xl bg-gradient-to-br from-white to-yellow-50/20 dark:from-gray-900 dark:to-yellow-950/10 shadow-sm">
                      <div className="flex items-center justify-between border-b border-yellow-200/50 dark:border-yellow-800/30 pb-2">
                        <h3 className="font-semibold text-sm flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          Facturas Pendientes ({facturasPendientes.length})
                        </h3>
                        <Button
                          type="default"
                          size="tiny"
                          onClick={() => {
                            if (facturasPendientes.length > 0) {
                              setSelectedFacturaId(facturasPendientes[0].id);
                              setPagoFormOpen(true);
                            }
                          }}
                          icon={<CreditCard />}
                          className="border-green-500 text-green-600 hover:bg-green-50"
                        >
                          Registrar Pago
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {facturasPendientes.slice(0, 5).map((factura, index) => (
                          <motion.div
                            key={factura.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">{factura.tipo_factura}</p>
                                <p className="text-xs text-gray-500">{formatDate(factura.fecha_emision)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{formatCurrency(factura.saldo_pendiente || factura.total)}</p>
                              {getEstadoBadge(factura.estado)}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Última actividad */}
                  <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-gradient-to-br from-white to-gray-50/20 dark:from-gray-900 dark:to-gray-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-700 dark:text-gray-300">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Información
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Última Actividad</p>
                        <p className="text-sm font-medium">{formatDateLong(cuenta.ultima_actividad)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Estado</p>
                        <p className="text-sm font-medium">{cuenta.estado || 'Activo'}</p>
                      </div>
                    </div>
                  </section>
                </motion.div>
              </TabsContent>

              {/* Tab Facturas */}
              <TabsContent value="facturas" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Facturas del Cliente ({facturas.length})
                    </h3>
                    <Button
                      type="primary"
                      size="tiny"
                      onClick={() => setFacturaFormOpen(true)}
                      icon={<Plus />}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Nueva Factura
                    </Button>
                  </div>

                  {loadingFacturas ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : facturas.length > 0 ? (
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {facturas.map((factura, index) => (
                          <motion.div
                            key={factura.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  factura.estado === 'pagada' ? "bg-green-100 dark:bg-green-900/30" :
                                  factura.estado === 'vencida' ? "bg-red-100 dark:bg-red-900/30" :
                                  "bg-yellow-100 dark:bg-yellow-900/30"
                                )}>
                                  <FileText className={cn(
                                    "h-4 w-4",
                                    factura.estado === 'pagada' ? "text-green-600" :
                                    factura.estado === 'vencida' ? "text-red-600" :
                                    "text-yellow-600"
                                  )} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold">Factura {factura.tipo_factura}</p>
                                    {getEstadoBadge(factura.estado)}
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(factura.fecha_emision)}
                                    {factura.fecha_vencimiento && ` • Vence: ${formatDate(factura.fecha_vencimiento)}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-bold">{formatCurrency(factura.total)}</p>
                                  {factura.saldo_pendiente !== undefined && factura.saldo_pendiente > 0 && (
                                    <p className="text-xs text-orange-600">
                                      Pendiente: {formatCurrency(factura.saldo_pendiente)}
                                    </p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="default" size="tiny" icon={<MoreVertical />} className="h-7 w-7 p-0" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      window.open(`/dashboard/facturas?id=${factura.id}`, '_blank');
                                    }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalle
                                    </DropdownMenuItem>
                                    {factura.estado !== 'pagada' && (
                                      <>
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedFacturaId(factura.id);
                                          setPagoFormOpen(true);
                                        }}>
                                          <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                                          Registrar Pago
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedFacturaId(factura.id);
                                          setNcFormOpen(true);
                                        }}>
                                          <FileMinus className="h-4 w-4 mr-2 text-orange-600" />
                                          Emitir NC
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay facturas registradas</p>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => setFacturaFormOpen(true)}
                        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                        icon={<Plus />}
                      >
                        Crear Primera Factura
                      </Button>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Tab Pagos */}
              <TabsContent value="pagos" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Historial de Pagos ({todosPagos.length})
                    </h3>
                    <Button
                      type="default"
                      size="tiny"
                      onClick={() => {
                        if (facturasPendientes.length > 0) {
                          setSelectedFacturaId(facturasPendientes[0].id);
                          setPagoFormOpen(true);
                        } else {
                          toast.info('No hay facturas pendientes');
                        }
                      }}
                      icon={<Plus />}
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      Nuevo Pago
                    </Button>
                  </div>

                  {todosPagos.length > 0 ? (
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {todosPagos.map((pago, index) => (
                          <motion.div
                            key={pago.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                  <CreditCard className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-green-600">
                                    {formatCurrency(pago.monto)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(pago.fecha_pago)} • {pago.metodo_pago || 'Sin especificar'}
                                  </p>
                                  {pago.factura && (
                                    <p className="text-xs text-gray-400">
                                      Factura {pago.factura.tipo_factura}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="default" size="tiny" icon={<MoreVertical />} className="h-7 w-7 p-0" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingPago(pago);
                                    setSelectedFacturaId(pago.factura_id);
                                    setPagoFormOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePago(pago.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Total pagado */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border border-green-200 dark:border-green-900/50 rounded-lg p-3 bg-green-50 dark:bg-green-950/20 mt-4"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total Pagado:
                          </span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(cuenta.total_pagado)}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay pagos registrados</p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Tab Notas de Crédito */}
              <TabsContent value="notas" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Notas de Crédito ({todasNC.length})
                    </h3>
                    <Button
                      type="default"
                      size="tiny"
                      onClick={() => {
                        if (facturasPendientes.length > 0) {
                          setSelectedFacturaId(facturasPendientes[0].id);
                          setNcFormOpen(true);
                        } else {
                          toast.info('No hay facturas pendientes');
                        }
                      }}
                      icon={<Plus />}
                    >
                      Nueva NC
                    </Button>
                  </div>

                  {todasNC.length > 0 ? (
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {todasNC.map((nc, index) => (
                          <motion.div
                            key={nc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                  <FileMinus className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-orange-600">
                                    {formatCurrency(nc.monto)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(nc.created_at)}
                                  </p>
                                  {nc.motivo && (
                                    <p className="text-xs text-gray-400">{nc.motivo}</p>
                                  )}
                                  {nc.factura && (
                                    <p className="text-xs text-gray-400">
                                      Factura {nc.factura.tipo_factura}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="default" size="tiny" icon={<MoreVertical />} className="h-7 w-7 p-0" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingNC(nc);
                                    setSelectedFacturaId(nc.factura_id);
                                    setNcFormOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteNC(nc.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Total NC */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border border-orange-200 dark:border-orange-900/50 rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20 mt-4"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total Notas de Crédito:
                          </span>
                          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(cuenta.total_notas_credito)}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <FileMinus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay notas de crédito</p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Tab Movimientos */}
              <TabsContent value="movimientos" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Historial de Movimientos
                    </h3>
                  </div>

                  {loadingMovimientos ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : movimientos.length > 0 ? (
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {movimientos.map((mov, index) => (
                          <motion.div
                            key={mov.movimiento_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {getTipoIcon(mov.tipo_movimiento)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getTipoBadgeVariant(mov.tipo_movimiento)} className="text-xs">
                                      {getTipoLabel(mov.tipo_movimiento)}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(mov.fecha)}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{mov.descripcion}</p>
                                  {mov.estado && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Estado: {mov.estado}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right space-y-1 ml-4">
                                {mov.debito > 0 && (
                                  <div className="font-semibold text-red-600 text-sm">
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
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay movimientos registrados</p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>

      {/* Dialog para imprimir */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imprimir Estado de Cuenta</DialogTitle>
            <DialogDescription>
              Selecciona el período de movimientos que deseas incluir en el reporte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="days-filter">Filtro por días</Label>
              <Select value={selectedDays} onValueChange={setSelectedDays}>
                <SelectTrigger id="days-filter">
                  <SelectValue placeholder="Selecciona un período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los movimientos</SelectItem>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="15">Últimos 15 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="60">Últimos 60 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Printer className="h-4 w-4 mr-2" />
              Generar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs para crear/editar */}
      <FacturaFormDialog
        open={facturaFormOpen}
        onOpenChange={setFacturaFormOpen}
        factura={null}
        defaultClienteId={cuenta.cliente_id}
        onSuccess={() => {
          toast.success('Factura creada correctamente');
          refetchData();
        }}
      />

      <PagoFormDialog
        open={pagoFormOpen}
        onOpenChange={(open) => {
          setPagoFormOpen(open);
          if (!open) {
            setEditingPago(null);
            setSelectedFacturaId(null);
          }
        }}
        facturaId={selectedFacturaId || undefined}
        pago={editingPago}
        onSuccess={() => {
          toast.success(editingPago ? 'Pago actualizado' : 'Pago registrado correctamente');
          setEditingPago(null);
          setSelectedFacturaId(null);
          refetchData();
        }}
      />

      <NotaCreditoFormDialog
        open={ncFormOpen}
        onOpenChange={(open) => {
          setNcFormOpen(open);
          if (!open) {
            setEditingNC(null);
            setSelectedFacturaId(null);
          }
        }}
        facturaId={selectedFacturaId || undefined}
        notaCredito={editingNC}
        onSuccess={() => {
          toast.success(editingNC ? 'Nota de crédito actualizada' : 'Nota de crédito emitida');
          setEditingNC(null);
          setSelectedFacturaId(null);
          refetchData();
        }}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        title={`Exportar - ${clienteNombre}`}
        entityName="registros"
        data={movimientos}
        columns={exportColumnsMovimientos}
        filters={exportFilters}
        reportTypes={exportReportTypes}
        onExport={handleExportClient}
      />
    </Sheet>
  );
}
