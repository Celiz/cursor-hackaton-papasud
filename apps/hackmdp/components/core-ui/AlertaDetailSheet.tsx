"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EquipoAlerta } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  User,
  FileText,
  Clock,
  Flag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
} from "./DetailSheetComponents";

interface AlertaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerta: EquipoAlerta | null;
  onSuccess?: () => void;
}

const tipoLabels: Record<string, string> = {
  vencimiento_contrato: "Vencimiento de Contrato",
  mantenimiento_preventivo: "Mantenimiento Preventivo",
  revision_calibracion: "Revisión y Calibración",
  garantia_proxima: "Garantía Próxima a Vencer",
  stock_bajo: "Stock Bajo",
  documentacion_pendiente: "Documentación Pendiente",
  otro: "Otro",
};

const prioridadVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  baja: "secondary",
  media: "default",
  alta: "destructive",
  urgente: "destructive",
};

const estadoVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente: "outline",
  en_proceso: "default",
  resuelta: "secondary",
  cancelada: "secondary",
};

export function AlertaDetailSheet({
  open,
  onOpenChange,
  alerta,
  onSuccess,
}: AlertaDetailSheetProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!alerta) return null;

  const diasRestantes = alerta.fecha_vencimiento
    ? Math.ceil(
        (new Date(alerta.fecha_vencimiento).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const handleUpdateEstado = async (nuevoEstado: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/equipos-alertas/${alerta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar alerta");
      }

      toast.success("Alerta actualizada correctamente");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "urgente":
        return "text-red-600 dark:text-red-400";
      case "alta":
        return "text-orange-600 dark:text-orange-400";
      case "media":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="amber">
      <DetailSheetHeader
        icon={AlertTriangle}
        title={alerta.titulo}
        theme="amber"
        subtitle={
          <span className="text-xs">
            Creada el{" "}
            {format(new Date(alerta.created_at), "dd/MM/yyyy HH:mm", {
              locale: es,
            })}
          </span>
        }
        badges={
          <>
            <Badge variant={estadoVariants[alerta.estado] || "outline"}>
              {alerta.estado?.replace("_", " ").toUpperCase()}
            </Badge>
            <Badge variant={prioridadVariants[alerta.prioridad] || "default"}>
              {alerta.prioridad?.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {tipoLabels[alerta.tipo] || alerta.tipo}
            </Badge>
          </>
        }
      />

      <DetailSheetContent>
        {/* Información Principal */}
        <DetailSheetSection
          icon={AlertTriangle}
          title="Información de la Alerta"
          theme="amber"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetInfoItem
              icon={Flag}
              label="Prioridad"
              theme="amber"
              value={
                <span className={`font-semibold ${getPrioridadColor(alerta.prioridad)}`}>
                  {alerta.prioridad?.toUpperCase()}
                </span>
              }
            />
            <DetailSheetInfoItem
              icon={Clock}
              label="Estado"
              theme="blue"
              value={alerta.estado?.replace("_", " ")}
            />
            <DetailSheetInfoItem
              icon={Calendar}
              label="Fecha de Alerta"
              theme="gray"
              value={format(new Date(alerta.fecha_alerta), "dd/MM/yyyy HH:mm", {
                locale: es,
              })}
            />
            {alerta.fecha_vencimiento && (
              <DetailSheetInfoItem
                icon={Calendar}
                label="Fecha de Vencimiento"
                theme={
                  diasRestantes !== null && diasRestantes < 0
                    ? "rose"
                    : diasRestantes !== null && diasRestantes <= 7
                    ? "amber"
                    : "green"
                }
                value={
                  <div>
                    <span>
                      {format(new Date(alerta.fecha_vencimiento), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </span>
                    {diasRestantes !== null && (
                      <p className="text-xs text-muted-foreground">
                        {diasRestantes < 0
                          ? `Vencido hace ${Math.abs(diasRestantes)} días`
                          : `Vence en ${diasRestantes} días`}
                      </p>
                    )}
                  </div>
                }
              />
            )}
          </div>

          {alerta.descripcion && (
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {alerta.descripcion}
            </div>
          )}
        </DetailSheetSection>

        {/* Equipo Relacionado */}
        {alerta.equipo_unidad && (
          <DetailSheetSection icon={Package} title="Equipo Relacionado" theme="purple">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailSheetInfoItem
                icon={Package}
                label="Código"
                theme="purple"
                value={
                  <span className="font-mono">{alerta.equipo_unidad.codigo}</span>
                }
              />
              {alerta.equipo_unidad.numero_serie && (
                <DetailSheetInfoItem
                  icon={Package}
                  label="N° Serie"
                  theme="gray"
                  value={
                    <span className="font-mono">
                      {alerta.equipo_unidad.numero_serie}
                    </span>
                  }
                />
              )}
              {alerta.equipo_unidad.equipo && (
                <DetailSheetInfoItem
                  icon={Package}
                  label="Modelo"
                  theme="indigo"
                  value={`${alerta.equipo_unidad.equipo.marca} ${alerta.equipo_unidad.equipo.modelo}`}
                />
              )}
            </div>
          </DetailSheetSection>
        )}

        {/* Usuario Asignado */}
        {alerta.usuario_asignado_id && (
          <DetailSheetSection icon={User} title="Usuario Asignado" theme="blue">
            <DetailSheetInfoItem
              icon={User}
              label="ID Usuario"
              theme="blue"
              value={<span className="font-mono">{alerta.usuario_asignado_id}</span>}
            />
          </DetailSheetSection>
        )}

        {/* Notas */}
        {alerta.notas && (
          <DetailSheetSection icon={FileText} title="Notas" theme="gray">
            <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {alerta.notas}
            </div>
          </DetailSheetSection>
        )}

        {/* Acciones */}
        {alerta.estado !== "resuelta" && alerta.estado !== "cancelada" && (
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
            {alerta.estado === "pendiente" && (
              <Button
                onClick={() => handleUpdateEstado("en_proceso")}
                disabled={isUpdating}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar En Proceso
              </Button>
            )}
            {alerta.estado === "en_proceso" && (
              <Button
                onClick={() => handleUpdateEstado("resuelta")}
                disabled={isUpdating}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como Resuelta
              </Button>
            )}
            <Button
              onClick={() => handleUpdateEstado("cancelada")}
              disabled={isUpdating}
              variant="outline"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar Alerta
            </Button>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between">
            <span>Creada:</span>
            <span>
              {format(new Date(alerta.created_at), "dd/MM/yyyy HH:mm", {
                locale: es,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Actualizada:</span>
            <span>
              {format(new Date(alerta.updated_at), "dd/MM/yyyy HH:mm", {
                locale: es,
              })}
            </span>
          </div>
        </div>
      </DetailSheetContent>
    </DetailSheetContainer>
  );
}
