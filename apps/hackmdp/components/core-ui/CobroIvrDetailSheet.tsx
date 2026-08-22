"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Banknote,
  FileText,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Hash,
  Building2,
  Trash2,
  Mail,
  FileSpreadsheet,
  ChevronDown,
  Loader2,
  ExternalLink,
  Receipt,
  MoreVertical,
  Eye,
  AlertTriangle,
  Download,
  Send,
  StickyNote,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { sheetClasses } from "@/lib/design-system";
import { cn, formatIvrNumber } from "@/lib/utils";
import useSWR from "swr";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Factura, Cliente, Pago } from "@/lib/types";
import { formatCurrency } from "@/lib/format-currency";
import { CobroIvrDialog } from "@/components/core-ui/CobroIvrDialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CobroIvr {
  id: string;
  ivr_id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  cuenta_bancaria_id?: string;
  cuenta_bancaria_nombre?: string;
  cuenta_bancaria_banco?: string;
  referencia_pago?: string;
  notas?: string;
  ivr_numero: string;
  ivr_total: number;
  ivr_estado: string;
  ivr_fecha?: string;
  cliente: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    identificador_unico?: number;
  };
  created_at: string;
}

interface CobroIvrDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cobro: CobroIvr | null;
  onRefresh?: () => void;
  onDelete?: (cobro: CobroIvr) => void;
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

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "cheque", label: "Cheque" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
];

const getMetodoLabel = (metodo: string) => {
  return METODOS_PAGO.find((m) => m.value === metodo)?.label || metodo || "Sin especificar";
};

