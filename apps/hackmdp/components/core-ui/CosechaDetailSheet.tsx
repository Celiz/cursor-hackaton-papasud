"use client";

import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  Scale,
  Info,
  Leaf,
  Calendar,
  CalendarDays,
  Warehouse,
  FileText,
  Percent,
  Target,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CALIDAD_COLORS,
  ESTADO_COSECHA_COLORS,
  getRatioSecado,
} from "@/lib/cannabis-constants";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
  DetailSheetEmptyState,
} from "./DetailSheetComponents";

interface CosechaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cosecha: any | null;
  onEdit?: (cosecha: any) => void;
  onDelete?: (cosecha: any) => void;
  onSuccess?: () => void;
}

export function CosechaDetailSheet({
  open,
  onOpenChange,
  cosecha,
  onEdit,
  onDelete,
  onSuccess,
}: CosechaDetailSheetProps) {
  if (!cosecha) return null;

  const ratio = getRatioSecado(cosecha.peso_humedo_g, cosecha.peso_seco_g);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatWeight = (grams: number | null | undefined) => {
    if (grams == null) return "—";
    return `${grams.toLocaleString()}g`;
  };

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="amber">
      <DetailSheetHeader
        icon={Scissors}
        title={cosecha.codigo}
        theme="amber"
        subtitle={
          <span className="text-xs text-muted-foreground">
            {cosecha.cepa_nombre || "Sin cepa"}
          </span>
        }
        badges={
          <>
            {cosecha.calidad && (
              <Badge
                className={cn(
                  "text-[10px] font-medium",
                  CALIDAD_COLORS[cosecha.calidad]
                )}
              >
                {cosecha.calidad}
              </Badge>
            )}
            {cosecha.estado && (
              <Badge
                className={cn(
                  "text-[10px] font-medium capitalize",
                  ESTADO_COSECHA_COLORS[cosecha.estado]
                )}
              >
                {cosecha.estado}
              </Badge>
            )}
          </>
        }
        onEdit={onEdit ? () => onEdit(cosecha) : undefined}
        onDelete={onDelete ? () => onDelete(cosecha) : undefined}
      />

      <DetailSheetContent>
        {/* Pesos y Rendimiento */}
        <DetailSheetSection icon={Scale} title="Pesos y Rendimiento" theme="amber">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <DetailSheetInfoItem
              icon={Scale}
              label="Peso Humedo"
              value={formatWeight(cosecha.peso_humedo_g)}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Scale}
              label="Peso Seco"
              value={formatWeight(cosecha.peso_seco_g)}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Scale}
              label="Peso Trim"
              value={formatWeight(cosecha.peso_trim_g)}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Percent}
              label="Ratio Secado"
              value={ratio}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Target}
              label="Yield / Planta"
              value={
                cosecha.yield_por_planta != null
                  ? `${cosecha.yield_por_planta}g`
                  : "—"
              }
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Ruler}
              label="Yield / m2"
              value={
                cosecha.yield_por_m2 != null
                  ? `${cosecha.yield_por_m2}g`
                  : "—"
              }
              theme="amber"
            />
          </div>
        </DetailSheetSection>

        {/* Informacion */}
        <DetailSheetSection icon={Info} title="Informacion" theme="amber">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <DetailSheetInfoItem
              icon={Leaf}
              label="Cepa"
              value={cosecha.cepa_nombre || "—"}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Leaf}
              label="Lote"
              value={cosecha.lote_codigo || "—"}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Warehouse}
              label="Sala"
              value={cosecha.sala_nombre || "—"}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={Calendar}
              label="Fecha Cosecha"
              value={formatDate(cosecha.fecha_cosecha)}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={CalendarDays}
              label="Fecha Secado"
              value={formatDate(cosecha.fecha_secado)}
              theme="amber"
            />
            <DetailSheetInfoItem
              icon={CalendarDays}
              label="Fecha Curado"
              value={formatDate(cosecha.fecha_curado)}
              theme="amber"
            />
          </div>
        </DetailSheetSection>

        {/* Notas */}
        <DetailSheetSection icon={FileText} title="Notas" theme="amber">
          {cosecha.notas ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
              {cosecha.notas}
            </div>
          ) : (
            <DetailSheetEmptyState icon={FileText} message="Sin notas" />
          )}
        </DetailSheetSection>
      </DetailSheetContent>
    </DetailSheetContainer>
  );
}
