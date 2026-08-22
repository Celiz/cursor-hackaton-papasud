"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormatCurrency } from "@/lib/hooks/use-format-currency";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PagoFormDialog } from "@/components/core-ui/PagoFormDialog";
import { NotaCreditoFormDialog } from "@/components/core-ui/NotaCreditoFormDialog";
import { SendEmailDialog } from "@/components/core-ui/SendEmailDialog";
import { WhatsAppShareDialog } from "@/components/core-ui/WhatsAppShareDialog";
import { EmailTrackingBadge, EmailTrackingStatus } from "@/components/core-ui/EmailTrackingBadge";
import { useReactToPrint } from "react-to-print";
import { generateFacturaCompletaPDF } from "@/lib/pdf-generator";
import { useSession } from "@/lib/hooks/use-session";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Printer,
  FileText,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Receipt,
  AlertCircle,
  Plus,
  FileMinus,
  Package,
  Wrench,
  Mail,
  MessageSquare,
  Copy,
  Send,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Landmark,
  QrCode,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Factura } from "@/lib/types";
import { ShareToInternalChatButton } from './ShareToInternalChatButton';
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FacturaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factura: Factura;
  onRefresh?: () => void;
  onDuplicate?: (factura: Factura) => void;
  onEdit?: (factura: Factura) => void;
}

