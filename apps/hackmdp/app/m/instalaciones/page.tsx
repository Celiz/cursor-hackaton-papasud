"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Inst = {
  id: string;
  estado?: string;
  cliente_nombre?: string;
  direccion_efectiva?: string;
  total_items?: number;
  placeholders_pendientes?: number;
  fecha_prevista?: string;
};

function materiales(i: Inst): { txt: string; cls: string } {
  const total = i.total_items ?? 0;
  const pend = i.placeholders_pendientes ?? 0;
  if (total === 0) return { txt: "Sin materiales cargados", cls: "text-muted-foreground" };
  if (pend === 0) return { txt: "Materiales completos ✅", cls: "text-green-600" };
  return { txt: `Faltan ${pend} de ${total} por recibir ⏳`, cls: "text-amber-600" };
}

export default function InstalacionesPage() {
  const { data } = useSWR<Inst[]>("/api/instalaciones", fetcher);
  const [filtro, setFiltro] = useState<string>("todas");
  const [sel, setSel] = useState<Inst | null>(null);
  const lista = Array.isArray(data) ? data : [];

  const estados = Array.from(new Set(lista.map((i) => i.estado || "Sin etapa")));
  const visibles = lista.filter((i) => filtro === "todas" || (i.estado || "Sin etapa") === filtro);
  const esperandoMateriales = lista.filter((i) => (i.placeholders_pendientes ?? 0) > 0).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/m/inicio" className="text-muted-foreground"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-semibold">Instalaciones</h1>
      </div>

      <div className="rounded-xl border bg-primary/5 p-3 text-sm">
        {lista.length} activas · <span className="text-amber-600">{esperandoMateriales} esperando materiales</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["todas", ...estados].map((e) => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border ${filtro === e ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {e === "todas" ? "Todas" : e}
          </button>
        ))}
      </div>

      {visibles.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">Sin instalaciones.</p>}
      <div className="space-y-3">
        {visibles.map((i) => {
          const m = materiales(i);
          return (
            <button key={i.id} onClick={() => setSel(i)} className="w-full text-left rounded-xl border bg-background p-4">
              <div className="flex justify-between gap-2">
                <span className="font-medium truncate">{i.cliente_nombre || "—"}</span>
                {i.estado && <span className="text-xs text-muted-foreground">{i.estado}</span>}
              </div>
              {i.direccion_efectiva && <div className="text-sm text-muted-foreground truncate">{i.direccion_efectiva}</div>}
              <div className={`text-sm mt-1 ${m.cls}`}>{m.txt}</div>
            </button>
          );
        })}
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-6">
          {sel && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle>{sel.cliente_nombre || "—"}</SheetTitle>
              </SheetHeader>
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                {sel.estado && <div>Etapa: {sel.estado}</div>}
                {sel.direccion_efectiva && <div>{sel.direccion_efectiva}</div>}
                {sel.fecha_prevista && <div>Prevista: {sel.fecha_prevista}</div>}
              </div>
              <div className={`mt-4 text-sm ${materiales(sel).cls}`}>{materiales(sel).txt}</div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
