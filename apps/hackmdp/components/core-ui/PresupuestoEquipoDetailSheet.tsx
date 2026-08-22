"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Printer,
  FileText,
  DollarSign,
  Calendar,
  User,
  MoreVertical,
  Pencil,
  Eye,
  Mail,
  Send,
  Building2,
  Download,
  Box,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  PenTool,
  Copy,
  ExternalLink,
  ArrowRight,
  Loader2,
  Info,
  Settings,
  Sparkles,
  ChevronDown,
  CreditCard,
  Truck,
  ShieldCheck,
  MapPin,
  Percent,
  Wrench,
  GraduationCap,
  CalendarClock,
  MessageCircle,
} from "lucide-react";
import { PresupuestoEquipo, PresupuestoEquipoItem } from "@/lib/types";
import { toast } from "sonner";
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
import { EspecificacionesDisplay } from "@/components/core-ui/EspecificacionesEditor";
import { EspecificacionesItemDialog, type PresupuestoItemSpecs } from "@/components/core-ui/EspecificacionesItemDialog";
import { SendEmailDialog } from "@/components/core-ui/SendEmailDialog";
import { PdfPreviewDialog } from "@/components/core-ui/presupuestos/PdfPreviewDialog";
import { EnviarWhatsappDialog } from "@/components/core-ui/presupuestos/EnviarWhatsappDialog";
import { formatCurrency } from "@/lib/format-currency";
import { agruparTotalesPorMoneda, normalizarMoneda } from "@/lib/presupuesto-equipo-totales";

interface PresupuestoEquipoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presupuesto: PresupuestoEquipo | null;
  onRefresh?: () => void;
  onEdit?: (presupuesto: PresupuestoEquipo) => void;
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

