"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  Beaker,
  Sprout,
  FileText,
  Droplets,
  Wind,
  Sparkles,
  Timer,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIPO_CEPA_COLORS,
  ESTADO_CEPA_COLORS,
  DIFICULTAD_COLORS,
} from "@/lib/cannabis-constants";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
  DetailSheetEmptyState,
} from "./DetailSheetComponents";

interface CepaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cepa: any | null;
  onEdit?: (cepa: any) => void;
  onDelete?: (cepa: any) => void;
  onSuccess?: () => void;
}

export function CepaDetailSheet({
  open,
  onOpenChange,
  cepa,
  onEdit,
  onDelete,
  onSuccess,
}: CepaDetailSheetProps) {
  const router = useRouter();

  if (!cepa) return null;

  const thcRange =
    cepa.thc_min != null && cepa.thc_max != null
      ? `${cepa.thc_min}% – ${cepa.thc_max}%`
      : cepa.thc_max != null
        ? `${cepa.thc_max}%`
        : "—";

  const cbdRange =
    cepa.cbd_min != null && cepa.cbd_max != null
      ? `${cepa.cbd_min}% – ${cepa.cbd_max}%`
      : cepa.cbd_max != null
        ? `${cepa.cbd_max}%`
        : "—";

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="amber">
      <DetailSheetHeader
        icon={Leaf}
        title={cepa.nombre}
        theme="amber"
        subtitle={
          cepa.banco_origen ? (
            <span className="text-xs text-muted-foreground">
              {cepa.banco_origen}
            </span>
          ) : undefined
        }
        badges={
          <>
            {cepa.tipo && (
              <Badge
                className={cn(
                  "text-[10px] font-medium",
                  TIPO_CEPA_COLORS[cepa.tipo] || "bg-gray-100 text-gray-600"
                )}
              >
                {cepa.tipo}
              </Badge>
            )}
            {cepa.estado && (
              <Badge
                className={cn(
                  "text-[10px] font-medium",
                  ESTADO_CEPA_COLORS[cepa.estado] || "bg-gray-100 text-gray-600"
                )}
              >
                {cepa.estado?.replace("_", " ")}
              </Badge>
            )}
            {cepa.dificultad && (
              <Badge
                className={cn(
                  "text-[10px] font-medium",
                  DIFICULTAD_COLORS[cepa.dificultad] ||
                    "bg-gray-100 text-gray-600"
                )}
              >
                {cepa.dificultad}
              </Badge>
            )}
          </>
        }
        onEdit={onEdit ? () => onEdit(cepa) : undefined}
        onDelete={onDelete ? () => onDelete(cepa) : undefined}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() =>
              router.push(`/dashboard/cannabis/genetica/cepas/${cepa.id}`)
            }
          >
            Ver completo
          </Button>
        }
      />

      <DetailSheetContent>
        {/* Perfil Cannabinoide */}
        <DetailSheetSection icon={Beaker} title="Perfil Cannabinoide" theme="amber">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <DetailSheetInfoItem
              icon={Droplets}
              label="THC"
              value={thcRange}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Droplets}
              label="CBD"
              value={cbdRange}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Sparkles}
              label="Terpenos"
              value={cepa.terpenos || "—"}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Wind}
              label="Aroma"
              value={cepa.aroma || "—"}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Sparkles}
              label="Efecto"
              value={cepa.efecto || "—"}
              theme="amber"
            />
          </div>
        </DetailSheetSection>

        {/* Info de Cultivo */}
        <DetailSheetSection icon={Sprout} title="Info de Cultivo" theme="amber">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetInfoItem
              icon={Timer}
              label="Floracion"
              value={
                cepa.tiempo_flora_dias
                  ? `${cepa.tiempo_flora_dias} dias`
                  : "—"
              }
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Sprout}
              label="Dificultad"
              value={
                cepa.dificultad ? (
                  <Badge
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      DIFICULTAD_COLORS[cepa.dificultad] ||
                        "bg-gray-100 text-gray-600"
                    )}
                  >
                    {cepa.dificultad}
                  </Badge>
                ) : (
                  "—"
                )
              }
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={CheckCircle2}
              label="Es propia"
              value={cepa.es_propia ? "Si" : "No"}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Building2}
              label="Banco origen"
              value={cepa.banco_origen || "—"}
              theme="amber"
            />
          </div>
        </DetailSheetSection>

        {/* Descripcion */}
        <DetailSheetSection icon={FileText} title="Descripcion" theme="amber">
          {cepa.descripcion ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
              {cepa.descripcion}
            </div>
          ) : (
            <DetailSheetEmptyState
              icon={FileText}
              message="Sin descripcion"
            />
          )}
        </DetailSheetSection>
      </DetailSheetContent>
    </DetailSheetContainer>
  );
}
