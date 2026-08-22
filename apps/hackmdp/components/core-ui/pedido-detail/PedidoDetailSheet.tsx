"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pedido } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileText,
  User,
  Calendar,
  Package,
  TrendingUp,
  MapPin,
  Truck,
  Phone,
  Mail,
  XCircle,
  UserPlus,
  Loader2,
} from "lucide-react";
import {
  DetailSheetContainer,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
  DetailSheetStatCard,
} from "../DetailSheetComponents";
import {
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TableCodeText } from "../TableTextTruncate";
import { ShareToInternalChatButton } from "../ShareToInternalChatButton";
import { useOrgFeatures } from "@/lib/hooks/use-org-features";

import { PedidoStatusActions } from "./PedidoStatusActions";
import { PedidoStatusBanners } from "./PedidoStatusBanners";
import { PedidoItemsEditor } from "./PedidoItemsEditor";
import { PedidoQuickEmailButton } from "./PedidoEmailActions";
import { PedidoTimeline } from "./PedidoTimeline";
import { PedidoActionDialogs } from "./PedidoActionDialogs";
import { GenerarRemitoDialog } from "../GenerarRemitoDialog";
import { PreparacionDetailSheet } from "../PreparacionDetailSheet";
import type { PreparacionOrden } from "@/app/dashboard/preparacion-entregas/page.client";
import type { PedidoNota, PedidoFeatureFlags, PedidoCallbacks } from "./types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar datos");
  return res.json();
};

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  confirmado: "Confirmado",
  preparando: "Preparando",
  en_produccion: "En producción",
  en_preparacion: "En preparación",
  listo: "Listo",
  completado: "Completado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const estadoColors: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pagado: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  confirmado: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  preparando: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  en_produccion: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  en_preparacion: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  listo: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  completado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  enviado: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  entregado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const prioridadVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  urgente: "destructive",
  alta: "destructive",
  normal: "default",
  baja: "secondary",
};

export interface PedidoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: Pedido | null;
  onSuccess?: () => void;
}

