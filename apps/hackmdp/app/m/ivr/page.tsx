"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const money = (n: unknown) => `$${Number(n ?? 0).toLocaleString("es-AR")}`;

type Item = { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number };
type Ivr = {
  id: string;
  numero: string;
  estado?: string;
  fecha_emision?: string;
  cliente?: { nombre?: string; nombre_fantasia?: string };
  total: number;
  saldo_pendiente: number;
  facturas_items?: Item[];
};

export default function IvrPage() {
  const { data } = useSWR<Ivr[]>("/api/ivr", fetcher);
  const [sel, setSel] = useState<Ivr | null>(null);
  const lista = Array.isArray(data) ? data : [];
  const nombre = (i: Ivr) => i.cliente?.nombre_fantasia || i.cliente?.nombre || "—";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/m/inicio" className="text-muted-foreground"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-semibold">IVR</h1>
      </div>

      {lista.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">Sin IVR.</p>}
      <div className="space-y-3">
        {lista.map((i) => (
          <button key={i.id} onClick={() => setSel(i)} className="w-full text-left rounded-xl border bg-background p-4">
            <div className="flex justify-between gap-2">
              <span className="font-medium truncate">{nombre(i)}</span>
              <span className="text-sm">{money(i.total)}</span>
            </div>
            <div className="text-sm text-muted-foreground flex justify-between gap-2">
              <span>{i.numero}{i.estado ? ` · ${i.estado}` : ""}</span>
              {i.saldo_pendiente > 0 && <span className="text-red-600">Debe {money(i.saldo_pendiente)}</span>}
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
                {(sel.facturas_items ?? []).map((it, idx) => (
                  <li key={idx} className="py-2 flex justify-between gap-2 text-sm">
                    <span className="truncate">{it.cantidad}× {it.descripcion}</span>
                    <span>{money(it.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{money(sel.total)}</span></div>
                {sel.saldo_pendiente > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Saldo</span><span className="text-red-600 font-semibold">{money(sel.saldo_pendiente)}</span></div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
