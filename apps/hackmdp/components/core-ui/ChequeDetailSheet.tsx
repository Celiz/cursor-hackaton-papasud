"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Wallet,
  Building2,
  User,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Ban,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Cheque } from "@/app/dashboard/cheques/columns";
import { formatCurrency } from "@/lib/branding";

interface ChequeDetailSheetProps {
  cheque: Cheque | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const ESTADO_LABELS: Record<Cheque["estado"], string> = {
  en_cartera: "En cartera",
  depositado: "Depositado",
  cobrado: "Cobrado",
  rechazado: "Rechazado",
  endosado: "Endosado",
  anulado: "Anulado",
  entregado: "Entregado",
};

const ESTADO_COLORS: Record<Cheque["estado"], string> = {
  en_cartera: "bg-amber-100 text-amber-800 border-amber-200",
  depositado: "bg-blue-100 text-blue-800 border-blue-200",
  cobrado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rechazado: "bg-red-100 text-red-800 border-red-200",
  endosado: "bg-purple-100 text-purple-800 border-purple-200",
  anulado: "bg-gray-100 text-gray-600 border-gray-200",
  entregado: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = value.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-sm">{value || <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

/**
 * Sheet de detalle de cheque con acciones para avanzar el ciclo de vida.
 *
 * Acciones disponibles según el estado actual:
 *   - en_cartera → depositar, cobrar (si ya depositado), rechazar, anular, endosar
 *   - depositado → cobrar (auto-stamp fecha_acreditacion), rechazar
 *   - cobrado / rechazado / anulado / endosado → solo lectura (fin del ciclo)
 *
 * El backend auto-stampa fechas correspondientes cuando se cambia el estado
 * (PATCH /api/cheques/:id, ver ruta).
 */
export function ChequeDetailSheet({ cheque, open, onOpenChange, onUpdated }: ChequeDetailSheetProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [notas, setNotas] = useState("");
  const router = useRouter();

  if (!cheque) return null;

  const isFinal = ["cobrado", "rechazado", "anulado"].includes(cheque.estado);

  const updateEstado = async (
    nuevoEstado: Cheque["estado"],
    extra?: Record<string, unknown>
  ) => {
    setLoading(nuevoEstado);
    try {
      const res = await fetch(`/api/cheques/${cheque.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al actualizar");
      }
      toast.success(`Cheque marcado como ${ESTADO_LABELS[nuevoEstado].toLowerCase()}`);
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Cheque #{cheque.numero}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">
              {cheque.tipo === "tercero" ? "De tercero" : "Propio"}
            </Badge>
            <Badge variant="outline" className={ESTADO_COLORS[cheque.estado]}>
              {ESTADO_LABELS[cheque.estado]}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Monto destacado */}
          <div className="p-4 bg-muted/30 rounded-lg border text-center">
            <p className="text-xs uppercase text-muted-foreground mb-1">Monto</p>
            <p className="text-3xl font-mono font-semibold">
              {formatCurrency(Number(cheque.monto))}
            </p>
            {cheque.moneda !== "ARS" && (
              <p className="text-xs text-muted-foreground mt-1">Moneda: {cheque.moneda}</p>
            )}
          </div>

          {/* Datos del cheque */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Datos
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Número" value={<span className="font-mono">{cheque.numero}</span>} />
              <Field label="Banco" value={cheque.banco} />
              <Field label="Sucursal" value={cheque.sucursal_banco} />
              <Field label="Moneda" value={cheque.moneda} />
            </div>
          </div>

          {/* Librador (para cheques de tercero) */}
          {cheque.tipo === "tercero" && (cheque.nombre_librador || cheque.cuit_librador) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Librador
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre" value={cheque.nombre_librador} />
                <Field label="CUIT" value={<span className="font-mono">{cheque.cuit_librador}</span>} />
              </div>
            </div>
          )}

          {/* Cliente vinculado */}
          {cheque.cliente_id && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                Cliente vinculado
              </h3>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(() => router.push(`/dashboard/empresas?id=${cheque.cliente_id}`), 200);
                }}
                className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{cheque.cliente_nombre || "Sin nombre"}</p>
                  {cheque.cliente_cuit && (
                    <p className="text-xs text-muted-foreground font-mono">{cheque.cliente_cuit}</p>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Fechas del ciclo de vida */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Fechas
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Emisión" value={formatDate(cheque.fecha_emision)} />
              <Field label="Recepción" value={formatDate(cheque.fecha_recepcion)} />
              <Field label="Fecha de pago" value={formatDate(cheque.fecha_pago)} />
              <Field label="Depósito" value={formatDate(cheque.fecha_deposito)} />
              <Field label="Acreditación" value={formatDate(cheque.fecha_acreditacion)} />
              <Field label="Rechazo" value={formatDate(cheque.fecha_rechazo)} />
            </div>
          </div>

          {/* Endoso (si aplica) */}
          {cheque.endosado_a && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Endoso</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Endosado a" value={cheque.endosado_a} />
                <Field label="Fecha" value={formatDate(cheque.fecha_endoso)} />
              </div>
            </div>
          )}

          {/* Observaciones */}
          {cheque.observaciones && (
            <div className="space-y-2">
              <Label className="text-[11px] uppercase text-muted-foreground">Observaciones</Label>
              <p className="text-sm whitespace-pre-wrap p-3 bg-muted/20 rounded-lg border">
                {cheque.observaciones}
              </p>
            </div>
          )}

          {/* Acciones del ciclo de vida */}
          {!isFinal && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Acciones
              </h3>
              <div className="flex flex-col gap-2">
                {cheque.estado === "en_cartera" && (
                  <>
                    <Button
                      onClick={() => updateEstado("depositado")}
                      disabled={loading !== null}
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading === "depositado" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                      Marcar como depositado
                    </Button>
                    <Button
                      onClick={() => updateEstado("cobrado")}
                      disabled={loading !== null}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {loading === "cobrado" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Cobrar directamente
                    </Button>
                  </>
                )}
                {cheque.estado === "depositado" && (
                  <Button
                    onClick={() => updateEstado("cobrado")}
                    disabled={loading !== null}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {loading === "cobrado" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Marcar como acreditado
                  </Button>
                )}

                <Button
                  type="outline"
                  onClick={() => updateEstado("rechazado")}
                  disabled={loading !== null}
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  {loading === "rechazado" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Marcar como rechazado
                </Button>
                <Button
                  type="outline"
                  onClick={() => updateEstado("anulado")}
                  disabled={loading !== null}
                  className="gap-2 text-gray-600"
                >
                  {loading === "anulado" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Anular
                </Button>
              </div>
            </div>
          )}

          {isFinal && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Este cheque está en estado final y no admite más acciones.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