export function CobroIvrDetailSheet({
  open,
  onOpenChange,
  cobro,
  onRefresh,
  onDelete,
}: CobroIvrDetailSheetProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reasignarOpen, setReasignarOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  // Fetch IVR completo para mostrar detalles
  const { data: ivr, isLoading: loadingIvr } = useSWR<Factura>(
    open && cobro?.ivr_id ? `/api/ivr/${cobro.ivr_id}` : null,
    fetcher
  );

  // Fetch cliente completo
  const { data: cliente, isLoading: loadingCliente } = useSWR<Cliente>(
    open && cobro?.cliente?.id ? `/api/clientes/${cobro.cliente.id}` : null,
    fetcher
  );

  // Otros cobros del mismo IVR
  const otrosCobros = useMemo(() => {
    if (!ivr?.pagos) return [];
    return ivr.pagos.filter((p: Pago) => p.id !== cobro?.id);
  }, [ivr?.pagos, cobro?.id]);

  // Obtener emails del cliente - MUST be before early return to maintain hook order
  const clienteEmails: string[] = useMemo(() => {
    if (!cliente?.email) return [];
    if (Array.isArray(cliente.email)) return cliente.email.filter(Boolean);
    return [cliente.email].filter(Boolean);
  }, [cliente?.email]);

  // Click outside handler para Excel menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
        setExcelMenuOpen(false);
      }
    };

    if (excelMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [excelMenuOpen]);

  if (!cobro) return null;

  const clienteNombre = cobro.cliente?.nombre_fantasia || cobro.cliente?.nombre || "Cliente";

  const handleDelete = async () => {
    if (!cobro) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cobros-ivr?id=${cobro.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      toast.success("Cobro eliminado correctamente");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      if (onDelete) onDelete(cobro);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSendEmail = async (emailDestino: string) => {
    if (!emailDestino) {
      toast.error("Email no válido");
      return;
    }

    setSendingEmail(true);
    const toastId = toast.loading(`Enviando comprobante a ${emailDestino}...`);
    try {
      const res = await fetch("/api/cobros-ivr/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cobro_id: cobro.id,
          email_destino: emailDestino,
        }),
      });

      // Parseo seguro: si el proxy devuelve body vacio no rompemos.
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Respuesta vacia del servidor" };
      }

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar email");
      }

      toast.success(`Comprobante enviado a ${emailDestino}`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Error al enviar email", { id: toastId });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Generando PDF...");
    try {
      const res = await fetch(`/api/cobros-ivr/pdf?id=${cobro.id}`);
      if (!res.ok) throw new Error("Error al generar PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Recibo_Cobro_${cobro.ivr_numero}_${format(new Date(cobro.fecha_pago), "dd-MM-yyyy")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF descargado", { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Error al descargar PDF", { id: toastId });
    }
  };

  const handleExportExcel = () => {
    const data = [{
      'Fecha de Cobro': formatDate(cobro.fecha_pago),
      'Cliente': clienteNombre,
      'ID Cliente': cobro.cliente?.identificador_unico || '-',
      'IVR': cobro.ivr_numero,
      'Monto Cobrado': cobro.monto,
      'Método de Pago': getMetodoLabel(cobro.metodo_pago),
      'Cuenta Destino': cobro.cuenta_bancaria_nombre ? `${cobro.cuenta_bancaria_banco} - ${cobro.cuenta_bancaria_nombre}` : '-',
      'Referencia': cobro.referencia_pago || '-',
      'Total IVR': cobro.ivr_total,
      'Estado IVR': cobro.ivr_estado,
    }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cobro');

    ws['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
    ];

    // formatIvrNumber: el nro ya puede traer el prefijo "IVR-" (no doblar).
    const filename = `Cobro_${formatIvrNumber(cobro.ivr_numero)}_${formatDate(cobro.fecha_pago).replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Excel exportado correctamente');
    setExcelMenuOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[85vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-green-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/10"
        side="bottom"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-4 pb-3 pr-14 border-b border-gray-200/50 dark:border-gray-800/30 shrink-0 bg-gradient-to-r from-green-50/30 to-transparent dark:from-gray-950/10 dark:to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Icon con acento verde */}
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 p-3 rounded-2xl border border-green-200/30 dark:border-green-800/30 shadow-sm shadow-green-500/10">
                <Banknote className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl bg-gradient-to-r from-green-900 to-green-700 dark:from-green-100 dark:to-green-300 bg-clip-text text-transparent">
                  {formatCurrency(cobro.monto)}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-gray-500 border-gray-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    IVR - Interno
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {cobro.ivr_numero}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDateLong(cobro.fecha_pago)}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {/* Email Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={sendingEmail || clienteEmails.length === 0}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
                      "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    title={clienteEmails.length === 0 ? "Cliente sin email" : "Enviar por email"}
                  >
                    {sendingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 text-blue-600" />
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {clienteEmails.map((email, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={() => handleSendEmail(email)}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                        <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Enviar a</p>
                        <p className="text-xs text-zinc-500 truncate max-w-[180px]">{email}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* PDF Download */}
              <Button
                type="default"
                size="tiny"
                onClick={handleDownloadPdf}
                icon={<Download className="text-red-600" />}
                className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Descargar PDF"
              />

              {/* Excel Menu */}
              <div ref={excelMenuRef} className="relative">
                <motion.button
                  type="button"
                  onClick={() => setExcelMenuOpen(!excelMenuOpen)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
                    excelMenuOpen
                      ? "bg-white dark:bg-zinc-900 border-green-300 dark:border-green-700 shadow-sm"
                      : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                  title="Exportar a Excel"
                  whileTap={{ scale: 0.98 }}
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <motion.span
                    animate={{ rotate: excelMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.span>
                </motion.button>

                <AnimatePresence>
                  {excelMenuOpen && (
                    <motion.div
                      className="absolute top-full right-0 mt-1 z-50 w-48 rounded-lg border bg-white dark:bg-zinc-900 border-green-300 dark:border-green-700 shadow-lg overflow-hidden"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <div className="p-2">
                        <motion.button
                          type="button"
                          onClick={handleExportExcel}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                            <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              Exportar Cobro
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Detalle completo
                            </p>
                          </div>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Editar */}
              <Button
                type="default"
                size="tiny"
                onClick={() => setEditOpen(true)}
                icon={<Pencil className="text-purple-600" />}
                className="border-zinc-200 dark:border-zinc-700 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-zinc-700 dark:text-zinc-300"
                title="Editar cobro"
              />

              {/* Reasignar a facturas */}
              <Button
                type="default"
                size="tiny"
                onClick={() => setReasignarOpen(true)}
                icon={<Pencil className="text-blue-600" />}
                className="border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-zinc-700 dark:text-zinc-300"
                title="Corregir a qué factura fue imputado este pago"
              />

              {/* Eliminar */}
              <Button
                type="default"
                size="tiny"
                onClick={() => setDeleteDialogOpen(true)}
                icon={<Trash2 className="text-red-500" />}
                className="border-zinc-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-700 dark:text-zinc-300"
                title="Eliminar cobro"
              />
            </div>
          </div>
        </SheetHeader>

        {/* Content con tabs */}
        <div className="flex-1 flex flex-col overflow-hidden mt-4 px-6 pb-6">
          <Tabs defaultValue="detalle" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className={cn(sheetClasses.tabsList, "grid-cols-3")}>
              <TabsTrigger value="detalle" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <Receipt className="w-4 h-4" />
                <span className="text-sm">Detalle</span>
              </TabsTrigger>
              <TabsTrigger value="ivr" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <FileText className="w-4 h-4" />
                <span className="text-sm">IVR</span>
              </TabsTrigger>
              <TabsTrigger value="cliente" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <User className="w-4 h-4" />
                <span className="text-sm">Cliente</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Detalle */}
            <TabsContent value="detalle" className="space-y-4 mt-0 p-4 overflow-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Monto grande */}
                <section className="p-6 border border-green-200/40 dark:border-green-800/30 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 shadow-sm text-center">
                  <p className="text-5xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(cobro.monto)}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    Cobrado el {formatDateLong(cobro.fecha_pago)}
                  </p>
                </section>

                {/* Detalles del cobro */}
                <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                  <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    Información del Cobro
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {format(new Date(cobro.fecha_pago), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Método
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {getMetodoLabel(cobro.metodo_pago)}
                      </Badge>
                    </div>

                    {cobro.cuenta_bancaria_nombre && (
                      <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Cuenta Destino
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {cobro.cuenta_bancaria_banco}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cobro.cuenta_bancaria_nombre}
                        </p>
                      </div>
                    )}

                    {cobro.referencia_pago && (
                      <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          Referencia
                        </p>
                        <p className="text-sm font-medium mt-1 font-mono">
                          {cobro.referencia_pago}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Notas del cobro */}
                {cobro.notas && (
                  <section className="space-y-3 p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-gradient-to-br from-white to-amber-50/20 dark:from-gray-900 dark:to-amber-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-amber-200/50 dark:border-amber-800/30 pb-2 text-amber-900 dark:text-amber-100">
                      <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Notas
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {cobro.notas}
                    </p>
                  </section>
                )}

                {/* Otros cobros del mismo IVR */}
                {otrosCobros.length > 0 && (
                  <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                      <Receipt className="h-4 w-4 text-gray-500" />
                      Otros Cobros del mismo IVR ({otrosCobros.length})
                    </h3>

                    <div className="space-y-2">
                      {otrosCobros.map((pago: Pago) => (
                        <div
                          key={pago.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                              <Banknote className="h-3 w-3 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-600">
                                {formatCurrency(pago.monto)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(pago.fecha_pago)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {getMetodoLabel(pago.metodo_pago || '')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            </TabsContent>

            {/* Tab IVR */}
            <TabsContent value="ivr" className="space-y-4 mt-0 p-4 overflow-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {loadingIvr ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : ivr ? (
                  <>
                    {/* Resumen del IVR */}
                    <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                        <FileText className="h-4 w-4 text-gray-500" />
                        Remito Interno - {cobro.ivr_numero}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                          <p className="text-xs text-gray-500">Total IVR</p>
                          <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-1">
                            {formatCurrency(ivr.total || 0)}
                          </p>
                        </div>

                        <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                          <p className="text-xs text-gray-500">Cobrado</p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                            {formatCurrency((ivr.total || 0) - (ivr.saldo_pendiente || 0))}
                          </p>
                        </div>

                        <div className={cn(
                          "border rounded-lg p-3",
                          (ivr.saldo_pendiente || 0) > 0
                            ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                        )}>
                          <p className="text-xs text-gray-500">Pendiente</p>
                          <p className={cn(
                            "text-xl font-bold mt-1",
                            (ivr.saldo_pendiente || 0) > 0 ? "text-orange-600" : "text-gray-600"
                          )}>
                            {formatCurrency(ivr.saldo_pendiente || 0)}
                          </p>
                        </div>

                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                          <p className="text-xs text-gray-500">Estado</p>
                          <Badge className={cn(
                            "mt-2",
                            ivr.estado === 'pagada'
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-yellow-100 text-yellow-700 border-yellow-200"
                          )}>
                            {ivr.estado === 'pagada' ? 'Cobrado' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    </section>

                    {/* Detalles del IVR */}
                    <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        Información del Remito
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Fecha de Emisión</p>
                          <p className="text-sm font-medium mt-1">
                            {formatDateLong(ivr.fecha_emision)}
                          </p>
                        </div>
                        {ivr.fecha_vencimiento && (
                          <div>
                            <p className="text-xs text-gray-500">Fecha de Vencimiento</p>
                            <p className="text-sm font-medium mt-1">
                              {formatDateLong(ivr.fecha_vencimiento)}
                            </p>
                          </div>
                        )}
                        {ivr.comentarios && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Observaciones</p>
                            <p className="text-sm mt-1">{ivr.comentarios?.map((c, i) => <span key={i}>{c.texto}{i < (ivr.comentarios?.length ?? 0) - 1 ? ', ' : ''}</span>)}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No se pudo cargar el IVR</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* Tab Cliente */}
            <TabsContent value="cliente" className="space-y-4 mt-0 p-4 overflow-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {loadingCliente ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : cliente ? (
                  <>
                    {/* Info del cliente */}
                    <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-3 rounded-xl border border-blue-200/30">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {cliente.nombre_fantasia || cliente.nombre}
                          </h3>
                          {cliente.nombre_fantasia && (
                            <p className="text-sm text-gray-500">{cliente.nombre}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {cliente.identificador_unico && (
                              <Badge variant="outline" className="font-mono text-xs">
                                #{cliente.identificador_unico}
                              </Badge>
                            )}
                            {cliente.cuit && (
                              <Badge variant="secondary" className="font-mono text-xs">
                                CUIT: {cliente.cuit}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Contacto */}
                    <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                        <Mail className="h-4 w-4 text-gray-500" />
                        Contacto
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        {clienteEmails.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm font-medium mt-1">
                              {clienteEmails.join(", ")}
                            </p>
                          </div>
                        )}
                        {cliente.telefono && (
                          <div>
                            <p className="text-xs text-gray-500">Teléfono</p>
                            <p className="text-sm font-medium mt-1">{cliente.telefono}</p>
                          </div>
                        )}
                        {cliente.direccion && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Dirección</p>
                            <p className="text-sm font-medium mt-1">{cliente.direccion}</p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Acciones rápidas */}
                    <section className="flex gap-2">
                      <Button
                        type="default"
                        size="small"
                        onClick={() => window.open(`/dashboard/clientes?id=${cliente.id}`, '_blank')}
                        icon={<ExternalLink className="h-4 w-4" />}
                      >
                        Ver Cliente
                      </Button>
                      <Button
                        type="default"
                        size="small"
                        onClick={() => window.open(`/dashboard/cuentas-corrientes-ivr?id=${cliente.id}`, '_blank')}
                        icon={<DollarSign className="h-4 w-4" />}
                      >
                        Cuenta Corriente IVR
                      </Button>
                    </section>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No se pudo cargar el cliente</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cobro</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar este cobro de {formatCurrency(cobro.monto)}?
              Esta acción actualizará el saldo del IVR {cobro.ivr_numero}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar cobro (revierte + re-imputa según el nuevo monto) */}
      <CobroIvrDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        clienteId={cobro.cliente?.id || ""}
        clienteNombre={clienteNombre}
        editCobro={{
          id: cobro.id,
          cliente_id: cobro.cliente?.id,
          monto: cobro.monto,
          fecha_pago: cobro.fecha_pago,
          metodo_pago: cobro.metodo_pago,
          notas: cobro.notas ?? null,
        }}
        onSuccess={() => {
          setEditOpen(false);
          onOpenChange(false);
          onRefresh?.();
        }}
      />

      {/* Reasignar a facturas */}
      <CobroIvrDialog
        open={reasignarOpen}
        onOpenChange={setReasignarOpen}
        clienteId={cobro.cliente?.id || ""}
        clienteNombre={clienteNombre}
        modoReasignar
        editCobro={{
          id: cobro.id,
          cliente_id: cobro.cliente?.id,
          monto: cobro.monto,
          fecha_pago: cobro.fecha_pago,
          metodo_pago: cobro.metodo_pago,
          notas: cobro.notas ?? null,
        }}
        onSuccess={() => {
          setReasignarOpen(false);
          onOpenChange(false);
          onRefresh?.();
        }}
      />
    </Sheet>
  );
}
