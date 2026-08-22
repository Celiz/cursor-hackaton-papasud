"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComentariosTimeline } from "./ComentariosTimeline";
import {
  TableSecondaryText,
  TableCodeText,
} from "@/components/core-ui/TableTextTruncate";
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import {
  Package,
  Truck,
  Calendar,
  MapPin,
  FileText,
  MessageSquare,
  Activity,
  Paperclip,
  Edit,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ListChecks,
  DollarSign,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar datos");
  return Array.isArray(data) ? data : [];
};

interface EnvioItem {
  id: string;
  descripcion: string;
  cantidad_pedida: number;
  cantidad_enviada: number;
  cantidad_recibida?: number;
  diferencia: boolean;
  motivo_diferencia?: string;
  observaciones?: string;
}

interface Comentario {
  id: string;
  usuario_nombre: string;
  comentario: string;
  tipo: string;
  es_importante: boolean;
  requiere_accion: boolean;
  created_at: string;
}

interface EnvioEvento {
  id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  ubicacion?: string;
}

interface Envio {
  id: string;
  numero_seguimiento: string;
  cliente_nombre?: string;
  transporte_nombre?: string;
  estado: string;
  tipo_envio: string;
  direccion_origen: string;
  direccion_destino: string;
  fecha_despacho: string;
  fecha_entrega_estimada?: string;
  fecha_entrega_real?: string;
  fecha_estimada?: string;
  fecha_entrega?: string;
  observaciones?: string;
  costo_envio?: number;
  costo?: number;
  peso?: number;
  peso_total_gramos?: number;
  dimensiones?: string;
  eventos?: EnvioEvento[];
  created_at: string;
}

interface EnvioDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envio: Envio | null;
  onUpdate?: () => void;
}

const estadoConfig: Record<string, { label: string; icon: any; color: string }> = {
  pendiente: { label: "Pendiente", icon: AlertCircle, color: "bg-gray-500" },
  preparando: { label: "Preparando", icon: Package, color: "bg-blue-500" },
  listo_para_enviar: { label: "Listo para Enviar", icon: CheckCircle2, color: "bg-purple-500" },
  despachado: { label: "Despachado", icon: Truck, color: "bg-amber-500" },
  en_transito: { label: "En Transito", icon: Truck, color: "bg-orange-500" },
  en_distribucion: { label: "En Distribucion", icon: Truck, color: "bg-yellow-500" },
  enviado: { label: "Enviado", icon: Truck, color: "bg-blue-500" },
  entregado: { label: "Entregado", icon: CheckCircle2, color: "bg-green-500" },
  cancelado: { label: "Cancelado", icon: XCircle, color: "bg-red-500" },
  devuelto: { label: "Devuelto", icon: XCircle, color: "bg-red-500" },
};

