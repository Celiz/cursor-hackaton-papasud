"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitMerge,
  Info,
  FileText,
  Calendar,
  Target,
  Sprout,
  FlaskConical,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TIPO_CRUCE_COLORS,
  ESTADO_CRUCE_COLORS,
} from "@/lib/cannabis-constants";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
  DetailSheetEmptyState,
} from "./DetailSheetComponents";

interface CruceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cruce: any | null;
  onEdit?: (cruce: any) => void;
  onDelete?: (cruce: any) => void;
  onSuccess?: () => void;
}

export function CruceDetailSheet({
  open,
  onOpenChange,
  cruce,
  onEdit,
  onDelete,
  onSuccess,
}: CruceDetailSheetProps) {
  const router = useRouter();

  if (!cruce) return null;

  const madreName = cruce.madre_cepa_nombre || "?";
  const padreName = cruce.padre_cepa_nombre || "?";

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="amber">
      <DetailSheetHeader
        icon={GitMerge}
        title={cruce.codigo}
        theme="amber"
        subtitle={
          <span className="text-xs text-muted-foreground">
            {madreName} &times; {padreName}
          </span>
        }
        badges={
          <>
            {cruce.tipo_cruce && (
              <Badge
                className={cn(
                  "text-[10px] font-medium",
                  TIPO_CRUCE_COLORS[cruce.tipo_cruce]
                )}
              >
                {cruce.tipo_cruce}
              </Badge>
            )}
            {cruce.estado && (
              <Badge
                className={cn(
                  "text-[10px] font-medium capitalize",
                  ESTADO_CRUCE_COLORS[cruce.estado]
                )}
              >
                {cruce.estado.replace("_", " ")}
              </Badge>
            )}
          </>
        }
        onEdit={onEdit ? () => onEdit(cruce) : undefined}
        onDelete={onDelete ? () => onDelete(cruce) : undefined}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() =>
              router.push(
                `/dashboard/cannabis/genetica/cruces/${cruce.id}`
              )
            }
          >
            Ver completo
          </Button>
        }
      />

      <DetailSheetContent>
        {/* Padres */}
        <DetailSheetSection icon={GitMerge} title="Padres" theme="amber">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetInfoItem
              icon={Sprout}
              label="Cepa Madre"
              value={madreName}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Sprout}
              label="Cepa Padre"
              value={padreName}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={GitMerge}
              label="Tipo Cruce"
              value={cruce.tipo_cruce || "—"}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={FlaskConical}
              label="Metodo"
              value={cruce.metodo || "—"}
              theme="amber"
            />
          </div>
        </DetailSheetSection>

        {/* Detalles */}
        <DetailSheetSection icon={Info} title="Detalles" theme="amber">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetInfoItem
              icon={Calendar}
              label="Fecha"
              value={
                cruce.fecha_cruce
                  ? new Date(cruce.fecha_cruce).toLocaleDateString("es-AR")
                  : "—"
              }
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Target}
              label="Objetivo"
              value={cruce.objetivo || "—"}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Sprout}
              label="Semillas obtenidas"
              value={
                cruce.semillas_obtenidas != null
                  ? String(cruce.semillas_obtenidas)
                  : "—"
              }
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Percent}
              label="Tasa germinacion"
              value={
                cruce.tasa_germinacion != null
                  ? `${cruce.tasa_germinacion}%`
                  : "—"
              }
              theme="amber"
            />
          </div>
        </DetailSheetSection>

        {/* Notas */}
        <DetailSheetSection icon={FileText} title="Notas" theme="amber">
          {cruce.notas ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
              {cruce.notas}
            </div>
          ) : (
            <DetailSheetEmptyState icon={FileText} message="Sin notas" />
          )}
        </DetailSheetSection>
      </DetailSheetContent>
    </DetailSheetContainer>
  );
}
