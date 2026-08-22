"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Decision } from "@/lib/decisiones";

async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Error");
  return r.json();
}

export function DecisionSheet({
  decision,
  onClose,
  onDone,
}: {
  decision: Decision | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const d = decision;

  async function ejecutar(accion: string) {
    if (!d) return;
    if ((accion === "rechazar") && !rechazando) {
      setRechazando(true);
      return;
    }
    setBusy(true);
    try {
      if (d.tipo === "pedido" && accion === "aprobar") await post("/api/pedidos/aprobar", { pedido_id: d.id });
      else if (d.tipo === "pedido" && accion === "rechazar") await post("/api/pedidos/rechazar", { pedido_id: d.id, motivo });
      else if (d.tipo === "cotizacion" && accion === "cotizar") await post("/api/solicitudes-cotizacion/cotizar", { solicitud_id: d.id });
      else if (d.tipo === "cotizacion" && accion === "rechazar") await post("/api/solicitudes-cotizacion/rechazar", { solicitud_id: d.id, motivo });
      else if (d.tipo === "aprobacion" && accion === "aprobar") await post(`/api/aprobaciones/${d.id}`, { decision: "aprobar", comentario: "" });
      else if (d.tipo === "aprobacion" && accion === "rechazar") await post(`/api/aprobaciones/${d.id}`, { decision: "rechazar", comentario: motivo });
      toast.success(
        accion === "cotizar" ? "Presupuesto borrador creado" : accion === "aprobar" ? "Aprobado" : "Rechazado",
      );
      onDone();
      cerrar();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  }

  function cerrar() {
    setMotivo("");
    setRechazando(false);
    onClose();
  }

  return (
    <Sheet open={!!d} onOpenChange={(o) => !o && cerrar()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-6">
        {d && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>{d.cliente_nombre ?? d.numero}</SheetTitle>
            </SheetHeader>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <div>{d.numero}</div>
              {d.monto != null && <div>Total: ${d.monto.toLocaleString("es-AR")}</div>}
              {d.solicitante && <div>Solicita: {d.solicitante}</div>}
            </div>

            {rechazando && (
              <div className="mt-4">
                <label className="text-sm font-medium">Motivo del rechazo</label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {d.acciones.includes("aprobar") && (
                <Button className="flex-1" disabled={busy} onClick={() => ejecutar("aprobar")}>Aprobar</Button>
              )}
              {d.acciones.includes("cotizar") && (
                <Button className="flex-1" disabled={busy} onClick={() => ejecutar("cotizar")}>Cotizar</Button>
              )}
              {d.acciones.includes("rechazar") && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={busy || (rechazando && !motivo.trim())}
                  onClick={() => ejecutar("rechazar")}
                >
                  {rechazando ? "Confirmar rechazo" : "Rechazar"}
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
