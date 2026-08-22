"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface IvrPendiente {
  id: string;
  nro_factura?: string;
  total: number;
  saldo_pendiente?: number;
  estado: string;
  fecha_emision?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNombre?: string;
  /** Preseleccionar un IVR (entrada desde un IVR puntual): solo ordena el preview. */
  preselectIvrId?: string;
  onSuccess?: () => void;
}

// Distribuye `pool` FIFO sobre los pendientes (ya ordenados) y devuelve el detalle.
function distribuirFifo(pendientes: IvrPendiente[], pool: number) {
  let restante = pool;
  const detalle: { ivr: IvrPendiente; aplicado: number }[] = [];
  for (const ivr of pendientes) {
    if (restante <= 0.005) break;
    const saldo = Number(ivr.saldo_pendiente ?? ivr.total) || 0;
    const aplicado = Math.min(saldo, restante);
    if (aplicado > 0.005) {
      detalle.push({ ivr, aplicado });
      restante -= aplicado;
    }
  }
  const totalAplicado = detalle.reduce((s, d) => s + d.aplicado, 0);
  return { detalle, totalAplicado, sobrante: Math.max(0, pool - totalAplicado) };
}

export function NotaCreditoIvrFormDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNombre,
  preselectIvrId,
  onSuccess,
}: Props) {
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [modoManual, setModoManual] = useState(false);
  const [montosManual, setMontosManual] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // IVRs pendientes del cliente (saldo cobros+NC-aware, vía /api/ivr).
  const { data: ivrsData } = useSWR<IvrPendiente[]>(
    open && clienteId ? `/api/ivr?cliente_id=${clienteId}` : null,
    fetcher
  );

  // Pendientes ordenados FIFO (más viejos primero). Si hay preselección, ese primero.
  const pendientes = useMemo(() => {
    const list = (Array.isArray(ivrsData) ? ivrsData : [])
      .filter(
        (f) =>
          (f.estado === "pendiente" || f.estado === "parcial") &&
          (Number(f.saldo_pendiente ?? f.total) || 0) > 0
      )
      .sort((a, b) => String(a.fecha_emision || "").localeCompare(String(b.fecha_emision || "")));
    if (preselectIvrId) {
      list.sort((a, b) => (a.id === preselectIvrId ? -1 : b.id === preselectIvrId ? 1 : 0));
    }
    return list;
  }, [ivrsData, preselectIvrId]);

  // Reset al abrir.
  useEffect(() => {
    if (!open) return;
    setMonto("");
    setMotivo("");
    setFecha(new Date().toISOString().split("T")[0]);
    setModoManual(false);
    setMontosManual({});
  }, [open]);

  const pool = parseFloat(monto) || 0;
  const previewFifo = useMemo(() => distribuirFifo(pendientes, pool), [pendientes, pool]);
  const totalManual = useMemo(
    () => Object.values(montosManual).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [montosManual]
  );
  const totalAplicado = modoManual ? totalManual : previewFifo.totalAplicado;
  const sobranteAFavor = Math.max(0, pool - totalAplicado);

  const handleSubmit = async () => {
    if (pool <= 0) {
      toast.error("Ingresá un monto mayor a 0");
      return;
    }
    if (modoManual && totalManual > pool + 0.01) {
      toast.error("Lo aplicado a los remitos excede el monto de la NC");
      return;
    }
    setLoading(true);
    try {
      const aplicaciones = modoManual
        ? Object.entries(montosManual)
            .map(([factura_id, v]) => ({ factura_id, monto_aplicado: parseFloat(v) || 0 }))
            .filter((a) => a.monto_aplicado > 0)
        : undefined;

      const res = await fetch("/api/notas-credito-ivr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          monto: pool,
          motivo: motivo || undefined,
          fecha,
          aplicaciones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear la nota de crédito");

      const excedente = Number(data.excedente_a_favor) || sobranteAFavor;
      const partes = [
        totalAplicado > 0.01 ? `${formatCurrency(totalAplicado)} aplicado` : null,
        excedente > 0.01 ? `${formatCurrency(excedente)} a saldo a favor` : null,
      ].filter(Boolean);
      toast.success(
        `Nota de crédito ${data.nro_nota} creada${partes.length ? " · " + partes.join(" · ") : ""}`
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al crear la nota de crédito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nota de crédito de IVR</DialogTitle>
          <DialogDescription>
            {clienteNombre || "Cliente"} · crédito interno contra IVR (sin validez fiscal)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Monto del crédito */}
          <div className="space-y-1.5">
            <Label htmlFor="nc-monto" className="text-sm font-medium">
              Monto del crédito
            </Label>
            <Input
              id="nc-monto"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                setMonto(v);
              }}
              className="h-11 text-base font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Se reparte sobre los remitos pendientes (más viejos primero). Lo que sobra queda como saldo a favor del cliente.
            </p>
          </div>

          {/* Resumen en vivo */}
          {pool > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total a aplicar (FIFO)</span>
                <span className="font-medium">
                  {formatCurrency(totalAplicado)}
                  {!modoManual && previewFifo.detalle.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      {" "}· {previewFifo.detalle.length} remito{previewFifo.detalle.length > 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Queda a favor</span>
                <span className="font-medium">{formatCurrency(sobranteAFavor)}</span>
              </div>
            </div>
          )}

          {pendientes.length === 0 && pool > 0 && (
            <p className="text-sm text-muted-foreground italic">
              Este cliente no tiene remitos pendientes. La NC queda como saldo a favor.
            </p>
          )}

          {/* Ajuste manual */}
          {pendientes.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setModoManual((v) => !v)}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
              >
                {modoManual ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {modoManual ? "Usar reparto automático (FIFO)" : "Ajustar manualmente por remito"}
              </button>
              {modoManual && (
                <div className="mt-2 border rounded-lg divide-y max-h-56 overflow-y-auto">
                  {pendientes.map((ivr) => {
                    const saldo = Number(ivr.saldo_pendiente ?? ivr.total) || 0;
                    return (
                      <div key={ivr.id} className="flex items-center gap-3 p-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{ivr.nro_factura || "IVR"}</p>
                          <p className="text-xs text-muted-foreground">Saldo {formatCurrency(saldo)}</p>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={montosManual[ivr.id] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                            setMontosManual((prev) => ({ ...prev, [ivr.id]: v }));
                          }}
                          className="w-32 text-right text-sm h-9"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="nc-fecha" className="text-sm font-medium">Fecha</Label>
            <Input
              id="nc-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-10 text-sm w-full"
            />
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Motivo</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo de la nota de crédito (opcional)"
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="default" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={loading} disabled={loading}>
            Crear NC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
