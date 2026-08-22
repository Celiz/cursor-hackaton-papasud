"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EquipoMovimiento } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Package,
  MapPin,
  User,
  Truck,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

interface MovimientoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimiento: EquipoMovimiento | null;
  onEdit?: (movimiento: EquipoMovimiento) => void;
  onSuccess?: () => void;
}

const tipoLabels: Record<string, string> = {
  ingreso: "Ingreso",
  egreso: "Egreso",
  devolucion: "Devolución",
  instalacion: "Instalación",
  desinstalacion: "Desinstalación",
  traslado: "Traslado",
  envio_taller: "Envío a Taller",
  retorno_taller: "Retorno de Taller",
  baja: "Baja",
};

const tipoThemes: Record<string, "green" | "blue" | "purple" | "teal" | "orange" | "indigo" | "yellow" | "rose" | "amber"> = {
  ingreso: "green",
  egreso: "blue",
  devolucion: "purple",
  instalacion: "teal",
  desinstalacion: "orange",
  traslado: "indigo",
  envio_taller: "yellow",
  retorno_taller: "green",
  baja: "rose",
};

export function MovimientoDetailSheet({
  open,
  onOpenChange,
  movimiento,
  onEdit,
  onSuccess,
}: MovimientoDetailSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!movimiento) return null;

  const theme = tipoThemes[movimiento.tipo] || "blue";

  const handleEdit = () => {
    onEdit?.(movimiento);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/equipos-movimientos/${movimiento.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar movimiento");
      }

      toast.success("Movimiento eliminado correctamente");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme={theme}>
        <DetailSheetHeader
          icon={Package}
          title="Detalle de Movimiento"
          theme={theme}
          subtitle={
            <span className="text-xs">
              {format(new Date(movimiento.fecha_movimiento), "dd/MM/yyyy HH:mm", {
                locale: es,
              })}
            </span>
          }
          badges={
            <Badge className="bg-white/20 text-white border-white/30">
              {tipoLabels[movimiento.tipo] || movimiento.tipo}
            </Badge>
          }
          onEdit={onEdit ? handleEdit : undefined}
          onDelete={() => setShowDeleteDialog(true)}
        />

        <DetailSheetContent>
          {/* Información del Movimiento */}
          <DetailSheetSection icon={Package} title="Información del Movimiento" theme={theme}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailSheetInfoItem
                icon={ArrowRight}
                label="Tipo"
                theme={theme}
                value={tipoLabels[movimiento.tipo] || movimiento.tipo}
              />
              <DetailSheetInfoItem
                icon={Calendar}
                label="Fecha"
                theme="gray"
                value={format(new Date(movimiento.fecha_movimiento), "dd/MM/yyyy HH:mm", {
                  locale: es,
                })}
              />
              {movimiento.fecha_programada && (
                <DetailSheetInfoItem
                  icon={Calendar}
                  label="Fecha Programada"
                  theme="blue"
                  value={format(new Date(movimiento.fecha_programada), "dd/MM/yyyy", {
                    locale: es,
                  })}
                />
              )}
            </div>
          </DetailSheetSection>

          {/* Equipo */}
          {movimiento.equipo_unidad && (
            <DetailSheetSection icon={Package} title="Equipo" theme="purple">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <DetailSheetInfoItem
                  icon={Package}
                  label="Código"
                  theme="purple"
                  value={<span className="font-mono">{movimiento.equipo_unidad.codigo}</span>}
                />
                {movimiento.equipo_unidad.numero_serie && (
                  <DetailSheetInfoItem
                    icon={Package}
                    label="N° Serie"
                    theme="gray"
                    value={
                      <span className="font-mono">{movimiento.equipo_unidad.numero_serie}</span>
                    }
                  />
                )}
                {movimiento.equipo_unidad.equipo && (
                  <DetailSheetInfoItem
                    icon={Package}
                    label="Modelo"
                    theme="indigo"
                    value={`${movimiento.equipo_unidad.equipo.marca} ${movimiento.equipo_unidad.equipo.modelo}`}
                  />
                )}
              </div>
            </DetailSheetSection>
          )}

          {/* Origen y Destino */}
          {(movimiento.origen_descripcion || movimiento.destino_descripcion) && (
            <DetailSheetSection icon={MapPin} title="Origen y Destino" theme="teal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {movimiento.origen_descripcion && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Origen
                      </span>
                    </div>
                    {movimiento.origen_tipo && (
                      <p className="text-xs text-muted-foreground uppercase mb-1">
                        {movimiento.origen_tipo}
                      </p>
                    )}
                    <p className="text-sm font-medium">{movimiento.origen_descripcion}</p>
                  </div>
                )}
                {movimiento.destino_descripcion && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Destino
                      </span>
                    </div>
                    {movimiento.destino_tipo && (
                      <p className="text-xs text-muted-foreground uppercase mb-1">
                        {movimiento.destino_tipo}
                      </p>
                    )}
                    <p className="text-sm font-medium">{movimiento.destino_descripcion}</p>
                  </div>
                )}
              </div>
            </DetailSheetSection>
          )}

          {/* Cliente */}
          {movimiento.cliente && (
            <DetailSheetSection icon={User} title="Cliente" theme="blue">
              <div className="grid grid-cols-2 gap-3">
                <DetailSheetInfoItem
                  icon={User}
                  label="Nombre"
                  theme="blue"
                  value={movimiento.cliente.nombre}
                />
                {movimiento.cliente.razon_social && (
                  <DetailSheetInfoItem
                    icon={User}
                    label="Razón Social"
                    theme="gray"
                    value={movimiento.cliente.razon_social}
                  />
                )}
              </div>
            </DetailSheetSection>
          )}

          {/* Responsable y Transportista */}
          {(movimiento.responsable_movimiento || movimiento.transportista) && (
            <DetailSheetSection icon={Truck} title="Logística" theme="amber">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {movimiento.responsable_movimiento && (
                  <DetailSheetInfoItem
                    icon={User}
                    label="Responsable"
                    theme="amber"
                    value={movimiento.responsable_movimiento}
                  />
                )}
                {movimiento.transportista && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Transportista
                      </span>
                    </div>
                    <p className="text-sm font-medium">{movimiento.transportista}</p>
                    {movimiento.numero_seguimiento && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        Tracking: #{movimiento.numero_seguimiento}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DetailSheetSection>
          )}

          {/* Condiciones */}
          {(movimiento.condicion_previa || movimiento.condicion_posterior) && (
            <DetailSheetSection icon={AlertCircle} title="Condición del Equipo" theme="orange">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {movimiento.condicion_previa && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-muted-foreground mb-1">Antes del movimiento:</p>
                    <p className="text-sm">{movimiento.condicion_previa}</p>
                  </div>
                )}
                {movimiento.condicion_posterior && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-muted-foreground mb-1">Después del movimiento:</p>
                    <p className="text-sm">{movimiento.condicion_posterior}</p>
                  </div>
                )}
              </div>
            </DetailSheetSection>
          )}

          {/* Observaciones */}
          {movimiento.observaciones && (
            <DetailSheetSection icon={FileText} title="Observaciones" theme="gray">
              <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {movimiento.observaciones}
              </div>
            </DetailSheetSection>
          )}

          {/* Firmas */}
          {(movimiento.firma_entrega_url || movimiento.firma_recepcion_url) && (
            <DetailSheetSection icon={ImageIcon} title="Firmas" theme="indigo">
              <div className="grid grid-cols-2 gap-3">
                {movimiento.firma_entrega_url && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-muted-foreground mb-2">Firma de Entrega</p>
                    <Badge variant="outline">Ver firma</Badge>
                  </div>
                )}
                {movimiento.firma_recepcion_url && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-muted-foreground mb-2">Firma de Recepción</p>
                    <Badge variant="outline">Ver firma</Badge>
                  </div>
                )}
              </div>
            </DetailSheetSection>
          )}

          {/* Ubicación GPS */}
          {movimiento.latitud && movimiento.longitud && (
            <DetailSheetSection icon={MapPin} title="Ubicación GPS" theme="cyan">
              <DetailSheetInfoItem
                icon={MapPin}
                label="Coordenadas"
                theme="cyan"
                value={
                  <span className="font-mono">
                    {movimiento.latitud}, {movimiento.longitud}
                  </span>
                }
              />
            </DetailSheetSection>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex justify-between">
              <span>Creado:</span>
              <span>
                {format(new Date(movimiento.created_at), "dd/MM/yyyy HH:mm", {
                  locale: es,
                })}
              </span>
            </div>
            {movimiento.created_by && (
              <div className="flex justify-between">
                <span>Por:</span>
                <span>{movimiento.created_by}</span>
              </div>
            )}
          </div>
        </DetailSheetContent>
      </DetailSheetContainer>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento será eliminado permanentemente
              del historial.
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
