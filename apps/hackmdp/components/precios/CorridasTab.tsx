"use client";

import { useState } from "react";
import useSWR from "swr";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmt = (n: number | string | null) => {
  if (n == null) return "—";
  const v = Number(n);
  if (isNaN(v)) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v);
};

interface Corrida {
  id: string;
  tipo: string;
  descripcion: string;
  productos_afectados: number;
  created_at: string;
  revertida_at: string | null;
  reversion_de_corrida_id: string | null;
  proveedor_nombre: string | null;
  usuario_nombre?: string | null;
}

interface Item {
  producto_id: string;
  codigo: string;
  nombre: string;
  tipo_precio: string;
  precio_anterior: number | string | null;
  precio_nuevo: number | string | null;
}

export function CorridasTab({ isAdmin }: { isAdmin: boolean }) {
  const { data, mutate } = useSWR<{ corridas: Corrida[] }>("/api/precios/corridas", fetcher);
  const [detalle, setDetalle] = useState<string | null>(null);
  const { data: det } = useSWR<{ corrida: Corrida; items: Item[] }>(
    detalle ? `/api/precios/corridas/${detalle}` : null,
    fetcher
  );
  const [revirtiendo, setRevirtiendo] = useState(false);

  async function revertir(id: string) {
    if (
      !confirm(
        "¿Revertir esta corrida? Los productos vuelven al precio anterior de esta corrida (aunque hayan cambiado después)."
      )
    )
      return;
    setRevirtiendo(true);
    try {
      const res = await fetch(`/api/precios/corridas/${id}/revertir`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Error al revertir");
        return;
      }
      alert(`Revertidos ${j.productos_revertidos} productos`);
      setDetalle(null);
      mutate();
    } finally {
      setRevirtiendo(false);
    }
  }

  const corridas = data?.corridas ?? [];

  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-2">Fecha</th>
            <th>Operación</th>
            <th>Proveedor</th>
            <th className="text-right">Productos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {corridas.map((c) => (
            <tr key={c.id} className="border-b hover:bg-muted/40">
              <td className="py-2">{new Date(c.created_at).toLocaleString("es-AR")}</td>
              <td>
                {c.descripcion}
                {c.revertida_at && (
                  <Badge variant="secondary" className="ml-2">
                    revertida
                  </Badge>
                )}
                {c.reversion_de_corrida_id && (
                  <Badge variant="outline" className="ml-2">
                    reversión
                  </Badge>
                )}
              </td>
              <td>{c.proveedor_nombre ?? "—"}</td>
              <td className="text-right">{c.productos_afectados}</td>
              <td className="text-right">
                <Button variant="ghost" size="sm" onClick={() => setDetalle(c.id)}>
                  Ver
                </Button>
              </td>
            </tr>
          ))}
          {corridas.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted-foreground">
                Sin corridas todavía
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Sheet open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{det?.corrida?.descripcion ?? "Detalle"}</SheetTitle>
          </SheetHeader>
          {det && (
            <div className="mt-4 space-y-3">
              {isAdmin && !det.corrida.revertida_at && !det.corrida.reversion_de_corrida_id && (
                <Button
                  variant="destructive"
                  disabled={revirtiendo}
                  onClick={() => revertir(det.corrida.id)}
                >
                  {revirtiendo ? "Revirtiendo…" : "Revertir esta corrida"}
                </Button>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-1">Producto</th>
                    <th>Campo</th>
                    <th className="text-right">Antes</th>
                    <th className="text-right">Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {det.items.map((it, i) => {
                    const prevVal = Number(it.precio_anterior);
                    const newVal = Number(it.precio_nuevo);
                    const up = newVal >= prevVal;
                    return (
                      <tr key={i} className="border-b">
                        <td className="py-1">
                          {it.codigo} · {it.nombre}
                        </td>
                        <td>{it.tipo_precio}</td>
                        <td className="text-right">{fmt(it.precio_anterior)}</td>
                        <td className={`text-right ${up ? "text-emerald-600" : "text-red-600"}`}>
                          {up ? "▲" : "▼"} {fmt(it.precio_nuevo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
