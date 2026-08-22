"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlanMantenimiento } from "@/app/dashboard/mantenimiento/planes/columns";
import { Clock, DollarSign, Users, Wrench, CheckSquare } from "lucide-react";

interface PlanMantenimientoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanMantenimiento | null;
  onEdit?: () => void;
}

export function PlanMantenimientoDetailSheet({
  open,
  onOpenChange,
  plan,
  onEdit,
}: PlanMantenimientoDetailSheetProps) {
  if (!plan) return null;

  const frecuenciaLabels: Record<string, string> = {
    dias: "día(s)",
    meses: "mes(es)",
    años: "año(s)",
    horas_uso: "hs uso",
    kilometros: "km",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-2xl">{plan.nombre}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{plan.codigo}</p>
            </div>
            <Badge variant={plan.activo ? "default" : "outline"}>
              {plan.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Tipo y Categoría */}
          <div>
            <h3 className="font-semibold mb-3">Información General</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium capitalize">{plan.tipo}</p>
              </div>
              {plan.categoria && (
                <div>
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <p className="font-medium capitalize">
                    {plan.categoria.replace(/_/g, " ")}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Descripción */}
          {plan.descripcion && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Frecuencia */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Frecuencia
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base">
                Cada {plan.frecuencia_valor}{" "}
                {frecuenciaLabels[plan.frecuencia_tipo] || plan.frecuencia_tipo}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Recursos */}
          <div>
            <h3 className="font-semibold mb-3">Recursos Necesarios</h3>
            <div className="space-y-3">
              {plan.duracion_estimada_horas && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">{plan.duracion_estimada_horas} horas</span>{" "}
                    de duración estimada
                  </span>
                </div>
              )}
              {plan.tecnicos_requeridos && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">{plan.tecnicos_requeridos}</span>{" "}
                    técnico(s) requerido(s)
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Costos Estimados */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Costos Estimados
            </h3>
            <div className="space-y-2">
              {plan.costo_mano_obra_estimado !== undefined &&
                plan.costo_mano_obra_estimado > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Precio estimado</span>
                    <span className="font-medium">
                      ${plan.costo_mano_obra_estimado.toLocaleString()}
                    </span>
                  </div>
                )}
              {plan.costo_repuestos_estimado !== undefined &&
                plan.costo_repuestos_estimado > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Repuestos</span>
                    <span className="font-medium">
                      ${plan.costo_repuestos_estimado.toLocaleString()}
                    </span>
                  </div>
                )}
              {((plan.costo_mano_obra_estimado || 0) +
                (plan.costo_repuestos_estimado || 0)) >
                0 && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="font-bold text-lg">
                      $
                      {(
                        (plan.costo_mano_obra_estimado || 0) +
                        (plan.costo_repuestos_estimado || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={onEdit} className="flex-1">
              Editar Plan
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