export function PedidoDetailSheet({
  open,
  onOpenChange,
  pedido,
  onSuccess,
}: PedidoDetailSheetProps) {
  // Dialog states (kept here because triggered from header actions)
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showPrepararDialog, setShowPrepararDialog] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isPreparando, setIsPreparando] = useState(false);
  const [convertWarnings, setConvertWarnings] = useState<string[]>([]);
  const [isChangingEstado, setIsChangingEstado] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [showRemitoDialog, setShowRemitoDialog] = useState(false);
  const [prepSheetOpen, setPrepSheetOpen] = useState(false);
  const [showEnvioPanel, setShowEnvioPanel] = useState(false);
  const [tracking, setTracking] = useState('');
  const [transportista, setTransportista] = useState('andreani');
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCreatingCliente, setIsCreatingCliente] = useState(false);

  const { features } = useOrgFeatures();
  const brandName = features?.email.brandName || "Tu tienda";

  // Data fetching
  const { data: pedidoDetallado, mutate } = useSWR(
    pedido?.id ? `/api/pedidos-ventas/${pedido.id}` : null,
    fetcher
  );
  const { data: notas, mutate: mutateNotas } = useSWR<PedidoNota[]>(
    pedido?.id ? `/api/pedidos-ventas/${pedido.id}/notas` : null,
    fetcher
  );
  const { data: remitos, mutate: mutateRemitos } = useSWR(
    pedido?.id ? `/api/remitos?pedido_id=${pedido.id}` : null,
    fetcher
  );
  const { data: transportes = [] } = useSWR('/api/transportes', fetcher);

  // Fetch prep order for drill-down (only when prep sheet is opened)
  const preparacionId = pedido?.preparacion_id;
  const { data: prepOrdenes, mutate: mutatePrepOrden } = useSWR<PreparacionOrden[]>(
    prepSheetOpen && preparacionId ? '/api/preparacion-entregas' : null,
    fetcher
  );
  const prepOrden = prepOrdenes?.find((o: PreparacionOrden) => o.id === preparacionId) || null;

  if (!pedido) return null;

  const pedidoData = pedidoDetallado || pedido;
  const items = pedidoData.items || pedidoData.pedidos_items || [];
  const cliente = pedidoData.cliente || pedidoData.clientes;
  const presupuesto = pedidoData.presupuestos || pedidoData.presupuesto;

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
  const total = pedidoData.total || subtotal;

  // Feature flags
  const hasEcommerce = features?.entregas?.ecommerceFlow || false;
  const featureFlags: PedidoFeatureFlags = {
    hasEcommerce,
    hasPaymentInfo: hasEcommerce && "metodo_pago" in pedidoData,
    hasStatusTransitions: hasEcommerce,
    hasPreparationFlow: !hasEcommerce,
    hasInvoiceConversion: true,
    hasRemitoGeneration: !hasEcommerce,
  };

  // Derived state
  const canConvertToFactura =
    featureFlags.hasInvoiceConversion &&
    ['completado', 'pagado', 'listo', 'enviado', 'entregado'].includes(pedidoData.estado) &&
    !pedidoData.convertido_factura &&
    !pedidoData.facturado &&
    items.length > 0;

  const canEnviarAPreparacion =
    featureFlags.hasPreparationFlow &&
    ["confirmado", "procesando"].includes(pedidoData.estado) &&
    !pedidoData.preparacion_id &&
    items.length > 0;

  const enPreparacion =
    featureFlags.hasPreparationFlow &&
    (pedidoData.estado === "en_preparacion" || pedidoData.preparacion_id);

  const canGenerarRemito =
    featureFlags.hasRemitoGeneration &&
    items.some((i: any) => (i.cantidad - (i.cantidad_remitida || 0) - (i.cantidad_cancelada || 0)) > 0) &&
    !['cancelado', 'entregado'].includes(pedidoData.estado);

  const canCancel =
    !["cancelado", "entregado", "facturado"].includes(pedidoData.estado) &&
    !pedidoData.convertido_factura;

  const canCreateCliente = !pedidoData.cliente_id && !!pedidoData.persona_id;

  const callbacks: PedidoCallbacks = {
    mutate: () => { mutate(); mutateRemitos(); },
    mutateNotas: () => mutateNotas(),
    onSuccess,
  };

  // Action handlers
  const handleCambiarEstado = async (nuevoEstado: string) => {
    setIsChangingEstado(true);
    try {
      const res = await fetch(`/api/pedidos-ventas/${pedido.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar estado");
      toast.success(`Estado actualizado a "${nuevoEstado}"`);
      mutate();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado");
    } finally {
      setIsChangingEstado(false);
    }
  };

  const handleConvertirAFactura = async (tipo_factura?: string) => {
    setIsConverting(true);
    setConvertWarnings([]);
    try {
      const res = await fetch("/api/pedidos/facturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_id: pedido.id, tipo_factura: tipo_factura || 'B' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al convertir pedido a factura");
      if (data.warnings?.length > 0) {
        setConvertWarnings(data.warnings);
        toast.warning("Factura creada con advertencias");
      } else {
        toast.success("Pedido convertido a factura exitosamente");
      }
      setShowConvertDialog(false);
      mutate();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al convertir pedido");
    } finally {
      setIsConverting(false);
    }
  };

  const handleEnviarAPreparacion = async () => {
    setIsPreparando(true);
    try {
      const res = await fetch("/api/pedidos-ventas/preparar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedido_id: pedido.id,
          notas: `Preparación solicitada desde pedido ${pedido.numero || pedido.id?.slice(0, 8)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar a preparación");
      toast.success(data.message || "Pedido enviado a preparación exitosamente");
      setShowPrepararDialog(false);
      mutate();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al enviar a preparación");
    } finally {
      setIsPreparando(false);
    }
  };

  const handleCancelarPedido = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/pedidos-ventas/${pedido.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cancelar pedido");
      await fetch(`/api/pedidos-ventas/${pedido.id}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "cambio_estado",
          contenido: "Pedido cancelado",
          estado_anterior: pedidoDetallado?.estado || pedido.estado,
          estado_nuevo: "cancelado",
        }),
      });
      toast.success("Pedido cancelado");
      setShowCancelDialog(false);
      mutate();
      mutateNotas();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al cancelar pedido");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDespachar = async () => {
    if (!tracking.trim()) {
      toast.error('Ingresá el número de seguimiento');
      return;
    }
    setIsDispatching(true);
    try {
      // Create envio + update pedido to enviado
      const res = await fetch('/api/envios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedido_id: pedido.id,
          cliente_id: pedidoData.cliente_id || cliente?.id,
          transporte_id: transportista,
          numero_seguimiento: tracking.trim(),
          estado: 'despachado',
          fecha_despacho: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear envío');
      }
      // Update pedido estado to enviado
      await fetch(`/api/pedidos-ventas/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'enviado' }),
      });
      toast.success('Pedido despachado con número de guía');
      setShowEnvioPanel(false);
      setTracking('');
      mutate();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al despachar');
    } finally {
      setIsDispatching(false);
    }
  };

  // Quick email handler (for header button)
  const handleQuickEmail = async (email: string) => {
    setEmailSending(true);
    const toastId = toast.loading(`Enviando resumen a ${email}...`);
    try {
      const numero = pedidoData.numero || pedidoData.id?.slice(0, 8);
      const clienteNombre = pedidoData.cliente?.nombre || pedidoData.clientes?.nombre || "cliente";
      const itemsList = (pedidoData.items || pedidoData.pedidos_items || [])
        .map((i: any) => `• ${i.producto?.nombre || i.nombre || i.descripcion} x${i.cantidad} - ${formatCurrency(i.subtotal || 0)}`)
        .join("\n");
      const totalStr = formatCurrency(pedidoData.total || 0);
      const body = `Hola ${clienteNombre},\n\nTe enviamos el detalle de tu pedido #${numero}:\n\n${itemsList}\n\nTotal: ${totalStr}\n\nAnte cualquier consulta no dudes en contactarnos.`;
      const res = await fetch("/api/org-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: [email], subject: `Pedido #${numero} - ${brandName}`, body }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al enviar email");
      }
      toast.success(`Email enviado a ${email}`, { id: toastId });
      if (pedidoData.id) {
        await fetch(`/api/pedidos-ventas/${pedidoData.id}/notas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "nota", contenido: `Email rápido enviado a ${email}: "Pedido #${numero}"` }),
        });
        mutateNotas();
      }
    } catch (error: any) {
      toast.error(error.message || "Error al enviar email", { id: toastId });
    } finally {
      setEmailSending(false);
    }
  };

  const handleCrearCliente = async () => {
    setIsCreatingCliente(true);
    try {
      const res = await fetch("/api/clientes/from-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_id: pedido.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear cliente");
      if (data.created) {
        toast.success(`Cliente "${data.cliente.nombre}" creado y vinculado al pedido`);
      } else if (data.linked) {
        toast.success(`Cliente existente "${data.cliente.nombre}" vinculado al pedido`);
      } else {
        toast.success(`El pedido ya tiene un cliente vinculado`);
      }
      mutate();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al crear cliente desde pedido");
    } finally {
      setIsCreatingCliente(false);
    }
  };

  return (
    <>
      <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="blue">
        <SheetHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0 overflow-visible">
          <div className="flex flex-col gap-3 overflow-visible">
            {/* Row: Title + Estado + Actions */}
            <div className="flex items-center gap-3 pr-8">
              <div className="flex items-center gap-3 min-w-0">
                <SheetTitle className="text-base font-medium text-muted-foreground shrink-0">
                  Pedido
                </SheetTitle>
                <span className="text-lg font-bold font-mono tracking-tight text-foreground shrink-0">
                  {pedidoData.numero || `#${pedidoData.id?.slice(0, 8)}`}
                </span>

                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${estadoColors[pedidoData.estado] || "bg-gray-100 text-gray-700"}`}>
                  {estadoLabels[pedidoData.estado] || pedidoData.estado?.replace("_", " ") || "Pendiente"}
                </span>
                {pedidoData.prioridad && pedidoData.prioridad !== 'normal' && (
                  <Badge variant={prioridadVariants[pedidoData.prioridad] || "default"}>
                    {pedidoData.prioridad.toUpperCase()}
                  </Badge>
                )}
              </div>

              {/* Actions aligned right */}
              <div className="flex items-center gap-1.5 ml-auto shrink-0 overflow-visible relative z-10">
                {/* Primary status actions */}
                <PedidoStatusActions
                  estado={pedidoData.estado}
                  featureFlags={featureFlags}
                  canEnviarAPreparacion={canEnviarAPreparacion}
                  canConvertToFactura={canConvertToFactura}
                  canGenerarRemito={canGenerarRemito}
                  canCancel={canCancel}
                  onStatusChange={handleCambiarEstado}
                  onShowPrepararDialog={() => setShowPrepararDialog(true)}
                  onShowConvertDialog={() => setShowConvertDialog(true)}
                  onShowRemitoDialog={() => setShowRemitoDialog(true)}
                  onShowCancelDialog={() => setShowCancelDialog(true)}
                  isChangingEstado={isChangingEstado}
                  renderCancel={false}
                />

                {/* Separator */}
                <div className="w-px h-5 bg-border mx-0.5" />

                {/* Share / Email */}
                <PedidoQuickEmailButton
                  emails={[cliente?.email].filter(Boolean)}
                  onSendEmail={handleQuickEmail}
                  sending={emailSending}
                />
                <ShareToInternalChatButton
                  entity={{
                    type: "pedido",
                    id: pedidoData.id,
                    label: pedidoData.clientes?.nombre || cliente?.nombre || "Sin cliente",
                    number: pedidoData.numero || pedidoData.id.slice(0, 8),
                    amount: pedidoData.total,
                    link: `/dashboard/pedidos?id=${pedidoData.id}`,
                  }}
                />

                {/* Cancel at the end */}
                {canCancel && (
                  <>
                    <div className="w-px h-5 bg-border mx-0.5" />
                    <Button
                      type="danger"
                      size="tiny"
                      onClick={() => setShowCancelDialog(true)}
                      icon={<XCircle />}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <DetailSheetContent>
          <PedidoStatusBanners
            pedido={pedidoData}
            featureFlags={featureFlags}
            onOpenPreparacion={preparacionId ? () => setPrepSheetOpen(true) : undefined}
            onUpdate={() => { mutate(); onSuccess?.(); }}
          />

          {/* Shipping / Tracking Panel removed - dispatch is handled from the envío flow */}

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <DetailSheetStatCard
              icon={User}
              label="Cliente"
              value={cliente?.nombre || "-"}
              theme="blue"
              subtext={cliente?.cuit ? `CUIT: ${cliente.cuit}` : cliente?.telefono ? `Tel: ${cliente.telefono}` : undefined}
            />
            <DetailSheetStatCard
              icon={Package}
              label="Estado Producción"
              value={pedidoData.estado_produccion?.replace("_", " ") || "PENDIENTE"}
              theme="purple"
              subtext={pedidoData.progreso_produccion !== undefined ? `Progreso: ${pedidoData.progreso_produccion}%` : undefined}
            />
            <DetailSheetStatCard
              icon={Calendar}
              label="Entrega Estimada"
              value={pedidoData.fecha_estimada_entrega ? new Date(pedidoData.fecha_estimada_entrega).toLocaleDateString("es-AR") : "-"}
              theme="amber"
              subtext={pedidoData.fecha_entregado ? `Entregado: ${new Date(pedidoData.fecha_entregado).toLocaleDateString("es-AR")}` : undefined}
            />
          </div>

          {/* Client contact */}
          {(cliente?.telefono || cliente?.email) && (
            <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
              {cliente.telefono && (
                <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  <Phone className="h-3.5 w-3.5" />
                  {cliente.telefono}
                </a>
              )}
              {cliente.email && (
                <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  <Mail className="h-3.5 w-3.5" />
                  {cliente.email}
                </a>
              )}
            </div>
          )}

          {/* Create Client from e-commerce buyer */}
          {canCreateCliente && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Este pedido tiene comprador pero no un cliente Locus vinculado.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Se creará un cliente con los datos de la persona y/o el pago de MercadoPago.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleCrearCliente}
                disabled={isCreatingCliente}
                className="gap-1.5 shrink-0"
              >
                {isCreatingCliente ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Crear Cliente
              </Button>
            </div>
          )}

          {/* References */}
          {(presupuesto || pedidoData.oportunidad_id) && (
            <DetailSheetSection icon={TrendingUp} title="Referencias" theme="indigo">
              <div className="grid grid-cols-2 gap-3">
                {presupuesto && (
                  <DetailSheetInfoItem
                    icon={FileText}
                    label="Presupuesto"
                    theme="indigo"
                    value={<span className="font-mono">{presupuesto.numero || presupuesto.id?.slice(0, 8)}</span>}
                  />
                )}
                {pedidoData.oportunidad_id && (
                  <DetailSheetInfoItem
                    icon={TrendingUp}
                    label="Oportunidad"
                    theme="green"
                    value={<span className="font-mono">{pedidoData.oportunidad_id.slice(0, 8)}</span>}
                  />
                )}
              </div>
            </DetailSheetSection>
          )}

          <PedidoItemsEditor
            pedidoId={pedido.id}
            pedidoData={pedidoData}
            items={items}
            enPreparacion={!!enPreparacion}
            callbacks={callbacks}
          />

          {/* Remitos linked to this pedido */}
          {remitos && remitos.length > 0 && (
            <DetailSheetSection icon={Truck} title={`Remitos (${remitos.length})`} theme="cyan">
              <div className="space-y-2">
                {remitos.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <span className="font-mono font-medium text-sm">{r.numero}</span>
                      {r.fecha && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(r.fecha).toLocaleDateString("es-AR")}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant={r.estado === 'facturado' ? 'default' : r.estado === 'confirmado' ? 'secondary' : 'outline'}
                      className={r.estado === 'facturado' ? 'bg-green-600' : r.estado === 'confirmado' ? 'bg-blue-600 text-white' : ''}
                    >
                      {r.estado === 'facturado' ? 'Facturado' : r.estado === 'confirmado' ? 'Confirmado' : 'Borrador'}
                    </Badge>
                  </div>
                ))}
              </div>
            </DetailSheetSection>
          )}

          <PedidoTimeline
            pedidoId={pedido.id}
            notas={notas}
            callbacks={callbacks}
          />

          {/* Production Notes */}
          {pedidoData.notas_produccion && (
            <DetailSheetSection icon={FileText} title="Notas de Producción" theme="purple">
              <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
                {pedidoData.notas_produccion}
              </div>
            </DetailSheetSection>
          )}

          {/* Delivery Address */}
          {pedidoData.direccion_entrega && (
            <DetailSheetSection icon={MapPin} title="Dirección de Entrega" theme="teal">
              <DetailSheetInfoItem
                icon={MapPin}
                label="Dirección"
                theme="teal"
                value={
                  typeof pedidoData.direccion_entrega === "string"
                    ? pedidoData.direccion_entrega
                    : pedidoData.direccion_entrega.tipo === "retiro"
                      ? "Retiro en local"
                      : [pedidoData.direccion_entrega.direccion, pedidoData.direccion_entrega.calle, pedidoData.direccion_entrega.numero, pedidoData.direccion_entrega.ciudad, pedidoData.direccion_entrega.provincia, pedidoData.direccion_entrega.codigo_postal].filter(Boolean).join(", ")
                }
              />
            </DetailSheetSection>
          )}

          {/* Client Transport */}
          {pedidoData.transporte_cliente && (
            <DetailSheetSection icon={Truck} title="Transporte a Avisar" theme="violet">
              <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-800/50">
                    <Truck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-violet-900 dark:text-violet-100">
                      {pedidoData.transporte_cliente.nombre}
                    </p>
                    {pedidoData.transporte_cliente.telefono && (
                      <a
                        href={`tel:${pedidoData.transporte_cliente.telefono}`}
                        className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        {pedidoData.transporte_cliente.telefono}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </DetailSheetSection>
          )}
        </DetailSheetContent>
      </DetailSheetContainer>

      <PedidoActionDialogs
        pedidoData={pedidoData}
        cliente={cliente}
        items={items}
        total={total}
        showConvertDialog={showConvertDialog}
        setShowConvertDialog={setShowConvertDialog}
        onConvertirAFactura={handleConvertirAFactura}
        isConverting={isConverting}
        convertWarnings={convertWarnings}
        showPrepararDialog={showPrepararDialog}
        setShowPrepararDialog={setShowPrepararDialog}
        onEnviarAPreparacion={handleEnviarAPreparacion}
        isPreparando={isPreparando}
        showCancelDialog={showCancelDialog}
        setShowCancelDialog={setShowCancelDialog}
        onCancelarPedido={handleCancelarPedido}
        isCancelling={isCancelling}
      />

      <GenerarRemitoDialog
        open={showRemitoDialog}
        onOpenChange={setShowRemitoDialog}
        pedidoId={pedido.id}
        pedidoNumero={pedidoData.numero || pedidoData.id?.slice(0, 8)}
        items={items}
        clienteNombre={cliente?.nombre}
        onSuccess={() => {
          mutate();
          mutateRemitos();
          onSuccess?.();
        }}
      />

      {/* Nested prep detail sheet */}
      <PreparacionDetailSheet
        open={prepSheetOpen}
        onOpenChange={setPrepSheetOpen}
        orden={prepOrden}
        onUpdate={() => {
          mutatePrepOrden();
          mutate();
          onSuccess?.();
        }}
      />
    </>
  );
}