export function FacturaDetailSheet({
  open,
  onOpenChange,
  factura,
  onRefresh,
  onDuplicate,
  onEdit,
}: FacturaDetailSheetProps) {
  const formatCurrency = useFormatCurrency();
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const componentRef = useRef<HTMLDivElement>(null);
  const [pagoFormOpen, setPagoFormOpen] = useState(false);
  const [ncFormOpen, setNcFormOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [estadosDisponibles, setEstadosDisponibles] = useState<Array<{ value: string; label: string; color: string }>>([]);
  const [changingEstado, setChangingEstado] = useState(false);
  const [currentFactura, setCurrentFactura] = useState(factura);
  const [showAplicarSaldoDialog, setShowAplicarSaldoDialog] = useState(false);
  const [saldoClienteDisponible, setSaldoClienteDisponible] = useState(0);
  const [montoAplicar, setMontoAplicar] = useState("");
  const [aplicandoSaldo, setAplicandoSaldo] = useState(false);
  const [editingPago, setEditingPago] = useState<any>(null);
  const [editingNC, setEditingNC] = useState<any>(null);
  const [solicitandoCAE, setSolicitandoCAE] = useState(false);
  const [emailTracking, setEmailTracking] = useState<EmailTrackingStatus[]>([]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Factura_${factura?.id?.slice(0, 8) || ""}`,
  });

  const handleExportPDF = async () => {
    try {
      const doc = await generateFacturaCompletaPDF(factura, orgId);
      doc.save(`factura-${factura.tipo_factura}-${factura.id.slice(0, 8)}.pdf`);
      toast.success('PDF generado exitosamente');
    } catch (error) {
      toast.error('Error al generar PDF');
      console.error(error);
    }
  };

  const handleRegistrarPago = () => {
    setPagoFormOpen(true);
  };

  const handleEmitirNC = () => {
    setNcFormOpen(true);
  };

  const handleEstadoChange = async (newEstado: string) => {
    setChangingEstado(true);
    try {
      const response = await fetch(`/api/facturas/${factura.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newEstado }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }

      const updatedFactura = await response.json();
      setCurrentFactura(updatedFactura);

      toast.success('Estado actualizado correctamente');
      if (onRefresh) {
        onRefresh();
      }
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar estado');
    } finally {
      setChangingEstado(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(factura);
      onOpenChange(false);
    } else {
      // Fallback to URL-based approach
      router.push(`/dashboard/facturas?edit=${factura.id}`);
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/facturas/${factura.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la factura');
      }

      toast.success('Factura eliminada correctamente');
      setShowDeleteDialog(false);
      onOpenChange(false);
      if (onRefresh) {
        onRefresh();
      }
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la factura');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendEmail = async (data: { to: string[]; subject: string; body: string }) => {
    try {
      // Generate PDF
      const doc = await generateFacturaCompletaPDF(factura, orgId);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // Create tracking record first
      const trackingRes = await fetch('/api/email-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_email: 'factura',
          factura_id: factura.id,
          cliente_id: factura.cliente_id,
          destinatarios: data.to,
          asunto: data.subject,
        }),
      });

      // Send email
      const response = await fetch('/api/org-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.to,
          subject: data.subject,
          body: data.body,
          attachmentBase64: pdfBase64,
          attachmentName: `factura-${factura.tipo_factura}-${factura.id.slice(0, 8)}.pdf`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar email');
      }

      // Refresh tracking after sending
      fetch(`/api/email-tracking?factura_id=${factura.id}`)
        .then(res => res.json())
        .then(trackingData => {
          if (Array.isArray(trackingData)) {
            setEmailTracking(trackingData);
          }
        })
        .catch(console.error);
    } catch (error: any) {
      throw error;
    }
  };

  // Sync currentFactura with factura prop
  useEffect(() => {
    setCurrentFactura(factura);
  }, [factura]);

  // Fetch email tracking para esta factura
  useEffect(() => {
    if (open && factura?.id) {
      fetch(`/api/email-tracking?factura_id=${factura.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEmailTracking(data);
          }
        })
        .catch(console.error);
    }
  }, [open, factura?.id]);

  // Fetch estados disponibles
  useEffect(() => {
    if (open) {
      fetch('/api/configuracion-estados?tipo=factura')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEstadosDisponibles(data);
          }
        })
        .catch(err => console.error("Error loading estados:", err));
    }
  }, [open]);

  // Fetch saldo a favor del cliente
  useEffect(() => {
    if (open && factura.cliente_id) {
      fetch(`/api/clientes/${factura.cliente_id}`)
        .then(res => res.json())
        .then(data => {
          setSaldoClienteDisponible(Number(data.saldo_a_favor) || 0);
        })
        .catch(err => console.error("Error loading cliente:", err));
    }
  }, [open, factura.cliente_id]);

  // Reset monto a aplicar when dialog opens
  useEffect(() => {
    if (showAplicarSaldoDialog) {
      const maxAplicable = Math.min(saldoClienteDisponible, factura.saldo_pendiente || 0);
      setMontoAplicar(maxAplicable.toString());
    }
  }, [showAplicarSaldoDialog, saldoClienteDisponible, factura.saldo_pendiente]);

  const handleSolicitarCAE = async () => {
    setSolicitandoCAE(true);
    try {
      const response = await fetch('/api/arca/facturar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura_id: factura.id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Si es error temporal (ARCA caído), mostrar mensaje especial
        if (result.es_temporal) {
          toast.warning(result.mensaje_usuario || 'ARCA no está disponible. Intente más tarde.');
        } else if (result.errores && result.errores.length > 0) {
          // Mostrar errores de ARCA
          const errorMsgs = result.errores.map((e: any) => e.descripcion || e.msg).join('. ');
          toast.error(`Error ARCA: ${errorMsgs}`);
        } else {
          throw new Error(result.error || 'Error al solicitar CAE');
        }
        // Refrescar para mostrar el estado actualizado
        if (onRefresh) {
          onRefresh();
        }
        return;
      }

      toast.success(`CAE obtenido: ${result.cae}`);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al solicitar CAE');
    } finally {
      setSolicitandoCAE(false);
    }
  };

  const handleAplicarSaldo = async () => {
    const monto = parseFloat(montoAplicar);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    if (monto > saldoClienteDisponible) {
      toast.error("El monto excede el saldo disponible del cliente");
      return;
    }

    if (monto > (factura.saldo_pendiente || 0)) {
      toast.error("El monto excede el saldo pendiente de la factura");
      return;
    }

    setAplicandoSaldo(true);
    try {
      // 1. Registrar el pago con el saldo a favor
      const pagoRes = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factura_id: factura.id,
          monto: monto,
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: 'saldo_a_favor',
          comentarios: [{
            texto: `Aplicación de saldo a favor del cliente`,
            fecha: new Date().toISOString()
          }],
        }),
      });

      if (!pagoRes.ok) {
        throw new Error('Error al registrar el pago');
      }

      // 2. Descontar el saldo del cliente
      const nuevoSaldo = saldoClienteDisponible - monto;
      const clienteRes = await fetch(`/api/clientes/${factura.cliente_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldo_a_favor: nuevoSaldo }),
      });

      if (!clienteRes.ok) {
        throw new Error('Error al actualizar saldo del cliente');
      }

      toast.success(`Saldo a favor aplicado: ${formatCurrency(monto)}`);
      setSaldoClienteDisponible(nuevoSaldo);
      setShowAplicarSaldoDialog(false);

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al aplicar saldo');
    } finally {
      setAplicandoSaldo(false);
    }
  };

  if (!factura) return null;

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "pagada":
        return "default";
      case "pendiente":
        return "secondary";
      case "vencida":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const clienteNombre =
    factura.clientes?.nombre_fantasia || factura.clientes?.nombre || "Cliente no especificado";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-amber-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-amber-950/10"
        side="bottom"
      >
        {/* Header compacto */}
        <SheetHeader className="px-6 pt-4 pb-3 pr-14 border-b border-amber-200/50 dark:border-amber-800/30 shrink-0 bg-gradient-to-r from-amber-50/30 to-transparent dark:from-amber-950/10 dark:to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Icon con acento */}
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 p-3 rounded-2xl border border-amber-200/30 dark:border-amber-800/30 shadow-sm shadow-amber-500/10">
                <FileText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl bg-gradient-to-r from-amber-900 to-amber-700 dark:from-amber-100 dark:to-amber-300 bg-clip-text text-transparent">
                  Factura {factura.tipo_factura || "IVR"}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    #{factura.id?.slice(0, 8).toUpperCase() || "-"}
                  </span>
                  <Select
                    value={currentFactura.estado}
                    onValueChange={handleEstadoChange}
                    disabled={changingEstado}
                  >
                    <SelectTrigger className="w-[140px] h-6 text-xs border-gray-300 dark:border-gray-700">
                      <div className="flex items-center gap-1.5">
                        {estadosDisponibles.find(e => e.value === currentFactura.estado) && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: estadosDisponibles.find(e => e.value === currentFactura.estado)?.color }}
                          />
                        )}
                        <SelectValue placeholder="Estado" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {estadosDisponibles.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value} className="text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: estado.color }}
                            />
                            {estado.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <EmailTrackingBadge tracking={emailTracking} />
                </div>
              </div>
            </div>

            {/* Botones de acción compactos */}
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {currentFactura.estado !== 'pagada' && currentFactura.saldo_pendiente && currentFactura.saldo_pendiente > 0 && (
                <>
                  <Button
                    type="primary"
                    size="tiny"
                    onClick={handleRegistrarPago}
                    icon={<Plus />}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                  >
                    Pago
                  </Button>
                  {saldoClienteDisponible > 0 && (
                    <Button
                      type="default"
                      size="tiny"
                      onClick={() => setShowAplicarSaldoDialog(true)}
                      icon={<Wallet />}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    >
                      Aplicar Saldo
                    </Button>
                  )}
                  <Button
                    type="default"
                    size="tiny"
                    onClick={handleEmitirNC}
                    icon={<FileMinus />}
                  >
                    NC
                  </Button>
                </>
              )}
              {onDuplicate && (
                <Button
                  type="default"
                  size="tiny"
                  onClick={() => {
                    onDuplicate(factura);
                    onOpenChange(false);
                  }}
                  icon={<Copy />}
                  title="Duplicar factura"
                />
              )}
              <Button
                type="default"
                size="tiny"
                onClick={handleExportPDF}
                icon={<FileText />}
                title="Descargar PDF"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="default"
                    size="tiny"
                    icon={<Send />}
                    title="Enviar"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setWhatsappDialogOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ShareToInternalChatButton
                entity={{
                  type: 'factura',
                  id: factura.id,
                  label: factura.clientes?.nombre || 'Sin cliente',
                  number: factura.numero || factura.id.slice(0, 8),
                  amount: factura.total,
                  link: `/dashboard/facturas?id=${factura.id}`,
                }}
              />
              <Button
                type="default"
                size="tiny"
                onClick={handlePrint}
                icon={<Printer />}
                title="Imprimir"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="default"
                    size="tiny"
                    icon={<MoreVertical />}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetHeader>

        {/* Content compacto */}
        <ScrollArea className="flex-1 mt-4">
          <div className="px-6 pb-6">
            <div ref={componentRef} className="space-y-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className={cn(sheetClasses.tabsList, "grid-cols-4")}>
                  <TabsTrigger value="general" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">General</span>
                  </TabsTrigger>
                  <TabsTrigger value="items" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <Package className="w-4 h-4" />
                    <span className="text-sm">Items</span>
                  </TabsTrigger>
                  <TabsTrigger value="pagos" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Pagos</span>
                  </TabsTrigger>
                  <TabsTrigger value="notas" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <FileMinus className="w-4 h-4" />
                    <span className="text-sm">Notas de Crédito</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab General */}
                <TabsContent value="general" className="space-y-4 mt-0 p-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                  {/* Información del Cliente */}
                  <section className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-900 dark:to-blue-950/10 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-blue-200/50 dark:border-blue-800/30 pb-2 text-blue-900 dark:text-blue-100">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Información del Cliente
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Cliente</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {clienteNombre}
                        </p>
                      </div>
                      {factura.clientes?.identificador_unico && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">ID Cliente</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {factura.clientes.identificador_unico}
                          </p>
                        </div>
                      )}
                      {factura.clientes?.cuit && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">CUIT</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {factura.clientes.cuit}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Información de la Factura */}
                  <section className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm hover:shadow-md hover:shadow-purple-500/10 transition-all">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-purple-200/50 dark:border-purple-800/30 pb-2 text-purple-900 dark:text-purple-100">
                      <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      Datos de la Factura
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Tipo</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {factura.tipo_factura}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Fecha de Emisión</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                          {formatDate(factura.fecha_emision)}
                        </p>
                      </div>
                      {factura.fecha_vencimiento && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Vencimiento</p>
                          <p className={`text-sm font-medium mt-0.5 ${
                            new Date(factura.fecha_vencimiento) < new Date() && factura.estado !== 'pagada'
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {formatDate(factura.fecha_vencimiento)}
                            {new Date(factura.fecha_vencimiento) < new Date() && factura.estado !== 'pagada' && (
                              <span className="ml-1 text-xs">(Vencida)</span>
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Estado</p>
                        <Badge variant={getEstadoBadgeVariant(factura.estado)} className="h-5 text-xs mt-0.5">
                          {factura.estado}
                        </Badge>
                      </div>
                    </div>
                  </section>

                  {/* Sección ARCA / CAE */}
                  {factura.tipo_factura && factura.tipo_factura !== 'IVR' && (
                  <section className="space-y-3 p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-gradient-to-br from-white to-amber-50/20 dark:from-gray-900 dark:to-amber-950/10 shadow-sm hover:shadow-md hover:shadow-amber-500/10 transition-all">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-amber-200/50 dark:border-amber-800/30 pb-2 text-amber-900 dark:text-amber-100">
                      <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      ARCA (Facturación Electrónica)
                    </h3>

                    {(factura as any).cae ? (
                      /* Factura con CAE */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                              <p className="text-xs text-gray-600 dark:text-gray-400">CAE</p>
                            </div>
                            <p className="text-sm font-mono font-bold text-green-700 dark:text-green-400 mt-1">
                              {(factura as any).cae}
                            </p>
                          </div>
                          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-950">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Vencimiento CAE</p>
                            <p className={cn(
                              "text-sm font-medium mt-1",
                              (factura as any).cae_vto && new Date((factura as any).cae_vto) < new Date()
                                ? "text-red-600"
                                : "text-gray-900 dark:text-gray-100"
                            )}>
                              {(factura as any).cae_vto ? formatDate((factura as any).cae_vto) : '-'}
                            </p>
                          </div>
                        </div>

                        {/* QR y verificación */}
                        <div className="flex items-center justify-between pt-2 border-t border-amber-100 dark:border-amber-900/30">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Autorizada
                            </Badge>
                            {(factura as any).afip_resultado && (
                              <span className="text-xs text-gray-500">
                                Resultado: {typeof (factura as any).afip_resultado === 'object'
                                  ? (factura as any).afip_resultado.resultado || 'A'
                                  : (factura as any).afip_resultado}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(factura as any).qr_data && (
                              <Button
                                type="default"
                                size="tiny"
                                icon={<QrCode />}
                                onClick={() => {
                                  // TODO: Mostrar modal con QR
                                  toast.info('QR disponible para impresión');
                                }}
                              >
                                QR
                              </Button>
                            )}
                            <Button
                              type="default"
                              size="tiny"
                              icon={<ExternalLink />}
                              onClick={() => {
                                window.open('https://www.afip.gob.ar/fe/qr/', '_blank');
                              }}
                            >
                              Verificar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Factura sin CAE */
                      <div className="space-y-3">
                        {/* Estado actual de la factura */}
                        {(() => {
                          const afipStatus = (factura as any).afip_status;
                          const statusConfig = {
                            'procesando': {
                              icon: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
                              text: 'Procesando solicitud de CAE...',
                              bgClass: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20',
                              textClass: 'text-blue-700 dark:text-blue-400',
                              showButton: false,
                            },
                            'pendiente_reintento': {
                              icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
                              text: 'ARCA no disponible - Pendiente de reintento',
                              bgClass: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20',
                              textClass: 'text-amber-700 dark:text-amber-400',
                              showButton: true,
                            },
                            'error': {
                              icon: <XCircle className="h-4 w-4 text-red-600" />,
                              text: 'Error al solicitar CAE',
                              bgClass: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20',
                              textClass: 'text-red-700 dark:text-red-400',
                              showButton: true,
                            },
                            'pendiente': {
                              icon: <Clock className="h-4 w-4 text-orange-600" />,
                              text: 'Pendiente de autorización ARCA',
                              bgClass: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20',
                              textClass: 'text-orange-700 dark:text-orange-400',
                              showButton: true,
                            },
                          };
                          const config = statusConfig[afipStatus as keyof typeof statusConfig] || statusConfig['pendiente'];

                          return (
                            <div className={cn("flex items-center justify-between p-3 border rounded-lg", config.bgClass)}>
                              <div className="flex items-center gap-2">
                                {config.icon}
                                <span className={cn("text-sm", config.textClass)}>
                                  {config.text}
                                </span>
                              </div>
                              {config.showButton && (
                                <Button
                                  type="primary"
                                  size="tiny"
                                  onClick={handleSolicitarCAE}
                                  disabled={solicitandoCAE}
                                  className="bg-amber-600 hover:bg-amber-700"
                                >
                                  {solicitandoCAE ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      Solicitando...
                                    </>
                                  ) : (
                                    <>
                                      <Landmark className="h-4 w-4 mr-1" />
                                      {afipStatus === 'pendiente_reintento' ? 'Reintentar' : 'Solicitar CAE'}
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Errores previos */}
                        {(factura as any).afip_errores && Array.isArray((factura as any).afip_errores) && (factura as any).afip_errores.length > 0 && (
                          <div className="p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-xs font-medium text-red-700">
                                {(factura as any).afip_errores[0]?.es_temporal ? 'Error temporal:' : 'Errores anteriores:'}
                              </span>
                            </div>
                            <ul className="text-xs text-red-600 space-y-1">
                              {(factura as any).afip_errores.map((err: any, i: number) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-red-400">•</span>
                                  <span>{err.descripcion || err.msg || err.code || JSON.stringify(err)}</span>
                                  {err.fecha && (
                                    <span className="text-red-400 text-[10px] ml-auto">
                                      {new Date(err.fecha).toLocaleString('es-AR')}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Observaciones de ARCA */}
                        {(factura as any).afip_observaciones && Array.isArray((factura as any).afip_observaciones) && (factura as any).afip_observaciones.length > 0 && (
                          <div className="p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <span className="text-xs font-medium text-yellow-700">Observaciones de ARCA:</span>
                            </div>
                            <ul className="text-xs text-yellow-600 space-y-1">
                              {(factura as any).afip_observaciones.map((obs: any, i: number) => (
                                <li key={i}>{obs.msg || obs.code || JSON.stringify(obs)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                  )}

                  {/* Resumen Financiero */}
                  <section className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/10 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transition-all">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2 text-emerald-900 dark:text-emerald-100">
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Resumen Financiero
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-950">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Factura</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {formatCurrency(factura.total)}
                        </p>
                      </div>

                      {factura.total_pagado !== undefined && (
                        <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Total Pagado</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            {formatCurrency(factura.total_pagado)}
                          </p>
                        </div>
                      )}

                      {factura.total_notas_credito !== undefined && factura.total_notas_credito > 0 && (
                        <div className="border border-orange-200 dark:border-orange-900/50 rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Notas de Crédito</p>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1">
                            {formatCurrency(factura.total_notas_credito)}
                          </p>
                        </div>
                      )}

                      {factura.saldo_pendiente !== undefined && (
                        <div className={cn(
                          "border rounded-lg p-3",
                          factura.saldo_pendiente === 0
                            ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20"
                            : factura.estado === "vencida"
                            ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20"
                            : "border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20"
                        )}>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Saldo Pendiente</p>
                          <p className={cn(
                            "text-lg font-bold mt-1",
                            factura.saldo_pendiente === 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : factura.estado === "vencida"
                              ? "text-red-600 dark:text-red-400"
                              : "text-orange-600 dark:text-orange-400"
                          )}>
                            {formatCurrency(factura.saldo_pendiente)}
                          </p>
                        </div>
                      )}

                      {(factura as any).saldo_a_favor !== undefined && (factura as any).saldo_a_favor > 0 && (
                        <div className="border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Saldo a Favor del Cliente</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {formatCurrency((factura as any).saldo_a_favor)}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Comentarios */}
                  {factura.comentarios && Array.isArray(factura.comentarios) && factura.comentarios.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-800">
                        Comentarios
                      </h3>
                      <div className="space-y-2">
                        {factura.comentarios.map((comentario: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-950">
                            <p className="text-xs text-gray-900 dark:text-gray-100">
                              {comentario.texto || comentario}
                            </p>
                            {comentario.fecha && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {formatDate(comentario.fecha)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  </motion.div>
                </TabsContent>

                {/* Tab Items */}
                <TabsContent value="items" className="space-y-4 mt-0 p-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                  {factura.facturas_items && factura.facturas_items.length > 0 ? (
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                      {factura.facturas_items.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2 bg-white dark:bg-gray-900"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div className={cn(
                                "p-1.5 rounded-md flex-shrink-0",
                                item.servicio_id
                                  ? "bg-blue-500/10 dark:bg-blue-500/20"
                                  : "bg-purple-500/10 dark:bg-purple-500/20"
                              )}>
                                {item.servicio_id ? (
                                  <Wrench className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Package className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {item.descripcion}
                                </p>
                                <div className="flex gap-1.5 mt-1">
                                  {item.servicio_id && (
                                    <Badge variant="outline" className="h-5 text-xs">
                                      Servicio
                                    </Badge>
                                  )}
                                  {item.producto_id && (
                                    <Badge variant="outline" className="h-5 text-xs">
                                      Producto
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(item.subtotal)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Cantidad:</span>
                              <span className="ml-1.5 font-medium text-gray-900 dark:text-gray-100">
                                {item.cantidad}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Precio Unit.:</span>
                              <span className="ml-1.5 font-medium text-gray-900 dark:text-gray-100">
                                {formatCurrency(item.precio_unitario)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      </AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: factura.facturas_items.length * 0.03 + 0.1 }}
                        className="border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total Items:
                          </span>
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(
                              factura.facturas_items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
                            )}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay items facturados</p>
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
                  {factura.pagos && factura.pagos.length > 0 ? (
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                      {factura.pagos.map((pago, index) => (
                        <motion.div
                          key={pago.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2 bg-white dark:bg-gray-900"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20">
                                <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(pago.monto)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="h-5 text-xs">
                                {pago.metodo_pago || "Sin especificar"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="default" size="tiny" icon={<MoreVertical />} className="h-6 w-6 p-0" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingPago(pago);
                                    setPagoFormOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      if (!confirm('¿Eliminar este pago?')) return;
                                      try {
                                        const res = await fetch(`/api/pagos?id=${pago.id}`, { method: 'DELETE' });
                                        if (!res.ok) throw new Error('Error al eliminar');
                                        toast.success('Pago eliminado');
                                        if (onRefresh) onRefresh();
                                      } catch (e: any) {
                                        toast.error(e.message || 'Error al eliminar pago');
                                      }
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {formatDate(pago.fecha_pago)}
                          </div>
                          {pago.recibo_url && (
                            <a
                              href={pago.recibo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 dark:text-purple-400 hover:underline inline-block"
                            >
                              Ver recibo
                            </a>
                          )}
                        </motion.div>
                      ))}
                      </AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (factura.pagos?.length || 0) * 0.03 + 0.1 }}
                        className="border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total Pagado:
                          </span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(factura.total_pagado || 0)}
                          </span>
                        </div>
                      </motion.div>
                      {(factura as any).saldo_a_favor !== undefined && (factura as any).saldo_a_favor > 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: (factura.pagos?.length || 0) * 0.03 + 0.15 }}
                          className="border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Saldo a Favor del Cliente:
                            </span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency((factura as any).saldo_a_favor)}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
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
                  {factura.notas_credito && factura.notas_credito.length > 0 ? (
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                      {factura.notas_credito.map((nc, index) => (
                        <motion.div
                          key={nc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2 bg-white dark:bg-gray-900"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md bg-orange-500/10 dark:bg-orange-500/20">
                                <Receipt className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(nc.monto)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="h-5 text-xs">
                                Nota de Crédito
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="default" size="tiny" icon={<MoreVertical />} className="h-6 w-6 p-0" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingNC(nc);
                                    setNcFormOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      if (!confirm('¿Eliminar esta nota de crédito?')) return;
                                      try {
                                        const res = await fetch(`/api/notas-credito?id=${nc.id}`, { method: 'DELETE' });
                                        if (!res.ok) throw new Error('Error al eliminar');
                                        toast.success('Nota de crédito eliminada');
                                        if (onRefresh) onRefresh();
                                      } catch (e: any) {
                                        toast.error(e.message || 'Error al eliminar nota de crédito');
                                      }
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {nc.motivo && (
                            <div className="text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Motivo: </span>
                              <span className="text-gray-900 dark:text-gray-100">{nc.motivo}</span>
                            </div>
                          )}
                          {nc.comentarios && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {nc.comentarios}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      </AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (factura.notas_credito?.length || 0) * 0.03 + 0.1 }}
                        className="border border-orange-200 dark:border-orange-900/50 rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total Notas de Crédito:
                          </span>
                          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(factura.total_notas_credito || 0)}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay notas de crédito</p>
                    </div>
                  )}
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>

      <PagoFormDialog
        open={pagoFormOpen}
        onOpenChange={(open) => {
          setPagoFormOpen(open);
          if (!open) setEditingPago(null);
        }}
        facturaId={factura.id}
        pago={editingPago}
        onSuccess={() => {
          setPagoFormOpen(false);
          setEditingPago(null);
          if (onRefresh) {
            onRefresh();
          }
        }}
      />

      <NotaCreditoFormDialog
        open={ncFormOpen}
        onOpenChange={(open) => {
          setNcFormOpen(open);
          if (!open) setEditingNC(null);
        }}
        facturaId={factura.id}
        notaCredito={editingNC}
        onSuccess={() => {
          setNcFormOpen(false);
          setEditingNC(null);
          if (onRefresh) {
            onRefresh();
          }
        }}
      />

      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        defaultTo={factura.clientes?.email || []}
        defaultSubject={`Factura ${factura.tipo_factura} - ${factura.id.slice(0, 8)}`}
        defaultBody={`Estimado/a,\n\nAdjunto encontrará la factura ${factura.tipo_factura} correspondiente.\n\nSaludos cordiales.`}
        attachmentName={`factura-${factura.tipo_factura}-${factura.id.slice(0, 8)}.pdf`}
        onSend={handleSendEmail}
      />

      <WhatsAppShareDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        defaultPhone={factura.clientes?.telefono?.[0] || ""}
        defaultMessage={`Hola! Le enviamos la factura ${factura.tipo_factura} por un total de $${factura.total?.toFixed(2)}. Puede descargarla desde el link adjunto.\n\nGracias por su confianza!`}
        documentType="factura"
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {(factura as any).cae ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/30">
                      <ShieldCheck className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">
                        Esta factura tiene CAE asignado
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Las facturas autorizadas por ARCA son comprobantes fiscales válidos y no pueden eliminarse.
                      Para anular esta factura, debe emitir una <strong>Nota de Crédito</strong>.
                    </p>
                  </div>
                ) : (
                  <span>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la factura {factura.tipo_factura} #{factura.id?.slice(0, 8)}.
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            {(factura as any).cae ? (
              <Button
                type="primary"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setNcFormOpen(true);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <FileMinus className="h-4 w-4 mr-2" />
                Emitir Nota de Crédito
              </Button>
            ) : (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
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
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para aplicar saldo a favor */}
      <AlertDialog open={showAplicarSaldoDialog} onOpenChange={setShowAplicarSaldoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              Aplicar Saldo a Favor
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  El cliente tiene un saldo a favor disponible que puede aplicarse a esta factura.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Saldo Disponible</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(saldoClienteDisponible)}
                    </p>
                  </div>
                  <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-3 bg-orange-50 dark:bg-orange-950/30">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Saldo Pendiente Factura</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(factura.saldo_pendiente || 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="monto_aplicar" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Monto a aplicar
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="monto_aplicar"
                      type="number"
                      step="0.01"
                      min="0"
                      max={Math.min(saldoClienteDisponible, factura.saldo_pendiente || 0)}
                      value={montoAplicar}
                      onChange={(e) => setMontoAplicar(e.target.value)}
                      className="flex-1"
                      placeholder="0.00"
                    />
                    <Button
                      type="default"
                      size="small"
                      onClick={() => {
                        const max = Math.min(saldoClienteDisponible, factura.saldo_pendiente || 0);
                        setMontoAplicar(max.toString());
                      }}
                    >
                      Máximo
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Máximo aplicable: {formatCurrency(Math.min(saldoClienteDisponible, factura.saldo_pendiente || 0))}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aplicandoSaldo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAplicarSaldo}
              disabled={aplicandoSaldo || !montoAplicar || parseFloat(montoAplicar) <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {aplicandoSaldo ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Aplicar {montoAplicar ? formatCurrency(parseFloat(montoAplicar) || 0) : ""}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
