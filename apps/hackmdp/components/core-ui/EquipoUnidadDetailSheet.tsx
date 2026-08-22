"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EquipoUnidad } from "@/lib/types";
import {
  Monitor,
  User,
  Calendar,
  Edit,
  Trash2,
  History,
  Loader2,
  ExternalLink,
  FileBox,
  Wrench,
  TruckIcon,
  Bell,
  Clock,
  Building2,
  MapPin,
  FlaskConical,
  FileText,
  Hash,
  Box,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetItemCard,
  DetailSheetEmptyState,
  DetailSheetLoading,
  DetailSheetStatCard,
  DetailSheetInfoItem,
} from "./DetailSheetComponents";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface EquipoUnidadDetailSheetProps {
  equipoUnidad: EquipoUnidad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (equipoUnidad: EquipoUnidad) => void;
  onDelete?: (equipoUnidad: EquipoUnidad) => void;
}

export function EquipoUnidadDetailSheet({
  equipoUnidad,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EquipoUnidadDetailSheetProps) {
  const router = useRouter();
  const [historial, setHistorial] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Fetch historial when sheet opens
  useEffect(() => {
    if (open && equipoUnidad?.id) {
      setLoadingHistorial(true);
      fetch(`/api/equipos-unidades/${equipoUnidad.id}/historial`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            // Transform servicios to timeline format
            const timelineEvents = data.map((servicio: any) => ({
              id: servicio.id,
              type: "servicio",
              title: servicio.tipo_servicio === "reparacion"
                ? "Reparación"
                : servicio.tipo_servicio === "mantenimiento"
                  ? "Mantenimiento"
                  : servicio.tipo_servicio === "instalacion"
                    ? "Instalación"
                    : servicio.tipo_servicio || "Servicio",
              description: servicio.diagnostico || servicio.falla_declarada || "Sin descripción",
              date: servicio.fecha,
              status: servicio.estado === "completado"
                ? "Completado"
                : servicio.estado === "en_progreso"
                  ? "En progreso"
                  : servicio.estado === "pendiente"
                    ? "Pendiente"
                    : servicio.estado || "Pendiente",
              servicioId: servicio.id,
              data: {
                tecnico: servicio.tecnico || "Sin asignar",
                tipo: servicio.tipo_servicio || "servicio",
                monto_servicio: servicio.precio || 0,
              },
            }));
            setHistorial(timelineEvents);
          }
        })
        .catch((err) => console.error("Error loading historial:", err))
        .finally(() => setLoadingHistorial(false));
    }
  }, [open, equipoUnidad?.id]);

  // Servicios técnicos reales: la tabla equipos_servicios_tecnicos está vacía;
  // los servicios viven en `servicios`, filtrados por equipo_unidad_id. (Antes
  // este widget leía la tabla muerta y siempre mostraba 0, aunque el historial
  // sí listaba los servicios.)
  const { data: serviciosData, isLoading: loadingServicios } = useSWR(
    open && equipoUnidad?.id
      ? `/api/servicios?equipo_unidad_id=${equipoUnidad.id}&pageSize=5`
      : null,
    fetcher
  );

  const servicios = Array.isArray(serviciosData?.data)
    ? serviciosData.data
    : Array.isArray(serviciosData)
      ? serviciosData
      : [];

  // Reset historial when sheet closes
  useEffect(() => {
    if (!open) {
      setHistorial([]);
    }
  }, [open]);

  if (!equipoUnidad) return null;

  const navigateTo = (path: string) => {
    onOpenChange(false);
    setTimeout(() => router.push(path), 300);
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "en uso":
      case "operativo":
        return "default";
      case "en reparacion":
      case "en_reparacion":
        return "destructive";
      case "stock":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getServicioEstadoColor = (estado: string) => {
    switch (estado) {
      case "completado":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
      case "en_progreso":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
      case "pendiente":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400";
    }
  };

  // Icon and color based on event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case "servicio":
        return <Wrench className="h-4 w-4 text-green-600" />;
      case "contrato":
        return <FileBox className="h-4 w-4 text-purple-600" />;
      case "servicio_tecnico":
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case "movimiento":
        return <TruckIcon className="h-4 w-4 text-orange-600" />;
      case "alerta":
        return <Bell className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventBgColor = (type: string) => {
    switch (type) {
      case "servicio":
        return "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700";
      case "contrato":
        return "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700";
      case "servicio_tecnico":
        return "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700";
      case "movimiento":
        return "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700";
      case "alerta":
        return "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700";
      default:
        return "bg-gray-100 border-gray-300 dark:bg-gray-900/30 dark:border-gray-700";
    }
  };

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="emerald">
      <DetailSheetHeader
        icon={Monitor}
        title={`${equipoUnidad.equipos?.marca || ""} ${equipoUnidad.equipos?.modelo || ""}`}
        theme="emerald"
        subtitle={
          <span className="text-xs text-muted-foreground font-mono">
            S/N: {equipoUnidad.numero_serie || equipoUnidad.codigo || "Sin serie"}
          </span>
        }
        badges={
          <>
            {equipoUnidad.equipos?.tipo && (
              <Badge variant="secondary" className="h-5 text-xs">
                {equipoUnidad.equipos.tipo}
              </Badge>
            )}
            <Badge
              variant={getEstadoBadgeVariant(equipoUnidad.estado_general || "")}
              className="h-5 text-xs"
            >
              {equipoUnidad.estado_general || "stock"}
            </Badge>
          </>
        }
        onEdit={onEdit ? () => onEdit(equipoUnidad) : undefined}
        onDelete={onDelete ? () => onDelete(equipoUnidad) : undefined}
      />

      <DetailSheetContent>
        {/* Información del Equipo */}
        <DetailSheetSection icon={Monitor} title="Información del Equipo" theme="emerald">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetInfoItem
              icon={Box}
              label="Marca"
              theme="emerald"
              value={<span className="capitalize">{equipoUnidad.equipos?.marca || "-"}</span>}
            />
            <DetailSheetInfoItem
              icon={Box}
              label="Modelo"
              theme="emerald"
              value={<span className="capitalize">{equipoUnidad.equipos?.modelo || "-"}</span>}
            />
            <DetailSheetInfoItem
              icon={Hash}
              label="Número de Serie"
              theme="gray"
              value={<span className="font-mono">{equipoUnidad.numero_serie || "-"}</span>}
            />
            <DetailSheetInfoItem
              icon={Hash}
              label="Código"
              theme="gray"
              value={<span className="font-mono">{equipoUnidad.codigo || "-"}</span>}
            />
          </div>
        </DetailSheetSection>

        {/* Cliente Asignado */}
        {equipoUnidad.clientes?.nombre && (
          <DetailSheetSection
            icon={Building2}
            title="Cliente Asignado"
            theme="blue"
            action={
              <Button
                type="outline"
                size="tiny"
                onClick={() => navigateTo(`/dashboard/empresas?id=${equipoUnidad.cliente_id}`)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver Cliente
              </Button>
            }
          >
            <DetailSheetItemCard
              icon={Building2}
              title={equipoUnidad.clientes.nombre || ""}
              subtitle={
                [
                  equipoUnidad.clientes.nombre_fantasia,
                  equipoUnidad.clientes.identificador_unico || equipoUnidad.clientes.cuit,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              theme="blue"
              onClick={() => navigateTo(`/dashboard/empresas?id=${equipoUnidad.cliente_id}`)}
            />
          </DetailSheetSection>
        )}

        {/* Laboratorio */}
        {equipoUnidad.laboratorio_id && equipoUnidad.laboratorios?.id && (
          <DetailSheetSection
            icon={FlaskConical}
            title="Ubicación (Laboratorio)"
            theme="purple"
            action={
              <Button
                type="outline"
                size="tiny"
                onClick={() => navigateTo(`/dashboard/laboratorios?id=${equipoUnidad.laboratorio_id}`)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver Lab
              </Button>
            }
          >
            <DetailSheetItemCard
              icon={FlaskConical}
              title={equipoUnidad.laboratorios.nombre || ""}
              subtitle={
                equipoUnidad.laboratorios.direccion
                  ? `${equipoUnidad.laboratorios.direccion}${equipoUnidad.laboratorios.localidad ? `, ${equipoUnidad.laboratorios.localidad}` : ""}`
                  : undefined
              }
              theme="purple"
              onClick={() => navigateTo(`/dashboard/laboratorios?id=${equipoUnidad.laboratorio_id}`)}
            />
          </DetailSheetSection>
        )}

        {/* Servicios Técnicos Recientes */}
        <DetailSheetSection
          icon={Wrench}
          title="Servicios Técnicos"
          count={servicios.length}
          theme="amber"
          action={
            <Button
              type="outline"
              size="tiny"
              onClick={() => navigateTo(`/dashboard/servicios?equipo_unidad_id=${equipoUnidad.id}`)}
            >
              Ver todos
            </Button>
          }
        >
          {loadingServicios ? (
            <DetailSheetLoading />
          ) : servicios.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {servicios.slice(0, 5).map((servicio: any) => (
                <div
                  key={servicio.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer"
                  onClick={() => navigateTo(`/dashboard/servicios?id=${servicio.id}`)}
                >
                  <div className={`p-2 rounded-lg ${getServicioEstadoColor(servicio.estado)}`}>
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {servicio.tipo === "reparacion"
                        ? "Reparación"
                        : servicio.tipo === "mantenimiento"
                          ? "Mantenimiento"
                          : servicio.tipo === "instalacion"
                            ? "Instalación"
                            : servicio.tipo}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {servicio.fecha_programada && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(servicio.fecha_programada), "dd/MM/yyyy", { locale: es })}
                        </span>
                      )}
                      {servicio.nro_orden && <span className="font-mono">#{servicio.nro_orden}</span>}
                    </div>
                  </div>
                  <Badge
                    variant={
                      servicio.estado === "completado"
                        ? "default"
                        : servicio.estado === "en_progreso"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-[10px]"
                  >
                    {servicio.estado === "completado"
                      ? "Completado"
                      : servicio.estado === "en_progreso"
                        ? "En progreso"
                        : servicio.estado === "pendiente"
                          ? "Pendiente"
                          : servicio.estado}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <DetailSheetEmptyState
              icon={Wrench}
              message="No hay servicios técnicos registrados"
              actionLabel="Nuevo servicio"
              onAction={() => navigateTo(`/dashboard/servicios?action=new&equipo_unidad_id=${equipoUnidad.id}`)}
            />
          )}
        </DetailSheetSection>

        {/* Fechas */}
        <DetailSheetSection icon={Calendar} title="Fechas Importantes" theme="indigo">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {equipoUnidad.fecha_compra && (
              <DetailSheetStatCard
                value={format(new Date(equipoUnidad.fecha_compra), "dd/MM/yy")}
                label="Fecha de Compra"
                color="blue"
              />
            )}
            {equipoUnidad.created_at && (
              <DetailSheetStatCard
                value={format(new Date(equipoUnidad.created_at), "dd/MM/yy")}
                label="Fecha de Registro"
                color="purple"
              />
            )}
            <DetailSheetStatCard
              value={servicios.length}
              label="Total Servicios"
              color="amber"
            />
            <DetailSheetStatCard
              value={historial.length}
              label="Eventos en Historial"
              color="teal"
            />
          </div>
        </DetailSheetSection>

        {/* Timeline de Historial */}
        <DetailSheetSection
          icon={History}
          title="Historial y Timeline"
          count={historial.length}
          theme="emerald"
        >
          {loadingHistorial ? (
            <DetailSheetLoading />
          ) : historial.length === 0 ? (
            <DetailSheetEmptyState icon={History} message="No hay eventos registrados para este equipo" />
          ) : (
            <div className="relative space-y-0 max-h-[300px] overflow-y-auto">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              {historial.map((evento) => (
                <div key={evento.id} className="relative pl-14 pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-4 top-1 h-5 w-5 rounded-full border-2 ${getEventBgColor(evento.type)} flex items-center justify-center z-10`}
                  >
                    {getEventIcon(evento.type)}
                  </div>

                  {/* Event card */}
                  <div
                    className={`p-3 border rounded-lg bg-white dark:bg-gray-800 hover:bg-muted/50 transition-colors ${
                      evento.type === "servicio" && evento.servicioId ? "cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (evento.type === "servicio" && evento.servicioId) {
                        navigateTo(`/dashboard/servicios?id=${evento.servicioId}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{evento.title}</p>
                          {evento.type === "servicio" && evento.servicioId && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{evento.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                          {evento.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {evento.date
                            ? format(new Date(evento.date), "dd/MM/yyyy", { locale: es })
                            : "Sin fecha"}
                        </span>
                      </div>
                    </div>

                    {/* Detalles específicos para servicios */}
                    {evento.type === "servicio" && evento.data && (
                      <div className="mt-2 pt-2 border-t grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase">Técnico</Label>
                          <p className="text-xs font-medium">{evento.data.tecnico}</p>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase">Tipo</Label>
                          <p className="text-xs font-medium capitalize">{evento.data.tipo}</p>
                        </div>
                        <div className="text-right">
                          <Label className="text-[10px] text-muted-foreground uppercase">Precio</Label>
                          <p className="text-xs font-semibold text-green-600">
                            $
                            {typeof evento.data.monto_servicio === "number"
                              ? evento.data.monto_servicio.toLocaleString("es-AR")
                              : "0"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSheetSection>

        {/* Notas */}
        {equipoUnidad.notas && (
          <DetailSheetSection icon={FileText} title="Notas" theme="gray">
            <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-line">
              {equipoUnidad.notas}
            </div>
          </DetailSheetSection>
        )}
      </DetailSheetContent>
    </DetailSheetContainer>
  );
}
