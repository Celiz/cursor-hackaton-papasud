"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, Plus, Loader2, History } from "lucide-react";
import type { RenglonIvr } from "@/lib/ivr-renglones";

interface IvrHistorialItem {
  id: string;
  nro_factura: string | null;
  fecha_emision: string;
  total: number;
  estado: string;
  renglones: RenglonIvr[];
}

interface IvrHistorialPanelProps {
  clienteId: string | null;
  /** Reemplaza/llena los items del form con todos los renglones del IVR elegido. */
  onCopiarTodo: (renglones: RenglonIvr[]) => void;
  /** Suma un renglón suelto a los items del form. */
  onAgregarItem: (renglon: RenglonIvr) => void;
  className?: string;
}

export function IvrHistorialPanel({
  clienteId,
  onCopiarTodo,
  onAgregarItem,
  className,
}: IvrHistorialPanelProps) {
  const [ivrs, setIvrs] = useState<IvrHistorialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga (con debounce para la búsqueda). Se dispara al cambiar cliente o texto.
  useEffect(() => {
    if (!clienteId) {
      setIvrs([]);
      return;
    }
    let active = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams({ cliente_id: clienteId, limit: "20" });
      if (search.trim()) params.set("q", search.trim());
      setLoading(true);
      fetch(`/api/ivr/historial-cliente?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (active) setIvrs(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (active) setIvrs([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [clienteId, search]);

  // "Copiar total": para IVR sin renglones, arma un renglón único con el total.
  const copiarTotal = (ivr: IvrHistorialItem) => {
    onCopiarTodo([
      {
        descripcion: ivr.nro_factura || "IVR",
        cantidad: 1,
        precio_unitario: ivr.total,
        subtotal: ivr.total,
      },
    ]);
  };

  const contenido = useMemo(() => {
    if (!clienteId) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <History className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Elegí un cliente para ver sus IVR anteriores.
          </p>
        </div>
      );
    }
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (ivrs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <p className="text-sm text-muted-foreground">
            {search.trim()
              ? "No se encontraron IVR con esa búsqueda."
              : "Este cliente no tiene IVR anteriores."}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2 p-3">
        {ivrs.map((ivr) => (
          <div key={ivr.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm font-mono">{ivr.nro_factura || "Sin número"}</span>
              <span className="text-sm font-semibold">{formatCurrency(ivr.total)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span>{new Date(ivr.fecha_emision).toLocaleDateString("es-AR")}</span>
              <span>·</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {ivr.estado === "pagada" ? "Cobrado" : "Pendiente"}
              </Badge>
            </div>

            {ivr.renglones.length > 0 ? (
              <>
                <Button
                  htmlType="button"
                  type="outline"
                  size="small"
                  className="w-full mb-2"
                  onClick={() => onCopiarTodo(ivr.renglones)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copiar todo ({ivr.renglones.length})
                </Button>
                <div className="space-y-1">
                  {ivr.renglones.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onAgregarItem(r)}
                      className="w-full text-left flex items-center justify-between gap-2 rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                      title="Sumar solo este item"
                    >
                      <span className="truncate">{r.descripcion || "(sin descripción)"}</span>
                      <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
                        {formatCurrency(r.precio_unitario)}
                        <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <Button
                htmlType="button"
                type="outline"
                size="small"
                className="w-full"
                onClick={() => copiarTotal(ivr)}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar total
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }, [clienteId, loading, ivrs, search, onCopiarTodo, onAgregarItem]);

  return (
    <div className={className}>
      <div className="px-3 pt-3 pb-2 border-b">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          IVR anteriores del cliente
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar N° o descripción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            disabled={!clienteId}
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{contenido}</div>
    </div>
  );
}