const estadoPillColors: Record<string, { pill: string; dot: string }> = {
  pendiente: { pill: "bg-gray-500/10 text-gray-600 dark:text-gray-400", dot: "bg-gray-400" },
  preparando: { pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  listo_para_enviar: { pill: "bg-purple-500/10 text-purple-600 dark:text-purple-400", dot: "bg-purple-500" },
  despachado: { pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  en_transito: { pill: "bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  en_distribucion: { pill: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" },
  enviado: { pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  entregado: { pill: "bg-green-500/10 text-green-600 dark:text-green-400", dot: "bg-green-500" },
  cancelado: { pill: "bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-500" },
  devuelto: { pill: "bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-500" },
};

const tipoEnvioLabels: Record<string, string> = {
  nacional: "Nacional",
  internacional: "Internacional",
  retiro_local: "Retiro Local",
  retiro_deposito: "Retiro Deposito",
};

export function EnvioDetailSheet({
  open,
  onOpenChange,
  envio,
  onUpdate,
}: EnvioDetailSheetProps) {
  const [activeTab, setActiveTab] = useState("resumen");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch items for this envio
  const { data: items = [], mutate: mutateItems } = useSWR(
    envio ? `/api/envios/${envio.id}/items` : null,
    fetcher
  );

  // Fetch comentarios for this envio
  const { data: comentarios = [], mutate: mutateComentarios } = useSWR(
    envio ? `/api/comentarios?entidad_tipo=envio&entidad_id=${envio.id}` : null,
    fetcher
  );

  const handleNewComentario = async (comentario: string, tipo: string) => {
    if (!envio) return;

    try {
      const res = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidad_tipo: "envio",
          entidad_id: envio.id,
          usuario_nombre: "Usuario Actual", // TODO: get from session
          comentario,
          tipo,
          es_importante: tipo === "alerta",
          requiere_accion: tipo === "alerta",
          visible_cliente: tipo === "cliente" || tipo === "publico",
        }),
      });

      if (!res.ok) throw new Error("Error al crear comentario");

      toast.success("Comentario agregado exitosamente");
      mutateComentarios();
    } catch (error) {
      toast.error("Error al agregar comentario");
      throw error;
    }
  };

  const handleUpdateEstado = async (nuevoEstado: string) => {
    if (!envio) return;
    setIsUpdating(true);
    try {
      const res = await fetch('/api/envios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: envio.id, estado: nuevoEstado }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar');
      }
      toast.success(`Estado actualizado a "${nuevoEstado}"`);
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar envío');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!envio) return null;

  const estadoInfo = estadoConfig[envio.estado] || estadoConfig.pendiente;
  const pillColors = estadoPillColors[envio.estado] || estadoPillColors.pendiente;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] md:h-[90vh] p-0"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 py-3 border-b border-purple-200/50 dark:border-purple-800/30 shrink-0 overflow-visible">
            <div className="flex items-center gap-3 pr-8">
              <div className="flex items-center gap-3 min-w-0">
                <SheetTitle className="text-lg font-semibold text-foreground shrink-0">
                  Envio
                </SheetTitle>
                <TableCodeText className="shrink-0">
                  #{envio.numero_seguimiento}
                </TableCodeText>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold",
                    pillColors.pill
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", pillColors.dot)} />
                  {estadoInfo.label}
                </span>
              </div>

              {/* Right side: tipo badge + actions */}
              <div className="flex items-center gap-1.5 ml-auto shrink-0 overflow-visible relative z-10">
                {envio.tipo_envio && (
                  <>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {tipoEnvioLabels[envio.tipo_envio] || envio.tipo_envio}
                    </Badge>
                    <div className="w-px h-5 bg-border mx-0.5" />
                  </>
                )}
                {envio.estado === 'despachado' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateEstado('en_transito')}
                    disabled={isUpdating}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    icon={<Truck />}
                  >
                    En Tránsito
                  </Button>
                )}
                {envio.estado === 'en_transito' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateEstado('entregado')}
                    disabled={isUpdating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    icon={<CheckCircle2 />}
                  >
                    Marcar Entregado
                  </Button>
                )}
                {['pendiente', 'preparando', 'listo_para_enviar'].includes(envio.estado) && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateEstado('despachado')}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    icon={<Truck />}
                  >
                    Despachar
                  </Button>
                )}
              </div>
            </div>

            {/* Subtitle: cliente */}
            {envio.cliente_nombre && (
              <p className="text-xs text-muted-foreground mt-1">
                {envio.cliente_nombre}
              </p>
            )}
          </SheetHeader>

          {/* Body */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={cn(sheetClasses.tabsList, "grid-cols-5")}>
                  <TabsTrigger value="resumen" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Resumen</span>
                  </TabsTrigger>
                  <TabsTrigger value="items" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <ListChecks className="w-4 h-4" />
                    <span className="text-sm">Items</span>
                  </TabsTrigger>
                  <TabsTrigger value="comentarios" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">Comentarios</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <Activity className="w-4 h-4" />
                    <span className="text-sm">Timeline</span>
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm">Documentos</span>
                  </TabsTrigger>
                </TabsList>

                {/* RESUMEN TAB */}
                <TabsContent value="resumen" className="mt-4">
                  <motion.div
                    key={envio.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    {/* Two-column grid: Transporte + Direcciones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Transporte Card (blue theme) */}
                      <div className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-900 dark:to-blue-950/10 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all">
                        <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-800/30 pb-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Transporte
                          </h3>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <TableSecondaryText>Nombre</TableSecondaryText>
                            <p className="font-medium text-sm mt-0.5">
                              {envio.transporte_nombre || "Sin transporte asignado"}
                            </p>
                          </div>
                          <div>
                            <TableSecondaryText>N.o Seguimiento</TableSecondaryText>
                            <TableCodeText className="block mt-0.5">
                              {envio.numero_seguimiento}
                            </TableCodeText>
                          </div>
                          <div>
                            <TableSecondaryText>Tipo de Envio</TableSecondaryText>
                            <p className="font-medium text-sm mt-0.5">
                              {tipoEnvioLabels[envio.tipo_envio] || envio.tipo_envio}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Direcciones Card (purple theme) */}
                      <div className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm hover:shadow-md hover:shadow-purple-500/10 transition-all">
                        <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/30 pb-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
                            <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            Direcciones
                          </h3>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <TableSecondaryText>Origen</TableSecondaryText>
                            <p className="font-medium text-sm mt-0.5">
                              {envio.direccion_origen}
                            </p>
                          </div>
                          <div>
                            <TableSecondaryText>Destino</TableSecondaryText>
                            <p className="font-medium text-sm mt-0.5">
                              {envio.direccion_destino}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Two-column grid: Fechas + Detalles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Fechas Card (cyan theme) */}
                      <div className="space-y-3 p-4 border border-cyan-200/40 dark:border-cyan-800/30 rounded-xl bg-gradient-to-br from-white to-cyan-50/20 dark:from-gray-900 dark:to-cyan-950/10 shadow-sm hover:shadow-md hover:shadow-cyan-500/10 transition-all">
                        <div className="flex items-center justify-between border-b border-cyan-200/50 dark:border-cyan-800/30 pb-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-cyan-900 dark:text-cyan-100">
                            <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            Fechas
                          </h3>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <TableSecondaryText>Despacho</TableSecondaryText>
                            <p className="font-medium text-sm mt-0.5">
                              {new Date(envio.fecha_despacho).toLocaleDateString("es-AR")}
                            </p>
                          </div>
                          {(envio.fecha_entrega_estimada || envio.fecha_estimada) && (
                            <div>
                              <TableSecondaryText>Estimada</TableSecondaryText>
                              <p className="font-medium text-sm mt-0.5">
                                {new Date(envio.fecha_entrega_estimada || envio.fecha_estimada!).toLocaleDateString("es-AR")}
                              </p>
                            </div>
                          )}
                          {(envio.fecha_entrega_real || envio.fecha_entrega) && (
                            <div>
                              <TableSecondaryText>Entregado</TableSecondaryText>
                              <div className="flex items-center gap-2 mt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                <p className="font-medium text-sm text-green-700 dark:text-green-400">
                                  {new Date(envio.fecha_entrega_real || envio.fecha_entrega!).toLocaleDateString("es-AR")}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Detalles Card (emerald theme) */}
                      <div className="space-y-3 p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/10 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transition-all">
                        <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                            <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Detalles
                          </h3>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <TableSecondaryText>Peso</TableSecondaryText>
                            <p className="font-medium text-sm mt-0.5">
                              {envio.peso
                                ? `${envio.peso} kg`
                                : envio.peso_total_gramos
                                  ? `${envio.peso_total_gramos} g`
                                  : "-"}
                            </p>
                          </div>
                          <div>
                            <TableSecondaryText>Dimensiones</TableSecondaryText>
                            <p className={cn("font-medium text-sm mt-0.5", !envio.dimensiones && "text-muted-foreground")}>
                              {envio.dimensiones || "-"}
                            </p>
                          </div>
                          <div>
                            <TableSecondaryText>Costo Envio</TableSecondaryText>
                            <p className={cn("font-medium text-sm mt-0.5", !(envio.costo_envio || envio.costo) && "text-muted-foreground")}>
                              {(envio.costo_envio || envio.costo)
                                ? `$${(envio.costo_envio || envio.costo)!.toLocaleString("es-AR")}`
                                : "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Observaciones (amber theme) */}
                    {envio.observaciones && (
                      <div className="space-y-3 p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-gradient-to-br from-white to-amber-50/20 dark:from-gray-900 dark:to-amber-950/10 shadow-sm">
                        <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/30 pb-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-900 dark:text-amber-100">
                            <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            Observaciones
                          </h3>
                        </div>
                        <p className="text-sm text-amber-900 dark:text-amber-100">
                          {envio.observaciones}
                        </p>
                      </div>
                    )}

                    {/* Eventos (rose theme) */}
                    {envio.eventos && envio.eventos.length > 0 && (
                      <div className="space-y-3 p-4 border border-rose-200/40 dark:border-rose-800/30 rounded-xl bg-gradient-to-br from-white to-rose-50/20 dark:from-gray-900 dark:to-rose-950/10 shadow-sm">
                        <div className="flex items-center justify-between border-b border-rose-200/50 dark:border-rose-800/30 pb-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-rose-900 dark:text-rose-100">
                            <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            Eventos
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {envio.eventos.length}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {envio.eventos.map((evento, idx) => (
                            <motion.div
                              key={evento.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-start gap-3 p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg"
                            >
                              <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{evento.descripcion}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <TableSecondaryText>
                                    {new Date(evento.fecha).toLocaleString("es-AR")}
                                  </TableSecondaryText>
                                  {evento.ubicacion && (
                                    <TableSecondaryText>
                                      {evento.ubicacion}
                                    </TableSecondaryText>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                {/* ITEMS TAB */}
                <TabsContent value="items" className="mt-4">
                  <div className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm">
                    <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/30 pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
                        <ListChecks className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Items del Envio
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {items.length} items
                        </Badge>
                        <Button variant="outline" size="sm" icon={<Package />}>
                          Agregar Item
                        </Button>
                      </div>
                    </div>

                    {items.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
                        <Package className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                        <p className="text-muted-foreground text-sm">
                          No hay items registrados para este envio
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item: any, idx: number) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn(
                              "p-3 bg-white dark:bg-gray-900 border rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors",
                              item.diferencia
                                ? "border-red-200 dark:border-red-800/50"
                                : "border-gray-200 dark:border-gray-800"
                            )}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold text-sm">{item.descripcion}</p>
                                {item.observaciones && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.observaciones}
                                  </p>
                                )}
                              </div>
                              {item.diferencia && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  Diferencia
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 border border-gray-100 dark:border-gray-800">
                                <TableSecondaryText>Pedida</TableSecondaryText>
                                <p className="text-sm font-semibold mt-0.5">{item.cantidad_pedida}</p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 border border-gray-100 dark:border-gray-800">
                                <TableSecondaryText>Enviada</TableSecondaryText>
                                <p className="text-sm font-semibold mt-0.5">{item.cantidad_enviada}</p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 border border-gray-100 dark:border-gray-800">
                                <TableSecondaryText>Recibida</TableSecondaryText>
                                <p className="text-sm font-semibold mt-0.5">
                                  {item.cantidad_recibida ?? "-"}
                                </p>
                              </div>
                            </div>

                            {item.motivo_diferencia && (
                              <div className="mt-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                                  Motivo de Diferencia:
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-300">
                                  {item.motivo_diferencia}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* COMENTARIOS TAB */}
                <TabsContent value="comentarios" className="mt-4">
                  <ComentariosTimeline
                    entidadTipo="envio"
                    entidadId={envio.id}
                    comentarios={comentarios}
                    onNewComentario={handleNewComentario}
                  />
                </TabsContent>

                {/* TIMELINE TAB */}
                <TabsContent value="timeline" className="mt-4">
                  <div className="space-y-3 p-4 border border-cyan-200/40 dark:border-cyan-800/30 rounded-xl bg-gradient-to-br from-white to-cyan-50/20 dark:from-gray-900 dark:to-cyan-950/10 shadow-sm">
                    <div className="flex items-center justify-between border-b border-cyan-200/50 dark:border-cyan-800/30 pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-cyan-900 dark:text-cyan-100">
                        <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        Historial de Actividad
                      </h3>
                    </div>
                    <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
                      <Activity className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                      <p className="text-muted-foreground text-sm">
                        No hay actividad registrada
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* DOCUMENTOS TAB */}
                <TabsContent value="documentos" className="mt-4">
                  <div className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-900 dark:to-blue-950/10 shadow-sm">
                    <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-800/30 pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                        <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Documentos Adjuntos
                      </h3>
                      <Button variant="outline" size="sm" icon={<Paperclip />}>
                        Adjuntar
                      </Button>
                    </div>
                    <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
                      <Paperclip className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                      <p className="text-muted-foreground text-sm">
                        No hay documentos adjuntos
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
