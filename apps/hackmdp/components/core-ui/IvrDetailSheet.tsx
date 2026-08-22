"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormatCurrency } from "@/lib/hooks/use-format-currency";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PagoFormDialog } from "@/components/core-ui/PagoFormDialog";
import { ElegirCobroReasignarDialog } from "@/components/core-ui/ElegirCobroReasignarDialog";
import { ExpandableEmailButton } from "@/components/core-ui/ExpandableEmailButton";
import { SendEmailDialog } from "@/components/core-ui/SendEmailDialog";
import { ExpandableDownloadButton } from "@/components/core-ui/ExpandableDownloadButton";
import { ExpandableDuplicateButton, ExpandableDeleteButton } from "@/components/core-ui/ExpandableConfirmButton";
import { ShareToInternalChatButton } from './ShareToInternalChatButton';
import { EmailTrackingBadge, EmailTrackingStatus } from "@/components/core-ui/EmailTrackingBadge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  FileText,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Package,
  Pencil,
  Loader2,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import { generateIVRPDF } from "@/lib/pdf-generator";
import { useSession } from "@/lib/hooks/use-session";
import { Factura } from "@/lib/types";
import { sheetClasses } from "@/lib/design-system";
import { cn, formatIvrNumber } from "@/lib/utils";

interface IvrDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ivr: Factura;
  onRefresh?: () => void;
  onDuplicate?: (ivr: Factura) => void;
  onEdit?: (ivr: Factura) => void;
  defaultTab?: string;
}

