"use client";

import { useState } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CobroIvrDialog } from "@/components/core-ui/CobroIvrDialog";
import { formatCurrency } from "@/lib/format-currency";

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error("No se pudieron cargar los cobros");
    return r.json();
  });

interface CobroListado {
  id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  ivr_numero?: string;
  notas?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clienteId: string;
  clienteNombre: string;
  onDone: () => void;
}

export function ElegirCobroReasignarDialog({ open, onOpenChange, clienteId, clienteNombre, onDone }: Props) {
  const { data: cobros, error } = useSWR<CobroListado[]>(
    open && clienteId ? `/api/cobros-ivr?cliente_id=${clienteId}` : null,
    fetcher
  );
  const [cobroSel, setCobroSel] = useState<CobroListado | null>(null);

  return (
    <>
      <Dialog open={open && !cobroSel} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>Elegí el pago mal imputado</DialogTitle></DialogHeader>
          <div className="divide-y max-h-96 overflow-y-auto">
            {error ? (
              <p className="p-3 text-sm text-muted-foreground">No se pudieron cargar los cobros.</p>
            ) : (
              <>
                {Array.isArray(cobros) && cobros.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCobroSel(c)}
                    className="w-full text-left p-3 hover:bg-muted/50"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{formatCurrency(Number(c.monto))}</span>
                      <span className="text-xs text-muted-foreground">{c.ivr_numero || "—"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.fecha_pago?.slice(0, 10)} · {c.metodo_pago}</div>
                  </button>
                ))}
                {Array.isArray(cobros) && cobros.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">Este cliente no tiene cobros.</p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {cobroSel && (
        <CobroIvrDialog
          open={!!cobroSel}
          onOpenChange={(o) => { if (!o) setCobroSel(null); }}
          clienteId={clienteId}
          clienteNombre={clienteNombre}
          modoReasignar
          editCobro={{
            id: cobroSel.id,
            cliente_id: clienteId,
            monto: cobroSel.monto,
            fecha_pago: cobroSel.fecha_pago,
            metodo_pago: cobroSel.metodo_pago,
            notas: cobroSel.notas ?? null,
          }}
          onSuccess={() => { setCobroSel(null); onOpenChange(false); onDone(); }}
        />
      )}
    </>
  );
}
