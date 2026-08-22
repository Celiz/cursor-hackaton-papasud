"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Decision, DecisionesResult } from "@/lib/decisiones";
import { DecisionCard } from "@/components/m/DecisionCard";
import { DecisionSheet } from "@/components/m/DecisionSheet";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const FILTROS: { key: "todos" | Decision["tipo"]; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pedido", label: "Pedidos" },
  { key: "cotizacion", label: "Cotizaciones" },
  { key: "aprobacion", label: "Aprobaciones" },
];

export default function AprobarPage() {
  const { data, mutate, isLoading } = useSWR<DecisionesResult>("/api/m/decisiones", fetcher);
  const [filtro, setFiltro] = useState<"todos" | Decision["tipo"]>("todos");
  const [sel, setSel] = useState<Decision | null>(null);

  const items = (data?.items ?? []).filter((d) => filtro === "todos" || d.tipo === filtro);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Aprobar / Decidir</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border ${
              filtro === f.key ? "bg-primary text-primary-foreground" : "bg-background"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Cargando…</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">No hay nada esperando tu decisión. 🎉</p>
      )}
      <div className="space-y-3">
        {items.map((d) => (
          <DecisionCard key={`${d.tipo}:${d.id}`} d={d} onClick={() => setSel(d)} />
        ))}
      </div>

      <DecisionSheet decision={sel} onClose={() => setSel(null)} onDone={() => mutate()} />
    </div>
  );
}
