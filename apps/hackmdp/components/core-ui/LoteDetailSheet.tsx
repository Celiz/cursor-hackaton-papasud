"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Sprout,
  Info,
  Leaf,
  Warehouse,
  TreePine,
  Calendar,
  CalendarDays,
  Layers,
  Box,
  Timer,
  FileText,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getDiasTranscurridos,
  FASE_COLORS,
  ESTADO_LOTE_COLORS,
  FASES_ORDER,
} from "@/lib/cannabis-constants";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
  DetailSheetEmptyState,
} from "./DetailSheetComponents";

interface LoteDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: any | null;
  onEdit?: (lote: any) => void;
  onDelete?: (lote: any) => void;
  onSuccess?: () => void;
}

export function LoteDetailSheet({
  open,
  onOpenChange,
  lote,
  onEdit,
  onDelete,
  onSuccess,
}: LoteDetailSheetProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!lote) return null;

  const currentFaseIndex = FASES_ORDER.indexOf(lote.fase_actual);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      onDelete?.(lote);
      toast.success("Lote eliminado correctamente");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el lote");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="amber">
        <DetailSheetHeader
          icon={Sprout}
          title={lote.codigo}
          theme="amber"
          subtitle={
            <span className="text-xs text-muted-foreground">
              {lote.cepa_nombre}
            </span>
          }
          badges={
            <>
              {lote.fase_actual && (
                <Badge
                  className={cn(
                    "text-[10px] font-medium",
                    FASE_COLORS[lote.fase_actual]
                  )}
                >
                  {lote.fase_actual}
                </Badge>
              )}
              {lote.estado && (
                <Badge
                  className={cn(
                    "text-[10px] font-medium",
                    ESTADO_LOTE_COLORS[lote.estado]
                  )}
                >
                  {lote.estado}
                </Badge>
              )}
            </>
          }
          onEdit={onEdit ? () => onEdit(lote) : undefined}
          onDelete={() => setShowDeleteDialog(true)}
          actions={
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() =>
                  router.push(`/dashboard/cannabis/cultivo/lotes/${lote.id}`)
                }
              >
                Ver completo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Avanzar Fase
              </Button>
            </>
          }
        />

        <DetailSheetContent>
          {/* Informacion General */}
          <DetailSheetSection icon={Info} title="Informacion General" theme="amber">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailSheetInfoItem
                icon={Leaf}
                label="Cepa"
                value={lote.cepa_nombre || "—"}
                theme="amber"
              />
              <DetailSheetInfoItem
                icon={Warehouse}
                label="Sala"
                value={lote.sala_nombre || "—"}
                theme="amber"
              />
              <DetailSheetInfoItem
                icon={TreePine}
                label="Plantas"
                value={lote.cantidad_plantas ?? "—"}
                theme="amber"
              />
              <DetailSheetInfoItem
                icon={Calendar}
                label="Dias"
                value={getDiasTranscurridos(lote.fecha_inicio)}
                theme="amber"
              />
              <DetailSheetInfoItem
                icon={CalendarDays}
                label="Fecha Inicio"
                value={
                  lote.fecha_inicio
                    ? format(new Date(lote.fecha_inicio), "dd/MM/yyyy", {
                        locale: es,
                      })
                    : "—"
                }
                theme="amber"
              />
              <DetailSheetInfoItem
                icon={Layers}
                label="Sustrato"
                value={lote.sustrato || "—"}
                theme="amber"
              />
              <DetailSheetInfoItem
                icon={Box}
                label="Contenedor"
                value={
                  lote.contenedor_litros
                    ? `${lote.contenedor_litros}L`
                    : "—"
                }
                theme="amber"
              />
              <DetailSheetInfoItem
                icon={Sprout}
                label="Origen"
                value={lote.origen || "—"}
                theme="amber"
              />
            </div>
          </DetailSheetSection>

          {/* Timeline de Fases */}
          <DetailSheetSection icon={Timer} title="Timeline de Fases" theme="amber">
            <div className="flex flex-wrap gap-1.5">
              {FASES_ORDER.map((fase, idx) => {
                const isCurrent = fase === lote.fase_actual;
                const isPast = currentFaseIndex >= 0 && idx < currentFaseIndex;
                const isFuture = currentFaseIndex >= 0 && idx > currentFaseIndex;

                return (
                  <span
                    key={fase}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                      isCurrent && cn(FASE_COLORS[fase], "ring-2 ring-amber-400"),
                      isPast && FASE_COLORS[fase],
                      isFuture &&
                        "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 border border-dashed border-gray-300 dark:border-gray-700",
                      !isCurrent && !isPast && !isFuture && FASE_COLORS[fase]
                    )}
                  >
                    {fase}
                  </span>
                );
              })}
            </div>
          </DetailSheetSection>

          {/* Notas */}
          <DetailSheetSection icon={FileText} title="Notas" theme="amber">
            {lote.notas ? (
              <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
                {lote.notas}
              </div>
            ) : (
              <DetailSheetEmptyState icon={FileText} message="Sin notas" />
            )}
          </DetailSheetSection>
        </DetailSheetContent>
      </DetailSheetContainer>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el
              lote <strong>{lote.codigo}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
