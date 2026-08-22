"use client";

import { EquipoServicioTecnico } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  User,
  Box,
  DollarSign,
  Wrench,
  MapPin,
  Star,
  FileText,
  Cloud,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { generateEquipoServicioTecnicoPDF } from "@/lib/pdf-generator";
import { useSession } from "@/lib/hooks/use-session";
import DriveFileUpload from "./DriveFileUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { sheetClasses } from "@/lib/design-system";
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
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
} from "./DetailSheetComponents";
import { ExpandableEmailButton } from "./ExpandableEmailButton";
import { useRouter } from "next/navigation";
import React from "react";

interface ServicioTecnicoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: EquipoServicioTecnico | null;
  onEdit?: (servicio: EquipoServicioTecnico) => void;
  onSuccess?: () => void;
}

const estadoConfig: Record<string, { bg: string; text: string; icon: any }> = {
  solicitado: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    icon: Clock,
  },
  programado: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    icon: Calendar,
  },
  en_ruta: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    icon: MapPin,
  },
  en_proceso: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    icon: Wrench,
  },
  completado: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  cancelado: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    icon: AlertCircle,
  },
  reprogramado: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    icon: Calendar,
  },
};

const prioridadConfig: Record<string, { bg: string; text: string }> = {
  baja: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
  },
  media: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  alta: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
  },
  urgente: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
  },
};

const tipoLabels: Record<string, string> = {
  mantenimiento_preventivo: "Mantenimiento Preventivo",
  mantenimiento_correctivo: "Mantenimiento Correctivo",
  reparacion: "Reparación",
  instalacion: "Instalación",
  desinstalacion: "Desinstalación",
  calibracion: "Calibración",
  inspeccion: "Inspección",
  capacitacion: "Capacitación",
};

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  } catch {
    return "-";
  }
}

function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
  } catch {
    return "-";
  }
}