export function IvrDetailSheet({
  open,
  onOpenChange,
  ivr,
  onRefresh,
  onDuplicate,
  onEdit,
  defaultTab,
}: IvrDetailSheetProps) {
  const formatCurrency = useFormatCurrency();
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const [pagoFormOpen, setPagoFormOpen] = useState(false);
  // "Registrar y enviar": cobro recién creado para abrir el SendEmailDialog.
  const [sendCobroOpen, setSendCobroOpen] = useState(false);
  const [cobroAEnviar, setCobroAEnviar] = useState<any>(null);
  const [changingEstado, setChangingEstado] = useState(false);
  const [currentIvr, setCurrentIvr] = useState(ivr);
  // "Corregir imputación": elegir un cobro mal imputado del cliente y
  // reasignarlo (entrada desde el IVR pendiente, vía CobroIvrDialog en modo reasignar).
  const [corregirOpen, setCorregirOpen] = useState(false);
  const [editingPago, setEditingPago] = useState<any>(null);
  const [emailTracking, setEmailTracking] = useState<EmailTrackingStatus[]>([]);
  const [activeTab, setActiveTab] = useState(defaultTab || "general");

  // Reset tab when defaultTab changes (e.g. opening from Cobros tab)
  useEffect(() => {
    if (open) setActiveTab(defaultTab || "general");
  }, [open, defaultTab]);

  // Obtener emails del cliente como array
  const clienteEmails: string[] = React.useMemo(() => {
    const email = ivr.clientes?.email;
    if (!email) return [];
    if (Array.isArray(email)) return email.filter(Boolean);
    return [email].filter(Boolean);
  }, [ivr.clientes?.email]);

  const handleRegistrarPago = () => {
    setPagoFormOpen(true);
  };

  // Destinatarios/asunto/cuerpo/PDF para el SendEmailDialog del recibo, igual
  // que en CuentaCorrienteIvrDetailSheet.
  const sendCobroDefaults = React.useMemo(() => {
    if (!cobroAEnviar) return { to: [] as string[], subject: '', body: '', filename: '' };
    const nombre = ivr.clientes?.nombre_fantasia || ivr.clientes?.nombre || '';
    const numero = cobroAEnviar.nro_pago || cobroAEnviar.id?.slice(0, 8) || '';
    const monto = formatCurrency(cobroAEnviar.monto || 0);
    return {
      to: clienteEmails,
      subject: `Comprobante de cobro ${numero} — Uno Electromedicina`,
      body: `Estimado/a ${nombre},\n\nAdjuntamos el comprobante de cobro por ${monto}.\n\nMuchas gracias.\n\n— Uno Electromedicina`,
      filename: `cobro-${numero}.pdf`,
    };
  }, [cobroAEnviar, clienteEmails, ivr.clientes?.nombre_fantasia, ivr.clientes?.nombre, formatCurrency]);

  const handleExportPDF = async () => {
    try {
      const doc = await generateIVRPDF(ivr, orgId);
      doc.save(`${formatIvrNumber(ivr.nro_factura || ivr.id.slice(0, 8))}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (error) {
      toast.error('Error al generar PDF');
      console.error(error);
    }
  };

  // Envío de email: se cierra el sheet ya y el envío sigue en background con
  // el toast. Así no queda bloqueado mientras manda el mail.
  const handleSendEmail = async (email: string) => {
    const ivrId = ivr.id;
    onOpenChange(false);
    const toastId = toast.loading(`Enviando remito a ${email}...`);
    try {
      const res = await fetch('/api/ivr/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ivr_id: ivrId, email_destino: email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar');
      }
      toast.success('Remito enviado correctamente', {
        id: toastId,
        description: `Email enviado a ${email}`,
      });
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar email', { id: toastId });
    }
  };

  const handleSendEmailMultiple = async (emails: string[]) => {
    const ivrId = ivr.id;
    onOpenChange(false);
    const toastId = toast.loading(`Enviando remito a ${emails.length} destinatarios...`);
    try {
      const res = await fetch('/api/ivr/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ivr_id: ivrId, emails_destino: emails }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar');
      }
      toast.success('Remito enviado correctamente', {
        id: toastId,
        description: `Email enviado a ${emails.length} destinatarios`,
      });
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar email', { id: toastId });
    }
  };

  const handleEstadoChange = async (newEstado: string) => {
    setChangingEstado(true);
    try {
      const response = await fetch(`/api/ivr`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ivr.id,
          cliente_id: ivr.cliente_id,
          fecha_emision: ivr.fecha_emision,
          total: ivr.total,
          estado: newEstado,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }

      const updatedIvr = await response.json();
      setCurrentIvr(updatedIvr);

      toast.success('Estado actualizado correctamente');
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar estado');
    } finally {
      setChangingEstado(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(ivr);
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    const response = await fetch(`/api/ivr?id=${ivr.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Error al eliminar el remito');
    }

    toast.success('Remito eliminado correctamente');
    onOpenChange(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  useEffect(() => {
    setCurrentIvr(ivr);
  }, [ivr]);

  // Cargar tracking de emails cuando se abre el sheet
  useEffect(() => {
    if (open && ivr?.id) {
      fetch(`/api/email-tracking?factura_id=${ivr.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEmailTracking(data);
          }
        })
        .catch(console.error);
    }
  }, [open, ivr?.id]);

  if (!ivr) return null;

  const formatDate = (dateString: string) => {
    // Parse date without timezone conversion
    const [year, month, day] = dateString.split('T')[0].split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
  };

  const clienteNombreFantasia = ivr.clientes?.nombre_fantasia || null;
  const clienteRazonSocial = ivr.clientes?.nombre || null;
  const clienteNombre = clienteNombreFantasia || clienteRazonSocial || "Cliente no especificado";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-violet-950/20"
        side="bottom"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-4 pb-3 pr-14 border-b border-emerald-200/50 dark:border-emerald-800/30 shrink-0 bg-gradient-to-r from-emerald-50/30 to-transparent dark:from-emerald-950/10 dark:to-transparent">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 p-3 rounded-2xl border border-emerald-200/30 dark:border-emerald-800/30 shadow-sm shadow-emerald-500/10">
                <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-xl md:text-2xl text-gray-900 dark:text-gray-100">
                    Ingreso de Venta
                  </SheetTitle>
                  <Badge variant="outline" className="text-gray-500 border-gray-400">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    No Fiscal
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    #{ivr.id?.slice(0, 8).toUpperCase() || "-"}
                  </span>
                  <span className="text-xs text-gray-500">
                    N° {formatIvrNumber((ivr as any).nro_factura)}
                  </span>
                  <EmailTrackingBadge tracking={emailTracking} />
                  <Select
                    value={currentIvr.estado}
                    onValueChange={handleEstadoChange}
                    disabled={changingEstado}
                  >
                    <SelectTrigger className="w-[120px] h-6 text-xs border-gray-300 dark:border-gray-700">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagada">Cobrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Botones de acción - todos expandibles */}
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {/* Registrar cobro: abre el PagoFormDialog unificado (misma
                  mecánica que cuentas corrientes IVR, con "Registrar y enviar"). */}
              {currentIvr.estado !== 'pagada' && !!currentIvr.saldo_pendiente && currentIvr.saldo_pendiente > 0 && (
                <Button type="success" size="small" htmlType="button" onClick={handleRegistrarPago}>
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Registrar Cobro
                </Button>
              )}
              {/* Corregir imputación: un cobro de otro IVR/cliente se imputó mal
                  acá; se elige el cobro y se reasigna con CobroIvrDialog. */}
              {["pendiente", "parcial"].includes(currentIvr.estado) && (
                <Button type="outline" size="small" htmlType="button" onClick={() => setCorregirOpen(true)}>
                  <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                  Corregir imputación
                </Button>
              )}
              {/* Download expandible: PDF, Imprimir, Enviar */}
              <ExpandableDownloadButton
                onDownloadPDF={handleExportPDF}
                onSendEmail={clienteEmails.length > 0 ? () => handleSendEmail(clienteEmails[0]) : undefined}
              />
              {/* Email expandible */}
              <ExpandableEmailButton
                emails={clienteEmails}
                onSendEmail={handleSendEmail}
                onSendEmailMultiple={handleSendEmailMultiple}
              />
              {/* Chat interno */}
              <ShareToInternalChatButton
                entity={{
                  type: 'ivr',
                  id: ivr.id,
                  label: ivr.clientes?.nombre || 'Sin cliente',
                  number: formatIvrNumber(ivr.numero),
                  amount: ivr.total,
                  link: `/dashboard/ivr?id=${ivr.id}`,
                }}
              />
              {/* Duplicar expandible */}
              {onDuplicate && (
                <ExpandableDuplicateButton
                  onDuplicate={async (withItems) => {
                    onDuplicate(ivr);
                    onOpenChange(false);
                  }}
                />
              )}
              {/* Editar - botón simple */}
              <Button
                type="default"
                size="tiny"
                onClick={handleEdit}
                icon={<Pencil />}
                title="Editar"
              />
              {/* Eliminar expandible con confirmación */}
              <ExpandableDeleteButton
                onDelete={handleDelete}
                itemName="remito"
              />
            </div>
          </div>
        </SheetHeader>

        {/* Content — scroll nativo: el ScrollArea de Radix no scrollea con
            el dedo en mobile. */}
        <div className="flex-1 mt-4 overflow-y-auto">
          <div className="px-6 pb-6">
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={cn(sheetClasses.tabsList, "grid-cols-3")}>
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
                    <span className="text-sm">Cobros</span>
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
                    <section className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/10 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2 text-emerald-900 dark:text-emerald-100">
                        <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Cliente
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {clienteNombreFantasia && (
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Nombre Fantasía</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                              {clienteNombreFantasia}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Razón Social</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {clienteRazonSocial || "No especificada"}
                          </p>
                        </div>
                        {ivr.clientes?.identificador_unico && (
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">ID Cliente</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                              {ivr.clientes.identificador_unico}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Datos del Remito */}
                    <section className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/10 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2 text-emerald-900 dark:text-emerald-100">
                        <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Datos del Remito
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Fecha</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {formatDate(ivr.fecha_emision)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">N° Remito</p>
                          <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-0.5">
                            {formatIvrNumber((ivr as any).nro_factura)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Estado</p>
                          <Badge
                            variant={ivr.estado === 'pagada' ? 'default' : 'secondary'}
                            className="h-5 text-xs mt-0.5"
                          >
                            {ivr.estado === 'pagada' ? 'Cobrado' : ivr.estado}
                          </Badge>
                        </div>
                      </div>
                    </section>

                    {/* Resumen Financiero */}
                    <section className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/10 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2 text-emerald-900 dark:text-emerald-100">
                        <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Resumen
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                            {formatCurrency(ivr.total)}
                          </p>
                        </div>

                        {(ivr.total_cobrado !== undefined || ivr.total_pagado !== undefined) && (
                          <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Cobrado</p>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                              {formatCurrency(ivr.total_cobrado || ivr.total_pagado || 0)}
                            </p>
                          </div>
                        )}

                        {ivr.saldo_pendiente !== undefined && (
                          <div className={cn(
                            "border rounded-lg p-3 col-span-2",
                            ivr.saldo_pendiente === 0
                              ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20"
                              : "border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20"
                          )}>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Saldo Pendiente</p>
                            <p className={cn(
                              "text-lg font-bold mt-1",
                              ivr.saldo_pendiente === 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-orange-600 dark:text-orange-400"
                            )}>
                              {formatCurrency(ivr.saldo_pendiente)}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Comentarios */}
                    {ivr.comentarios && Array.isArray(ivr.comentarios) && ivr.comentarios.length > 0 && (
                      <section className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/10 shadow-sm">
                        <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2 text-emerald-900 dark:text-emerald-100">
                          <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Comentarios
                        </h3>
                        <div className="space-y-2">
                          {ivr.comentarios.map((comentario: any, index: number) => (
                            <div
                              key={index}
                              className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/30"
                            >
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {typeof comentario === 'string' ? comentario : comentario.texto || JSON.stringify(comentario)}
                              </p>
                              {comentario.fecha && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                    {(() => {
                      // Use facturas_items if available, otherwise fall back to detalles.insumos
                      const items = (ivr.facturas_items && ivr.facturas_items.length > 0)
                        ? ivr.facturas_items.map(item => ({
                            id: item.id,
                            nombre: item.descripcion,
                            descripcion: item.descripcion,
                            cantidad: item.cantidad,
                            precio_unitario: item.precio_unitario,
                            subtotal: item.subtotal,
                          }))
                        : ((ivr as any).detalles?.insumos || []).map((item: any, idx: number) => ({
                            id: item.producto_id || `insumo-${idx}`,
                            nombre: item.nombre,
                            descripcion: item.nombre,
                            cantidad: item.cantidad,
                            precio_unitario: item.precio_unitario,
                            subtotal: item.subtotal || item.monto,
                          }));

                      if (items.length === 0) {
                        return (
                          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay items en este remito</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <AnimatePresence mode="popLayout">
                            {items.map((item: any, index: number) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, delay: index * 0.03 }}
                                className="border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 space-y-2 bg-white dark:bg-gray-900"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <div className="p-1.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20">
                                      <Package className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {item.nombre || item.descripcion}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                      {formatCurrency(item.subtotal)}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-emerald-100 dark:border-emerald-900/30">
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
                            transition={{ delay: items.length * 0.03 + 0.1 }}
                            className="border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Total Items:
                              </span>
                              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(
                                  items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
                                )}
                              </span>
                            </div>
                          </motion.div>
                        </div>
                      );
                    })()}
                  </motion.div>
                </TabsContent>

                {/* Tab Cobros */}
                <TabsContent value="pagos" className="space-y-4 mt-0 p-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Usar cobros si existe, sino fallback a pagos para compatibilidad */}
                    {((ivr as any).cobros || ivr?.pagos) && ((ivr as any).cobros?.length > 0 || (ivr?.pagos?.length ?? 0) > 0) ? (
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {((ivr as any).cobros || ivr.pagos || []).map((cobro: any, index: number) => (
                            <motion.div
                              key={cobro.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, delay: index * 0.03 }}
                              className="border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 space-y-2 bg-white dark:bg-gray-900"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20">
                                    <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                    {formatCurrency(cobro.monto)}
                                  </span>
                                </div>
                                <Badge variant="outline" className="h-5 text-xs border-emerald-300 text-emerald-700">
                                  {cobro.metodo_pago || "Efectivo"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                <Calendar className="h-3 w-3" />
                                {formatDate(cobro.fecha_pago)}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: (((ivr as any).cobros || ivr.pagos)?.length || 0) * 0.03 + 0.1 }}
                          className="border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Total Cobrado:
                            </span>
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(ivr.total_cobrado || ivr.total_pagado || 0)}
                            </span>
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                        <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay cobros registrados</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SheetContent>

      <PagoFormDialog
        open={pagoFormOpen}
        onOpenChange={(open) => {
          setPagoFormOpen(open);
          if (!open) setEditingPago(null);
        }}
        facturaId={ivr.id}
        esContextoIvr={true}
        pago={editingPago}
        onSuccess={() => {
          setPagoFormOpen(false);
          setEditingPago(null);
          if (onRefresh) {
            onRefresh();
          }
        }}
        onCobroCreated={(cobro) => {
          // "Registrar y enviar": abrir el SendEmailDialog con el recibo.
          // Delay para que el dialog del pago termine de cerrarse (focus trap).
          setTimeout(() => {
            setCobroAEnviar(cobro);
            setSendCobroOpen(true);
          }, 200);
        }}
      />

      <SendEmailDialog
        open={sendCobroOpen}
        onOpenChange={(open) => {
          setSendCobroOpen(open);
          if (!open) setCobroAEnviar(null);
        }}
        defaultTo={sendCobroDefaults.to}
        defaultSubject={sendCobroDefaults.subject}
        defaultBody={sendCobroDefaults.body}
        attachmentName={sendCobroDefaults.filename}
        onSend={async ({ to, subject, body }) => {
          if (!cobroAEnviar) throw new Error('Sin cobro seleccionado');
          const res = await fetch('/api/cobros-ivr/enviar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cobro_id: cobroAEnviar.id, to, subject, body }),
            credentials: 'include',
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
          }
        }}
      />

      <ElegirCobroReasignarDialog
        open={corregirOpen}
        onOpenChange={setCorregirOpen}
        clienteId={ivr.clientes?.id || ivr.cliente_id || ""}
        clienteNombre={clienteNombre}
        onDone={() => onRefresh?.()}
      />

    </Sheet>
  );
}