export function PresupuestoEquipoDetailSheet({
  open,
  onOpenChange,
  presupuesto,
  onRefresh,
  onEdit,
}: PresupuestoEquipoDetailSheetProps) {
  const [sending, setSending] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);

  // Edición de especificaciones por equipo (mini-dialog desde el detail sheet).
  const [specsItem, setSpecsItem] = useState<PresupuestoItemSpecs | null>(null);
  const [specsOpen, setSpecsOpen] = useState(false);
  // Override local para reflejar el guardado al instante (el presupuesto llega
  // por prop; el parent revalida la lista pero no re-pasa este snapshot).
  const [specsOverrides, setSpecsOverrides] = useState<
    Record<string, {
      especificaciones: Record<string, unknown> | string[] | null;
      especificaciones_personalizada: boolean;
      equipo_especificaciones?: Record<string, unknown> | string[] | null;
    }>
  >({});

  // Acordeón de especificaciones: UN solo toggle por equipo abre/cierra TODO el
  // bloque de specs (no cada categoría por separado). Arranca colapsado.
  const [specsExpanded, setSpecsExpanded] = useState<Set<string>>(new Set());
  const toggleSpecs = (key: string) =>
    setSpecsExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Todos los hooks ANTES de cualquier return condicional (Rules of Hooks). El
  // sheet se abre inline async → presupuesto es null en el primer render y luego
  // se carga; con hooks después del early return cambia la cantidad de hooks
  // entre renders → React #310.
  if (!presupuesto) return null;

  const items = presupuesto.items || [];
  const monedaHeader = presupuesto.moneda || 'ARS';

  // Moneda por línea: cada equipo cotiza en su propia moneda (precio_lista_moneda).
  // El precio guardado del item está en la moneda del equipo, así que el símbolo
  // ($ / US$) debe seguir al equipo, no al campo `moneda` del header (que puede
  // quedar desincronizado si se cambió la moneda del presupuesto sin convertir).
  const monedaDeItem = (it: { equipo_moneda?: string | null }) =>
    it.equipo_moneda || monedaHeader;
  // Moneda efectiva del presupuesto (para totales y badge): la única moneda usada
  // por los equipos cotizados; si se mezclan (caso no soportado hoy) cae al header.
  const monedasEnUso = Array.from(
    new Set(
      items
        .map((it: { equipo_moneda?: string | null }) => it.equipo_moneda)
        .filter(Boolean) as string[],
    ),
  );
  const moneda = monedasEnUso.length === 1 ? monedasEnUso[0] : monedaHeader;

  // El equipo del header (modo single) suele copiarse también como item (p.ej.
  // al traer items de la oportunidad). En ese caso sus especificaciones ya se
  // muestran —y son editables— en el bloque por-equipo, así que NO repetimos el
  // bloque legacy de especificaciones a nivel presupuesto.
  const headerEquipoEnItems =
    !!presupuesto.equipo_id &&
    items.some((it: { equipo_id?: string | null }) => it.equipo_id === presupuesto.equipo_id);

  // Emails sugeridos para el envío: los del cliente y la persona (pueden venir
  // como string suelto o como array). El usuario puede igual cargar uno a mano.
  const emailSugeridos = (() => {
    const out: string[] = [];
    const push = (v: unknown) => {
      if (!v) return;
      if (Array.isArray(v)) v.forEach((e) => { if (typeof e === 'string' && e.includes('@')) out.push(e); });
      else if (typeof v === 'string' && v.includes('@')) out.push(v);
    };
    push((presupuesto.cliente as { email?: unknown } | null | undefined)?.email);
    push((presupuesto as { persona?: { email?: unknown } | null }).persona?.email);
    return Array.from(new Set(out));
  })();

  const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "aprobado":
      case "aceptado":
        return <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {estado}</Badge>;
      case "pendiente":
      case "borrador":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1"><Clock className="h-3 w-3" /> {estado}</Badge>;
      case "enviado":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1"><Send className="h-3 w-3" /> {estado}</Badge>;
      case "visto":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1"><Eye className="h-3 w-3" /> {estado}</Badge>;
      case "rechazado":
      case "vencido":
        return <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1"><XCircle className="h-3 w-3" /> {estado}</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // Envío "fluido": el SendEmailDialog provee destinatarios + asunto + mensaje.
  // El endpoint cae al asunto/cuerpo por defecto si no se personalizan.
  const handleSendFluido = async ({ to, subject, body }: { to: string[]; subject: string; body: string }) => {
    const res = await fetch('/api/presupuestos-equipos/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presupuesto_id: presupuesto.id, to, subject, body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al enviar');
    onRefresh?.();
  };

  // Envío de PRUEBA al usuario logueado (el backend usa session.email cuando no
  // se pasa email_destino con test=true).
  const handleEnviarPrueba = async () => {
    setSending(true);
    setShowSendDialog(false);
    const toastId = toast.loading('Enviando prueba a tu email...');
    try {
      const res = await fetch('/api/presupuestos-equipos/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto_id: presupuesto.id, test: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      toast.success('Email de prueba enviado', {
        id: toastId,
        description: data.message || 'Revisá tu casilla de correo',
      });
    } catch (error: any) {
      toast.error('Error al enviar la prueba', {
        id: toastId,
        description: error.message || 'Intente nuevamente',
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopiarLink = () => {
    if (presupuesto.token_firma) {
      const url = `${window.location.origin}/pe/${presupuesto.token_firma}`;
      navigator.clipboard.writeText(url);
      toast.success('Link copiado al portapapeles');
    } else {
      toast.error('Este presupuesto no tiene token de firma');
    }
  };

  const handleAbrirLink = () => {
    if (presupuesto.token_firma) {
      window.open(`/pe/${presupuesto.token_firma}`, '_blank');
    }
  };

  // Calcular totales
  const subtotal = items.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0);
  const descuentoMonto = presupuesto.descuento || 0;
  const subtotalConDescuento = subtotal - descuentoMonto;
  const ivaMonto = presupuesto.incluye_iva ? subtotalConDescuento * 0.21 : 0;
  const total = subtotalConDescuento + ivaMonto;

  // Totales agrupados por moneda (USD/ARS): un presupuesto puede mezclar equipos
  // en distintas monedas y NO se convierten. Misma fuente de verdad que el PDF
  // (lib/presupuesto-equipo-totales). Cada línea usa su subtotal guardado y su
  // alícuota de IVA; el símbolo sigue a la moneda del equipo, no al header.
  const totalesPorMoneda = agruparTotalesPorMoneda(
    items.map((it) => ({
      subtotal:
        Number(it.subtotal) > 0
          ? Number(it.subtotal)
          : (Number(it.precio_unitario) || 0) * (Number(it.cantidad) || 0),
      ivaPorcentaje: Number((it as { iva_porcentaje?: number }).iva_porcentaje ?? 0),
      moneda: normalizarMoneda(monedaDeItem(it), normalizarMoneda(monedaHeader)),
    })),
  );
  // Mezcla de monedas → mostramos un bloque de totales por cada una en vez de un
  // único valor que no representaría a las dos.
  const mixtoMonedas = totalesPorMoneda.length > 1;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-full h-[100dvh] md:h-[90vh] max-h-[100dvh] md:h-[90vh] overflow-y-auto p-0 flex flex-col bg-white dark:bg-gray-900"
          side="bottom"
        >
          {/* Header compacto */}
          <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 pr-12 sm:pr-14 border-b border-emerald-200/50 dark:border-emerald-800/30 shrink-0 bg-gradient-to-r from-emerald-50/30 to-transparent dark:from-emerald-950/10 dark:to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center sm:items-start gap-2 sm:gap-3 flex-1 min-w-0">
                {/* Icon con acento */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-emerald-200/30 dark:border-emerald-800/30 shadow-sm shadow-emerald-500/10 shrink-0">
                  <Box className="h-5 w-5 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-base sm:text-2xl bg-gradient-to-r from-emerald-900 to-emerald-700 dark:from-emerald-100 dark:to-emerald-300 bg-clip-text text-transparent truncate">
                    Presupuesto #{presupuesto.numero}
                  </SheetTitle>
                  <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                    {getEstadoBadge(presupuesto.estado)}
                    {presupuesto.firmado && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                        <PenTool className="h-3 w-3" /> Firmado
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      {mixtoMonedas
                        ? totalesPorMoneda.map((t) => t.moneda).join(" + ")
                        : moneda}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-1 sm:gap-2 flex-shrink-0 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
                {onEdit && (
                  <Button
                    type="default"
                    size="tiny"
                    onClick={() => onEdit(presupuesto)}
                    icon={<Pencil />}
                    title="Editar presupuesto"
                  >
                    Editar
                  </Button>
                )}
                {(presupuesto.estado === 'borrador' || presupuesto.estado === 'enviado' || presupuesto.estado === 'visto') && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="primary"
                          size="tiny"
                          icon={<Send />}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        >
                          Enviar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowSendDialog(true)}>
                          <Mail className="h-4 w-4 mr-2" /> Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowWhatsapp(true)}>
                          <MessageCircle className="h-4 w-4 mr-2 text-green-600" /> WhatsApp
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="default"
                      size="tiny"
                      onClick={handleEnviarPrueba}
                      disabled={sending}
                      icon={<Mail />}
                      title="Enviarme una prueba a mi email"
                    >
                      Prueba
                    </Button>
                  </>
                )}
                {presupuesto.token_firma && (
                  <>
                    <Button
                      type="default"
                      size="tiny"
                      onClick={handleCopiarLink}
                      icon={<Copy />}
                      title="Copiar link"
                    />
                    <Button
                      type="default"
                      size="tiny"
                      onClick={handleAbrirLink}
                      icon={<ExternalLink />}
                      title="Ver como cliente"
                    />
                  </>
                )}
                <Button
                  type="default"
                  size="tiny"
                  icon={<Eye />}
                  onClick={() => setShowPreview(true)}
                >
                  Vista previa
                </Button>
                <Button
                  type="default"
                  size="tiny"
                  icon={<Download />}
                  title="Descargar PDF"
                  onClick={() => {
                    if (!presupuesto) return;
                    window.open(`/api/presupuestos-equipos/pdf?id=${presupuesto.id}`, '_blank');
                  }}
                />
                <Button
                  type="default"
                  size="tiny"
                  icon={<Printer />}
                  title="Imprimir"
                  onClick={() => {
                    if (!presupuesto) return;
                    window.open(`/api/presupuestos-equipos/pdf?id=${presupuesto.id}&inline=1`, '_blank');
                  }}
                />
              </div>
            </div>
          </SheetHeader>

          {/* Content con tabs */}
          <div className="flex-1 overflow-y-auto mt-2 sm:mt-4">
            <div className="px-4 sm:px-6 pb-6">
              <Tabs defaultValue="resumen" className="w-full">
                <TabsList className={cn(sheetClasses.tabsList, "grid-cols-4 h-auto")}>
                  <TabsTrigger value="resumen" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                    <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-sm">Resumen</span>
                  </TabsTrigger>
                  <TabsTrigger value="equipos" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                    <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-sm">Equipos</span>
                  </TabsTrigger>
                  <TabsTrigger value="condiciones" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-sm">Condiciones</span>
                  </TabsTrigger>
                  <TabsTrigger value="estado" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-sm">Estado</span>
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
                    {/* Información del Cliente / Contacto.
                        Si el presupuesto viene de una oportunidad sin cliente
                        formal, mostramos los datos de la persona o, en su
                        defecto, los contactos sueltos cargados en la oportunidad. */}
                    {(() => {
                      const cliente = presupuesto.cliente
                      const persona = (presupuesto as any).persona
                      const op = (presupuesto as any).oportunidad

                      const personaEmail = Array.isArray(persona?.email) ? persona.email[0] : persona?.email
                      const personaTelefono = Array.isArray(persona?.telefono) ? persona.telefono[0] : persona?.telefono
                      // Un cliente puede tener varios emails/teléfonos (array): los mostramos
                      // separados, si no React los renderiza pegados ("476-30062235...").
                      const fmtLista = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(' / ') : v)

                      const nombre = cliente?.nombre || cliente?.nombre_fantasia
                        || persona?.nombre_completo
                        || op?.contacto_nombre
                        || op?.empresa_nombre
                        || '-'
                      const cuit = cliente?.cuit || persona?.documento_nro || '-'
                      const email = fmtLista(cliente?.email)
                        || personaEmail
                        || op?.contacto_email
                        || '-'
                      const telefono = fmtLista(cliente?.telefono)
                        || personaTelefono
                        || op?.contacto_telefono
                        || '-'
                      const origenLabel = cliente ? 'Cliente'
                        : persona ? 'Contacto'
                        : op ? 'Contacto de la oportunidad'
                        : 'Cliente'

                      return (
                        <section className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                          <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-blue-200/50 dark:border-blue-800/30 pb-2 text-blue-900 dark:text-blue-100">
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            {origenLabel}
                            {op && !cliente && (
                              <span className="ml-auto text-xs font-normal text-muted-foreground">
                                desde oportunidad: <span className="font-medium">{op.nombre}</span>
                              </span>
                            )}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Nombre</Label>
                              <p className="font-medium text-sm mt-1">{nombre}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">{persona && !cliente ? 'DNI' : 'CUIT'}</Label>
                              <p className="font-medium text-sm mt-1 font-mono">{cuit}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Email</Label>
                              <p className="font-medium text-sm mt-1 break-all">{email}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Teléfono</Label>
                              <p className="font-medium text-sm mt-1">{telefono}</p>
                            </div>
                          </div>
                        </section>
                      )
                    })()}

                    {/* Resumen Financiero */}
                    <section className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2 text-emerald-900 dark:text-emerald-100">
                        <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Resumen Financiero
                      </h3>

                      {mixtoMonedas ? (
                        // Mezcla de monedas: un set Subtotal/IVA/Total por cada moneda.
                        <div className="space-y-3">
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Este presupuesto mezcla monedas — los totales se muestran por separado, sin convertir.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {totalesPorMoneda.map((t) => (
                              <div
                                key={t.moneda}
                                className="border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 bg-emerald-50/40 dark:bg-emerald-950/20"
                              >
                                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                                  {t.moneda}
                                </p>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                  <span className="font-mono">{formatCurrency(t.subtotal, t.moneda)}</span>
                                </div>
                                {t.iva > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">IVA</span>
                                    <span className="font-mono">{formatCurrency(t.iva, t.moneda)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-base font-bold mt-1 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                                  <span className="text-emerald-800 dark:text-emerald-200">Total</span>
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(t.total, t.moneda)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Subtotal</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {formatCurrency(subtotal, moneda)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {items.length} equipo{items.length !== 1 ? 's' : ''}
                          </p>
                        </div>

                        {descuentoMonto > 0 && (
                          <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Descuento</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                              -{formatCurrency(descuentoMonto, moneda)}
                            </p>
                          </div>
                        )}

                        {presupuesto.incluye_iva && (
                          <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                            <p className="text-xs text-gray-600 dark:text-gray-400">IVA (21%)</p>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                              {formatCurrency(ivaMonto, moneda)}
                            </p>
                          </div>
                        )}

                        <div className="border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            {formatCurrency(presupuesto.total || total, moneda)}
                          </p>
                        </div>
                      </div>
                      )}
                    </section>

                    {/* Fechas */}
                    <section className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-purple-200/50 dark:border-purple-800/30 pb-2 text-purple-900 dark:text-purple-100">
                        <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        Fechas
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Fecha Emisión</Label>
                          <p className="font-medium text-sm mt-1">
                            {formatDateLong(presupuesto.fecha_emision)}
                          </p>
                        </div>
                        {presupuesto.validez_dias && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Validez</Label>
                            <p className="font-medium text-sm mt-1">
                              {presupuesto.validez_dias} días
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground">Creado</Label>
                          <p className="font-medium text-sm mt-1">
                            {formatDate(presupuesto.created_at)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Actualizado</Label>
                          <p className="font-medium text-sm mt-1">
                            {formatDate(presupuesto.updated_at)}
                          </p>
                        </div>
                      </div>
                    </section>
                  </motion.div>
                </TabsContent>

                {/* Tab Equipos */}
                <TabsContent value="equipos" className="space-y-4 mt-0 p-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Equipos del Presupuesto ({items.length})
                      </h3>
                    </div>

                    {presupuesto.descripcion_comercial && (
                      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Descripción
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                          {presupuesto.descripcion_comercial}
                        </p>
                      </div>
                    )}

                    {!headerEquipoEnItems &&
                      presupuesto.especificaciones &&
                      ((Array.isArray(presupuesto.especificaciones) &&
                        presupuesto.especificaciones.length > 0) ||
                        (!Array.isArray(presupuesto.especificaciones) &&
                          Object.keys(presupuesto.especificaciones).length > 0)) && (
                        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900">
                          <button
                            type="button"
                            onClick={() => toggleSpecs("presupuesto")}
                            aria-expanded={specsExpanded.has("presupuesto")}
                            className="w-full flex items-center gap-2 text-left"
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${specsExpanded.has("presupuesto") ? "rotate-180" : ""}`}
                            />
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Especificaciones técnicas
                            </h4>
                          </button>
                          {specsExpanded.has("presupuesto") && (
                            <div className="mt-3">
                              <EspecificacionesDisplay value={presupuesto.especificaciones} />
                            </div>
                          )}
                        </div>
                      )}

                    {items.length > 0 ? (
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {items.map((item, index) => (
                            <motion.div
                              key={item.id || index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                              className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start gap-4">
                                {/* Imagen del equipo */}
                                <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                  {(item.imagen_url || (item as any).equipo_imagen_url) ? (
                                    <img src={item.imagen_url || (item as any).equipo_imagen_url} alt={item.descripcion} className="w-full h-full object-cover" />
                                  ) : (
                                    <Box className="h-8 w-8 text-gray-400" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-semibold text-sm">{item.descripcion}</p>
                                      {item.equipo && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {item.equipo.marca} - {item.equipo.modelo}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(item.precio_unitario * item.cantidad, monedaDeItem(item))}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {item.cantidad} x {formatCurrency(item.precio_unitario, monedaDeItem(item))}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Especificaciones del equipo: override del presupuesto, o
                                      las del catálogo si no se personalizó. Editables acá. */}
                                  {(item.equipo_id || item.equipo) && (() => {
                                    const ov = specsOverrides[item.id];
                                    const personalizada = ov ? ov.especificaciones_personalizada : !!item.especificaciones_personalizada;
                                    const override = ov ? ov.especificaciones : item.especificaciones;
                                    // Tras "Guardar en catálogo" el override trae las nuevas specs del equipo
                                    // para reflejarlas al instante (el prop todavía tiene las viejas).
                                    const equipoSpecs = ov && ov.equipo_especificaciones !== undefined
                                      ? ov.equipo_especificaciones
                                      : item.equipo_especificaciones;
                                    const resolved = ((personalizada
                                      ? override
                                      : equipoSpecs) || {}) as Record<string, unknown> | string[];
                                    const hasSpecs = Array.isArray(resolved)
                                      ? resolved.length > 0
                                      : Object.keys(resolved).length > 0;
                                    const specsAbierto = specsExpanded.has(item.id);
                                    return (
                                      <div className="mt-2">
                                        <div className="flex items-center justify-between mb-1">
                                          {hasSpecs ? (
                                            // Un solo toggle abre/cierra TODAS las specs del equipo.
                                            <button
                                              type="button"
                                              onClick={() => toggleSpecs(item.id)}
                                              aria-expanded={specsAbierto}
                                              className="flex items-center gap-2 text-left group/spec"
                                            >
                                              <ChevronDown
                                                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${specsAbierto ? "rotate-180" : ""}`}
                                              />
                                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover/spec:text-gray-800 dark:group-hover/spec:text-gray-200">
                                                Especificaciones
                                              </span>
                                              {personalizada && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                                  personalizada
                                                </span>
                                              )}
                                            </button>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                Especificaciones
                                              </span>
                                              {personalizada && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                                  personalizada
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          <Button
                                            htmlType="button"
                                            type="text"
                                            size="tiny"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => {
                                              setSpecsItem({
                                                id: item.id,
                                                equipo_id: item.equipo_id ?? null,
                                                descripcion: item.descripcion,
                                                especificaciones: (override ?? null) as Record<string, unknown> | string[] | null,
                                                especificaciones_personalizada: personalizada,
                                                equipo_especificaciones: item.equipo_especificaciones ?? null,
                                                equipo_categoria: item.equipo_categoria ?? null,
                                              });
                                              setSpecsOpen(true);
                                            }}
                                          >
                                            <Pencil className="h-3 w-3 mr-1" />
                                            {hasSpecs ? 'Editar' : 'Agregar'}
                                          </Button>
                                        </div>
                                        {hasSpecs ? (
                                          specsAbierto && (
                                            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                              <EspecificacionesDisplay value={resolved} />
                                            </div>
                                          )
                                        ) : (
                                          <p className="text-xs text-gray-400 italic">Sin especificaciones</p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Totales */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/20 mt-4"
                        >
                          {mixtoMonedas ? (
                            // Mezcla de monedas: un bloque Subtotal/IVA/Total por cada una.
                            <div className="space-y-4">
                              {totalesPorMoneda.map((t, idx) => (
                                <div key={t.moneda} className="space-y-2">
                                  {idx > 0 && (
                                    <Separator className="bg-emerald-200/50 dark:bg-emerald-800/30" />
                                  )}
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                                    <span className="font-mono">{formatCurrency(t.subtotal, t.moneda)}</span>
                                  </div>
                                  {t.iva > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600 dark:text-gray-400">IVA:</span>
                                      <span className="font-mono">{formatCurrency(t.iva, t.moneda)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-lg font-bold pt-1">
                                    <span className="text-emerald-800 dark:text-emerald-200">Total {t.moneda}:</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(t.total, t.moneda)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                              <span className="font-mono">{formatCurrency(subtotal, moneda)}</span>
                            </div>
                            {descuentoMonto > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento:</span>
                                <span className="font-mono">-{formatCurrency(descuentoMonto, moneda)}</span>
                              </div>
                            )}
                            {presupuesto.incluye_iva && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">IVA (21%):</span>
                                <span className="font-mono">{formatCurrency(ivaMonto, moneda)}</span>
                              </div>
                            )}
                            <Separator className="bg-emerald-200/50 dark:bg-emerald-800/30" />
                            <div className="flex justify-between text-lg font-bold pt-1">
                              <span className="text-emerald-800 dark:text-emerald-200">Total:</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(presupuesto.total || total, moneda)}
                              </span>
                            </div>
                          </div>
                          )}
                        </motion.div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay equipos en este presupuesto</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                {/* Tab Condiciones */}
                <TabsContent value="condiciones" className="space-y-4 mt-0 p-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Condiciones Comerciales */}
                    <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-700 dark:text-gray-300">
                        <Settings className="h-4 w-4 text-gray-500" />
                        Condiciones Comerciales
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {presupuesto.forma_pago && (
                          <div>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                              Forma de Pago
                            </Label>
                            <p className="font-medium text-sm mt-1">{presupuesto.forma_pago}</p>
                          </div>
                        )}
                        {presupuesto.tiempo_entrega && (
                          <div>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5 text-orange-500" />
                              Tiempo de Entrega
                            </Label>
                            <p className="font-medium text-sm mt-1">{presupuesto.tiempo_entrega}</p>
                          </div>
                        )}
                        {presupuesto.garantia && (
                          <div>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              Garantía
                            </Label>
                            <p className="font-medium text-sm mt-1">{presupuesto.garantia}</p>
                          </div>
                        )}
                        {presupuesto.lugar_entrega && (
                          <div>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-rose-500" />
                              Lugar de Entrega
                            </Label>
                            <p className="font-medium text-sm mt-1">{presupuesto.lugar_entrega}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Percent className="h-3.5 w-3.5 text-violet-500" />
                            Incluye IVA
                          </Label>
                          <p className={`font-medium text-sm mt-1 flex items-center gap-1.5 ${presupuesto.incluye_iva ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {presupuesto.incluye_iva ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {presupuesto.incluye_iva ? 'Sí' : 'No'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Wrench className="h-3.5 w-3.5 text-amber-500" />
                            Incluye Instalación
                          </Label>
                          <p className={`font-medium text-sm mt-1 flex items-center gap-1.5 ${presupuesto.incluye_instalacion ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {presupuesto.incluye_instalacion ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {presupuesto.incluye_instalacion ? 'Sí' : 'No'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-sky-500" />
                            Incluye Capacitación
                          </Label>
                          <p className={`font-medium text-sm mt-1 flex items-center gap-1.5 ${presupuesto.incluye_capacitacion ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {presupuesto.incluye_capacitacion ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {presupuesto.incluye_capacitacion ? 'Sí' : 'No'}
                          </p>
                        </div>
                        {presupuesto.validez_dias && (
                          <div>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <CalendarClock className="h-3.5 w-3.5 text-purple-500" />
                              Validez
                            </Label>
                            <p className="font-medium text-sm mt-1">{presupuesto.validez_dias} días</p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Observaciones */}
                    {presupuesto.observaciones && (
                      <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                        <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-700 dark:text-gray-300">
                          <FileText className="h-4 w-4 text-gray-500" />
                          Observaciones
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                          {presupuesto.observaciones}
                        </p>
                      </section>
                    )}

                    {/* Términos y Condiciones */}
                    {presupuesto.terminos_condiciones && (
                      <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                        <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-700 dark:text-gray-300">
                          <FileText className="h-4 w-4 text-gray-500" />
                          Términos y Condiciones
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                          {presupuesto.terminos_condiciones}
                        </p>
                      </section>
                    )}
                  </motion.div>
                </TabsContent>

                {/* Tab Estado */}
                <TabsContent value="estado" className="space-y-4 mt-0 p-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Estado Actual */}
                    <section className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2 text-emerald-900 dark:text-emerald-100">
                        <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Estado del Presupuesto
                      </h3>
                      <div className="flex items-center gap-3">
                        {getEstadoBadge(presupuesto.estado)}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          desde {formatDate(presupuesto.updated_at)}
                        </span>
                      </div>
                    </section>

                    {/* Firma */}
                    {presupuesto.firmado && (
                      <section className="space-y-3 p-4 border border-green-200/40 dark:border-green-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                        <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-green-200/50 dark:border-green-800/30 pb-2 text-green-900 dark:text-green-100">
                          <PenTool className="h-4 w-4 text-green-600 dark:text-green-400" />
                          Información de Firma
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Firmado por</Label>
                            <p className="font-medium text-sm mt-1">{presupuesto.firmado_por || '-'}</p>
                          </div>
                          {presupuesto.firmado_at && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Fecha de Firma</Label>
                              <p className="font-medium text-sm mt-1">{formatDateLong(presupuesto.firmado_at)}</p>
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    {/* Rechazo */}
                    {presupuesto.estado === 'rechazado' && presupuesto.motivo_rechazo && (
                      <section className="space-y-3 p-4 border border-red-200/40 dark:border-red-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                        <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-red-200/50 dark:border-red-800/30 pb-2 text-red-900 dark:text-red-100">
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          Motivo de Rechazo
                        </h3>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {presupuesto.motivo_rechazo}
                        </p>
                      </section>
                    )}

                    {/* Vistas */}
                    {presupuesto.estado === 'visto' && (
                      <section className="space-y-3 p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                        <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-amber-200/50 dark:border-amber-800/30 pb-2 text-amber-900 dark:text-amber-100">
                          <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          Información de Visualización
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          El cliente ha visto este presupuesto
                        </p>
                      </section>
                    )}
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Footer eliminado: Editar y Cerrar ya viven como iconos arriba a la derecha del sheet. */}
        </SheetContent>
      </Sheet>

      {/* Editor de especificaciones por equipo (mini-dialog) */}
      <EspecificacionesItemDialog
        open={specsOpen}
        onOpenChange={(o) => {
          setSpecsOpen(o);
          if (!o) setSpecsItem(null);
        }}
        item={specsItem}
        onSaved={(result) => {
          setSpecsOverrides((prev) => ({
            ...prev,
            [result.item_id]: {
              especificaciones: result.especificaciones,
              especificaciones_personalizada: result.especificaciones_personalizada,
              ...(result.catalogo_especificaciones !== undefined
                ? { equipo_especificaciones: result.catalogo_especificaciones }
                : {}),
            },
          }));
          onRefresh?.();
        }}
      />

      {/* Compositor de email "fluido": asunto + mensaje + destinatarios (mismo que facturas) */}
      <SendEmailDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        defaultTo={emailSugeridos}
        defaultSubject={`Presupuesto ${presupuesto.numero}`}
        defaultBody={`Le enviamos el presupuesto #${presupuesto.numero} con el detalle de los equipos solicitados. Quedamos a disposición ante cualquier consulta.`}
        attachmentName={`Presupuesto_${presupuesto.numero}.pdf`}
        onSend={handleSendFluido}
      />

      <PdfPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        url={`/api/presupuestos-equipos/pdf?id=${presupuesto.id}&inline=1`}
        downloadUrl={`/api/presupuestos-equipos/pdf?id=${presupuesto.id}`}
        titulo={`Presupuesto ${presupuesto.numero}`}
      />

      <EnviarWhatsappDialog
        open={showWhatsapp}
        onOpenChange={setShowWhatsapp}
        presupuestoId={presupuesto.id}
        presupuestoNumero={presupuesto.numero}
        onEnviado={() => onRefresh?.()}
      />
    </>
  );
}
