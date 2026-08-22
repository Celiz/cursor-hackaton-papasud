"use client";

import type { Decision } from "@/lib/decisiones";
import { FileText, Calculator, ShieldCheck } from "lucide-react";

const META: Record<Decision["tipo"], { label: string; icon: any; color: string }> = {
  pedido: { label: "Pedido", icon: FileText, color: "text-blue-600" },
  cotizacion: { label: "Cotización", icon: Calculator, color: "text-amber-600" },
  aprobacion: { label: "Aprobación", icon: ShieldCheck, color: "text-violet-600" },
};

function antiguedad(fechaIso: string): string {
  const dias = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  return `hace ${dias} días`;
}

export function DecisionCard({ d, onClick }: { d: Decision; onClick: () => void }) {
  const m = META[d.tipo];
  const Icon = m.icon;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-background p-4 flex gap-3 items-start active:scale-[0.99] transition"
    >
      <Icon className={`h-5 w-5 mt-0.5 ${m.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</span>
          <span className="text-xs text-muted-foreground">{antiguedad(d.fecha)}</span>
        </div>
        <div className="font-medium truncate">{d.cliente_nombre ?? d.numero}</div>
        <div className="text-sm text-muted-foreground truncate">
          {d.numero}
          {d.monto != null && <> · ${d.monto.toLocaleString("es-AR")}</>}
          {d.solicitante && <> · pide {d.solicitante}</>}
        </div>
      </div>
    </button>
  );
}