export function ServicioTecnicoDetailSheet({
  open,
  onOpenChange,
  servicio,
  onEdit,
  onSuccess,
}: ServicioTecnicoDetailSheetProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Obtener emails del cliente como array
  const clienteEmails: string[] = React.useMemo(() => {
    if (!servicio) return [];
    const email = servicio.cliente?.email;
    if (!email) return [];
    if (Array.isArray(email)) return email.filter(Boolean);
    return [email].filter(Boolean);
  }, [servicio?.cliente?.email]);

  if (!servicio) return null;

  const estadoStyle = estadoConfig[servicio.estado] || estadoConfig.solicitado;
  const prioridadStyle = prioridadConfig[servicio.prioridad] || prioridadConfig.media;
  const EstadoIcon = estadoStyle.icon;

  const handleEdit = () => {
    onEdit?.(servicio);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/equipos-servicios-tecnicos/${servicio.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar servicio técnico");
      }

      toast.success("Servicio técnico eliminado correctamente");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncingCalendar(true);
    try {
      const event = {
        summary: `${tipoLabels[servicio.tipo]} - ${servicio.equipo_unidad?.codigo}`,
        description: `${servicio.motivo || ""}\n\nEquipo: ${
          servicio.equipo_unidad?.equipo?.marca
        } ${servicio.equipo_unidad?.equipo?.modelo}\nCliente: ${
          servicio.equipo_unidad?.contrato?.cliente?.nombre || "N/A"
        }`,
        location: servicio.ubicacion_servicio || undefined,
        start: servicio.fecha_programada,
        end: servicio.fecha_finalizacion || servicio.fecha_programada,
        attendees: servicio.tecnico_nombre
          ? [{ email: "", displayName: servicio.tecnico_nombre }]
          : undefined,
      };

      const res = await fetch("/api/google/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "servicio_tecnico",
          entityId: servicio.id,
          event,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al sincronizar con Google Calendar");
      }

      toast.success("Servicio sincronizado con Google Calendar");
    } catch (error: any) {
      toast.error(
        error.message ||
          "Error al sincronizar. Verifica que hayas conectado Google Calendar en Configuración."
      );
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const doc = await generateEquipoServicioTecnicoPDF(servicio, orgId);
      const fileName = `servicio-${
        servicio.equipo_unidad?.codigo || servicio.id.slice(0, 8)
      }-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF descargado correctamente");
    } catch (error: any) {
      toast.error("Error al generar PDF");
      console.error("Error generando PDF:", error);
    }
  };

  const handleSendEmail = async (email: string) => {
    const toastId = toast.loading(`Enviando a ${email}...`);
    try {
      const res = await fetch("/api/equipos-servicios-tecnicos/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicio_id: servicio.id,
          email_destino: email,
          adjuntar_pdf: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar email");
      }

      toast.success(`Email enviado a ${email}`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Error al enviar email", { id: toastId });
    }
  };

  const navigateTo = (path: string) => {
    onOpenChange(false);
    setTimeout(() => router.push(path), 300);
  };

  return (
    <>
      <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="purple">
        <DetailSheetHeader
          icon={Wrench}
          title={tipoLabels[servicio.tipo] || servicio.tipo}
          theme="purple"
          subtitle={
            <span className="font-mono text-xs">
              {servicio.equipo_unidad?.codigo || "Sin código"}
            </span>
          }
          badges={
            <>
              <Badge className={cn(estadoStyle.bg, estadoStyle.text, "gap-1")}>
                <EstadoIcon className="h-3 w-3" />
                {servicio.estado
                  ?.replace(/_/g, " ")
                  .charAt(0)
                  .toUpperCase() +
                  servicio.estado?.replace(/_/g, " ").slice(1)}
              </Badge>
              <Badge className={cn(prioridadStyle.bg, prioridadStyle.text)}>
                {servicio.prioridad?.charAt(0).toUpperCase() +
                  servicio.prioridad?.slice(1)}
              </Badge>
            </>
          }
          onEdit={handleEdit}
          onDelete={() => setShowDeleteDialog(true)}
          actions={
            <>
              <Button type="outline" size="tiny" onClick={handleExportPDF}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <ExpandableEmailButton
                emails={clienteEmails}
                onSendEmail={handleSendEmail}
              />
              <Button
                type="outline"
                size="tiny"
                onClick={handleSyncCalendar}
                disabled={isSyncingCalendar}
              >
                {isSyncingCalendar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Calendar className="h-3.5 w-3.5" />
                )}
              </Button>
            </>
          }
        />

        <DetailSheetContent>
          <Tabs defaultValue="detalles" className="w-full">
            <TabsList className={cn(sheetClasses.tabsList, "grid-cols-2 mb-4")}>
              <TabsTrigger
                value="detalles"
                className={cn(sheetClasses.tabsTrigger, "gap-1.5")}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">Detalles</span>
              </TabsTrigger>
              <TabsTrigger
                value="archivos"
                className={cn(sheetClasses.tabsTrigger, "gap-1.5")}
              >
                <Cloud className="w-4 h-4" />
                <span className="text-sm">Archivos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detalles" className="space-y-4 mt-0">
              {/* Equipo Info */}
              <DetailSheetSection icon={Box} title="Equipo" theme="teal">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DetailSheetInfoItem
                    icon={Hash}
                    label="Código"
                    theme="teal"
                    value={
                      <span className="font-mono">
                        {servicio.equipo_unidad?.codigo || "-"}
                      </span>
                    }
                  />
                  <DetailSheetInfoItem
                    icon={Box}
                    label="Marca/Modelo"
                    theme="teal"
                    value={`${servicio.equipo_unidad?.equipo?.marca || ""} ${
                      servicio.equipo_unidad?.equipo?.modelo || ""
                    }`.trim() || "-"}
                  />
                  <DetailSheetInfoItem
                    icon={Hash}
                    label="N° Serie"
                    theme="gray"
                    value={
                      <span className="font-mono">
                        {servicio.equipo_unidad?.numero_serie || "-"}
                      </span>
                    }
                  />
                  {servicio.equipo_unidad?.equipo?.tipo && (
                    <DetailSheetInfoItem
                      icon={Box}
                      label="Tipo"
                      theme="gray"
                      value={servicio.equipo_unidad.equipo.tipo}
                    />
                  )}
                </div>
              </DetailSheetSection>

              {/* Cliente Info */}
              {servicio.cliente && (
                <DetailSheetSection
                  icon={User}
                  title="Cliente"
                  theme="indigo"
                  action={
                    servicio.cliente_id && (
                      <Button
                        type="outline"
                        size="tiny"
                        onClick={() =>
                          navigateTo(`/dashboard/empresas?id=${servicio.cliente_id}`)
                        }
                      >
                        Ver empresa
                      </Button>
                    )
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <DetailSheetInfoItem
                      icon={User}
                      label="Nombre"
                      theme="indigo"
                      value={
                        <span className="font-medium">
                          {servicio.cliente.nombre_fantasia ||
                            servicio.cliente.nombre}
                        </span>
                      }
                    />
                    {servicio.cliente.telefono &&
                      servicio.cliente.telefono.length > 0 && (
                        <DetailSheetInfoItem
                          icon={Phone}
                          label="Teléfono"
                          theme="emerald"
                          value={
                            <a
                              href={`tel:${servicio.cliente.telefono[0]}`}
                              className="text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              {servicio.cliente.telefono[0]}
                            </a>
                          }
                        />
                      )}
                    {servicio.cliente.direccion && (
                      <DetailSheetInfoItem
                        icon={MapPin}
                        label="Dirección"
                        theme="gray"
                        value={servicio.cliente.direccion}
                      />
                    )}
                  </div>
                </DetailSheetSection>
              )}

              {/* Fechas */}
              <DetailSheetSection icon={Calendar} title="Fechas" theme="blue">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DetailSheetInfoItem
                    icon={Calendar}
                    label="Solicitud"
                    theme="blue"
                    value={formatDateShort(servicio.fecha_solicitud)}
                  />
                  {servicio.fecha_programada && (
                    <DetailSheetInfoItem
                      icon={Calendar}
                      label="Programada"
                      theme="purple"
                      value={
                        <span className="font-medium text-purple-600 dark:text-purple-400">
                          {formatDate(servicio.fecha_programada)}
                        </span>
                      }
                    />
                  )}
                  {servicio.fecha_inicio && (
                    <DetailSheetInfoItem
                      icon={Clock}
                      label="Inicio"
                      theme="amber"
                      value={formatDateShort(servicio.fecha_inicio)}
                    />
                  )}
                  {servicio.fecha_finalizacion && (
                    <DetailSheetInfoItem
                      icon={CheckCircle2}
                      label="Finalización"
                      theme="emerald"
                      value={formatDateShort(servicio.fecha_finalizacion)}
                    />
                  )}
                </div>
              </DetailSheetSection>

              {/* Técnico */}
              <DetailSheetSection icon={Wrench} title="Técnico Asignado" theme="orange">
                <div className="grid grid-cols-2 gap-3">
                  <DetailSheetInfoItem
                    icon={User}
                    label="Técnico"
                    theme="orange"
                    value={
                      servicio.tecnico_nombre || (
                        <span className="text-amber-600 dark:text-amber-400">
                          Sin asignar
                        </span>
                      )
                    }
                  />
                  {servicio.equipo_tecnico && (
                    <DetailSheetInfoItem
                      icon={Wrench}
                      label="Equipo"
                      theme="orange"
                      value={servicio.equipo_tecnico}
                    />
                  )}
                </div>
              </DetailSheetSection>

              {/* Costos */}
              <DetailSheetSection icon={DollarSign} title="Costos" theme="emerald">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DetailSheetInfoItem
                    icon={DollarSign}
                    label="Precio"
                    theme="emerald"
                    value={`$${(servicio.costo_mano_obra || 0).toLocaleString(
                      "es-AR",
                      { minimumFractionDigits: 2 }
                    )}`}
                  />
                  <DetailSheetInfoItem
                    icon={DollarSign}
                    label="Repuestos"
                    theme="amber"
                    value={`$${(servicio.costo_repuestos || 0).toLocaleString(
                      "es-AR",
                      { minimumFractionDigits: 2 }
                    )}`}
                  />
                  <DetailSheetInfoItem
                    icon={DollarSign}
                    label="Total"
                    theme="emerald"
                    value={
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        $
                        {(servicio.costo_total || 0).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    }
                  />
                  <DetailSheetInfoItem
                    icon={FileText}
                    label="Facturado"
                    theme="gray"
                    value={
                      <Badge
                        variant={servicio.facturado ? "default" : "outline"}
                        className={
                          servicio.facturado
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                        }
                      >
                        {servicio.facturado ? "Sí" : "Pendiente"}
                      </Badge>
                    }
                  />
                </div>
              </DetailSheetSection>

              {/* Ubicación */}
              {(servicio.ubicacion_servicio || servicio.latitud) && (
                <DetailSheetSection icon={MapPin} title="Ubicación" theme="cyan">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {servicio.ubicacion_servicio && (
                      <DetailSheetInfoItem
                        icon={MapPin}
                        label="Dirección"
                        theme="cyan"
                        value={servicio.ubicacion_servicio}
                      />
                    )}
                    {servicio.latitud && servicio.longitud && (
                      <DetailSheetInfoItem
                        icon={MapPin}
                        label="Coordenadas"
                        theme="gray"
                        value={
                          <span className="font-mono text-xs">
                            {servicio.latitud}, {servicio.longitud}
                          </span>
                        }
                      />
                    )}
                  </div>
                </DetailSheetSection>
              )}

              {/* Diagnóstico y detalles */}
              {(servicio.motivo ||
                servicio.diagnostico ||
                servicio.trabajo_realizado ||
                servicio.recomendaciones) && (
                <DetailSheetSection
                  icon={FileText}
                  title="Diagnóstico y Observaciones"
                  theme="gray"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {servicio.motivo && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          Motivo
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {servicio.motivo}
                        </p>
                      </div>
                    )}
                    {servicio.diagnostico && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          Diagnóstico
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {servicio.diagnostico}
                        </p>
                      </div>
                    )}
                    {servicio.trabajo_realizado && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          Trabajo Realizado
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {servicio.trabajo_realizado}
                        </p>
                      </div>
                    )}
                    {servicio.recomendaciones && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          Recomendaciones
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {servicio.recomendaciones}
                        </p>
                      </div>
                    )}
                  </div>
                </DetailSheetSection>
              )}

              {/* Calificación */}
              {servicio.calificacion_cliente && (
                <DetailSheetSection
                  icon={Star}
                  title="Calificación del Cliente"
                  theme="amber"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-5 w-5 transition-colors",
                            i < servicio.calificacion_cliente!
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300 dark:text-gray-600"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {servicio.calificacion_cliente}/5
                    </span>
                  </div>
                  {servicio.comentarios_cliente && (
                    <p className="text-gray-600 dark:text-gray-400 italic mt-2">
                      "{servicio.comentarios_cliente}"
                    </p>
                  )}
                </DetailSheetSection>
              )}

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex justify-between">
                  <span>Creado:</span>
                  <span>{formatDateShort(servicio.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actualizado:</span>
                  <span>{formatDateShort(servicio.updated_at)}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="archivos" className="space-y-4 mt-0">
              <DetailSheetSection icon={Cloud} title="Archivos en Google Drive" theme="blue">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Fotos, documentos y archivos relacionados con este servicio técnico
                </p>
                <DriveFileUpload
                  entityType="servicio_tecnico"
                  entityId={Number(servicio.id)}
                  accept="image/*,.pdf,.doc,.docx"
                  maxSize={10}
                  multiple={true}
                />
              </DetailSheetSection>
            </TabsContent>
          </Tabs>
        </DetailSheetContent>
      </DetailSheetContainer>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio técnico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El servicio técnico será eliminado
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
