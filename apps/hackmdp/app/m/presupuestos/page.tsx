"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const money = (n: unknown, mon = "ARS") => `${mon === "USD" ? "US$" : "$"}${Number(n ?? 0).toLocaleString("es-AR")}`;

type Item = { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number; moneda?: string };
type Presu = {
  id: string;
  numero: string;
  estado?: string;
  total: number;
  moneda?: string;
  fecha_emision?: string;
  items_count?: number;
  cliente?: { nombre?: string; nombre_fantasia?: string };
  items?: Item[];
};

export default function PresupuestosPage() {
  const { data } = useSWR<Presu[]>("/api/presupuestos-equipos", fetcher);
  const [sel, setSel] = useState<Presu | null>(null);
  const lista = Array.isArray(data) ? data : [];
  const nombre = (p: Presu) => p.cliente?.nombre_fantasia || p.cliente?.nombre || "—";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/m/inicio" className="text-muted-foreground"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-semibold">Presupuestos</h1>
      </div>

      {lista.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">Sin presupuestos.</p>}
      <div className="space-y-3">
        {lista.map((p) => (
          <button key={p.id} onClick={() => setSel(p)} className="w-full text-left rounded-xl border bg-background p-4">
            <div className="flex justify-between gap-2">
              <span className="font-medium truncate">{nombre(p)}</span>
              <span className="text-sm">{money(p.total, p.moneda)}</span>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {p.numero}{p.estado ? ` · ${p.estado}` : ""}{p.items_count != null ? ` · ${p.items_count} ítems` : ""}
            </div>
          </button>
        ))}
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-6">
          {sel && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle>{nombre(sel)}</SheetTitle>
              </SheetHeader>
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <div>{sel.numero}{sel.estado ? ` · ${sel.estado}` : ""}{sel.fecha_emision ? ` · ${sel.fecha_emision}` : ""}</div>
              </div>
              <ul className="mt-4 divide-y">
                {(sel.items ?? []).map((it, idx) => (
                  <li key={idx} className="py-2 flex justify-between gap-2 text-sm">
                    <span className="truncate">{it.cantidad}× {it.descripcion}</span>
                    <span>{money(it.subtotal, it.moneda ?? sel.moneda)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{money(sel.total, sel.moneda)}</span>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
