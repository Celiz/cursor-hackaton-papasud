"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface ListaConAtencion {
  id: string;
  nombre: string;
  proveedor_nombre?: string;
  estado_atencion: "ok" | "por_vencer" | "vencida" | "revisar";
  dias_para_vencer: number | null;
  dias_antiguedad: number | null;
}

export function AvisoVencimientoPanel({
  listas,
  onSelect,
}: {
  listas: ListaConAtencion[];
  onSelect?: (id: string) => void;
}) {
  const conAtencion = listas.filter((l) => l.estado_atencion !== "ok");
  if (conAtencion.length === 0) return null;

  const texto = (l: ListaConAtencion) => {
    if (l.estado_atencion === "vencida")
      return `venció hace ${Math.abs(l.dias_para_vencer ?? 0)} días`;
    if (l.estado_atencion === "por_vencer")
      return `vence en ${l.dias_para_vencer} días`;
    return `${l.dias_antiguedad} días sin novedad`;
  };
  const color = (e: string) =>
    e === "vencida" ? "text-red-600" : "text-amber-600";

  return (
    <Card className="border-amber-300 bg-amber-50/50">
      <CardContent className="py-3">
        <div className="flex items-center gap-2 mb-2 font-medium text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          {conAtencion.length} lista{conAtencion.length > 1 ? "s" : ""} para revisar
        </div>
        <ul className="space-y-1 text-sm">
          {conAtencion.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onSelect?.(l.id)}
                className="text-left hover:underline"
              >
                <Clock className="inline h-3 w-3 mr-1" />
                <span className="font-medium">{l.proveedor_nombre ?? "—"}</span>{" "}
                — {l.nombre}{" "}
                <span className={color(l.estado_atencion)}>({texto(l)})</span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
