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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet, ChevronDown, ChevronUp } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";
import {
  resumen,
  estadoResultante,
  parseMonto,
  construirAplicaciones,
  type FilaReasignacion,
} from "@/lib/reasignar-imputacion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface IvrPendiente {
  id: string;
  nro_factura?: string;
  total: number;
  saldo_pendiente?: number;
  estado: string;
  fecha_emision?: string;
}

interface CobroIvrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNombre?: string;
  /** Preseleccionar un remito (entrada "Registrar Cobro" desde un IVR puntual). */
  preselectIvrId?: string;
  /** Arrancar con "usar saldo a favor" tildado y monto 0 (entrada "Asociar a IVR"
   *  de un cobro sin asociar = aplicar ese crédito a un remito). */
  presetUsarSaldoFavor?: boolean;
  onSuccess?: () => void;
  /** Cobro recién creado, para flujo "registrar y enviar". */
  onCobroCreated?: (cobro: any) => void;
  /** Si viene, el diálogo edita ese cobro (PATCH) en vez de crear uno nuevo. */
  editCobro?: {
    id: string;
    cliente_id?: string;
    monto?: number | string;
    fecha_pago?: string;
    metodo_pago?: string;
    notas?: string | null;
    /** El cobro es un anticipo puro (sin factura ni aplicaciones). Al editarlo
     *  se mantiene como saldo a favor, sin ofrecer imputación a remitos. */
    esAnticipo?: boolean;
  } | null;
  /** Arranca en modo manual, precargado con el reparto actual del cobro
   *  (flujo "Reasignar imputación"). Requiere `editCobro`. */
  modoReasignar?: boolean;
}

const METODOS_PAGO = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "mercadopago_joaquin", label: "MercadoPago - Joaquín" },
  { value: "mercadopago_karen", label: "MercadoPago - Karen" },
  { value: "brubank_nahuel", label: "Brubank - Nahuel" },
];

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

export function CobroIvrDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNombre,
  preselectIvrId,
  presetUsarSaldoFavor,
  onSuccess,
  onCobroCreated,
  editCobro,
  modoReasignar,
}: CobroIvrDialogProps) {
  const isEditing = !!editCobro;
  const [monto, setMonto] = useState("");
  const [usarSaldoFavor, setUsarSaldoFavor] = useState(false);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [comentarios, setComentarios] = useState("");
  const [modoManual, setModoManual] = useState(false);
  const [montosManual, setMontosManual] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // IVRs del cliente (saldo cobros-aware) y saldo a favor disponible.
  const { data: ivrsData } = useSWR<IvrPendiente[]>(
    open && clienteId
      ? `/api/ivr?cliente_id=${clienteId}${editCobro ? `&exclude_cobro_id=${editCobro.id}` : ""}`
      : null,
    fetcher
  );
  const { data: clienteData } = useSWR<{ saldo_a_favor_ivr?: number }>(
    open && clienteId ? `/api/clientes/${clienteId}` : null,
    fetcher
  );
  const saldoFavorDisponible = Number(clienteData?.saldo_a_favor_ivr) || 0;

  // Reparto actual del cobro (sólo cuando se está reasignando), para precargar montosManual.
  const { data: aplicacionesActuales } = useSWR<{
    aplicaciones: { factura_id: string; monto_aplicado: number }[];
  }>(
    open && modoReasignar && editCobro?.id
      ? `/api/cobros-ivr/${editCobro.id}/aplicaciones`
      : null,
    (url: string) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el reparto actual");
        return r.json();
      })
  );

  // Pendientes ordenados FIFO (más viejos primero). Si hay preselección, ese primero.
  //
  // En modoReasignar: /api/ivr?exclude_cobro_id=X recalcula saldo_pendiente "como si
  // este cobro no existiera" pero NO recalcula estado — un IVR que ESTE cobro dejó
  // "pagada" vuelve con saldo_pendiente > 0 pero estado='pagada'. El filtro normal
  // (solo pendiente/parcial) lo tira de la lista, así que al reasignar desaparece y
  // el PATCH lo interpreta como "sin aplicación" -> pierde la imputación en silencio.
  // Por eso en reasignar no filtramos por estado: mostramos todo IVR con
  // saldo_pendiente > 0, más cualquier factura que este cobro imputa hoy
  // (aplicacionesActuales), aunque su estado sea "pagada".
  const pendientes = useMemo(() => {
    // Editando un anticipo puro: no ofrecemos imputar a remitos. Se mantiene como
    // saldo a favor (el backend preserva la imputación previa, que es ninguna).
    if (isEditing && editCobro?.esAnticipo) return [];
    const list = Array.isArray(ivrsData) ? ivrsData : [];
    const filtered = modoReasignar
      ? (() => {
          const idsAplicacionesActuales = new Set(
            (aplicacionesActuales?.aplicaciones ?? []).map((a) => a.factura_id)
          );
          return list.filter(
            (f) =>
              (Number(f.saldo_pendiente ?? f.total) || 0) > 0 || idsAplicacionesActuales.has(f.id)
          );
        })()
      : list.filter(
          (f) =>
            (f.estado === "pendiente" || f.estado === "parcial") &&
            (Number(f.saldo_pendiente ?? f.total) || 0) > 0
        );
    const sorted = filtered.sort((a, b) =>
      String(a.fecha_emision || "").localeCompare(String(b.fecha_emision || ""))
    );
    if (preselectIvrId) {
      sorted.sort((a, b) => (a.id === preselectIvrId ? -1 : b.id === preselectIvrId ? 1 : 0));
    }
    return sorted;
  }, [ivrsData, preselectIvrId, isEditing, editCobro, modoReasignar, aplicacionesActuales]);

  // Reset al abrir. En modo edición, precargar los datos del cobro.
  //
  // Dep en editCobro?.id (no en el objeto editCobro): el padre lo pasa como literal
  // inline, con identidad nueva en cada render (ej. al revalidar SWR on-focus). Si
  // dependiéramos del objeto, cada re-render del padre dispara este reset y borra
  // montosManual en silencio, pisando lo que el usuario estaba tipeando/precargando.
  // Los campos de editCobro están atados a su id (mismo cobro = mismos campos), así
  // que el id alcanza para saber cuándo hace falta resetear de verdad.
  useEffect(() => {
    if (!open) return;
    setModoManual(false);
    setMontosManual({});
    if (editCobro) {
      setMonto(editCobro.monto != null ? String(editCobro.monto) : "");
      setUsarSaldoFavor(false);
      setFechaPago(
        editCobro.fecha_pago
          ? String(editCobro.fecha_pago).split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setMetodoPago(editCobro.metodo_pago || "transferencia");
      setComentarios(typeof editCobro.notas === "string" ? editCobro.notas : "");
    } else {
      setMonto("");
      setUsarSaldoFavor(presetUsarSaldoFavor === true);
      setFechaPago(new Date().toISOString().split("T")[0]);
      setMetodoPago("transferencia");
      setComentarios("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetUsarSaldoFavor, editCobro?.id]);

  // Reasignar: precargar montosManual con el reparto actual apenas llega, y forzar modo manual.
  // Efecto separado del reset de arriba para no pisarlo (el reset corre primero, en limpio).
  useEffect(() => {
    if (open && modoReasignar && aplicacionesActuales?.aplicaciones) {
      setModoManual(true);
      const pre: Record<string, string> = {};
      for (const a of aplicacionesActuales.aplicaciones) {
        pre[a.factura_id] = String(a.monto_aplicado);
      }
      setMontosManual(pre);
    }
  }, [open, modoReasignar, aplicacionesActuales]);

  const efectivo = parseFloat(monto) || 0;
  const credito = usarSaldoFavor ? saldoFavorDisponible : 0;
  const pool = efectivo + credito;

  // Preview FIFO (modo automático).
  const previewFifo = useMemo(() => distribuirFifo(pendientes, pool), [pendientes, pool]);

  // Totales en modo manual.
  const totalManual = useMemo(
    () => Object.values(montosManual).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [montosManual]
  );

  // Filas + resumen del ajuste manual, vía el módulo puro (matemática compartida con el backend).
  const filasReasignacion: FilaReasignacion[] = useMemo(
    () =>
      pendientes.map((ivr) => ({
        factura_id: ivr.id,
        nro_factura: ivr.nro_factura || "IVR",
        saldo_sin_este_cobro: Number(ivr.saldo_pendiente ?? ivr.total) || 0,
        asignado: parseMonto(montosManual[ivr.id]),
      })),
    [pendientes, montosManual]
  );
  const resumenReasig = useMemo(
    () => resumen(parseMonto(monto), filasReasignacion),
    [monto, filasReasignacion]
  );
  // "Desasignar todo" ($0 a todos los remitos) no está soportado en v1: el PATCH
  // trata aplicaciones: [] como "no mandé aplicaciones" y preserva la imputación
  // vieja, así que guardar acá sería un no-op que igual dice "Cobro actualizado".
  // Lo prevenimos en vez de mentir que guardó.
  const reasignarDesasignaTodo = modoReasignar && resumenReasig.totalAsignado <= 0.005;

  const totalAplicado = modoManual ? totalManual : previewFifo.totalAplicado;
  const sobranteAFavor = Math.max(0, pool - totalAplicado);
  const creditoConsumido = Math.max(0, totalAplicado - efectivo);

  const handleSubmit = async (enviar: boolean) => {
    if (efectivo <= 0 && !usarSaldoFavor) {
      toast.error("Ingresá un monto o aplicá saldo a favor");
      return;
    }
    if (pool <= 0) {
      toast.error("No hay monto ni saldo a favor para aplicar");
      return;
    }
    if (modoManual && totalManual > pool + 0.01) {
      toast.error("Lo aplicado a los remitos excede el monto + saldo a favor");
      return;
    }
    if (reasignarDesasignaTodo) {
      // Defensa en profundidad: el botón ya queda disabled en este caso, pero
      // evitamos igual el PATCH con aplicaciones: [] (que el backend interpreta
      // como "no tocar nada" y preserva la imputación vieja en silencio).
      toast.error("No podés dejar el cobro sin imputar desde acá: asignale algo a un remito");
      return;
    }

    setLoading(true);
    try {
      const aplicaciones = modoManual
        ? modoReasignar
          ? construirAplicaciones(filasReasignacion)
          : Object.entries(montosManual)
              .map(([factura_id, v]) => ({ factura_id, monto_aplicado: parseFloat(v) || 0 }))
              .filter((a) => a.monto_aplicado > 0)
        : undefined;

      const res = await fetch(
        isEditing ? `/api/cobros-ivr?id=${editCobro!.id}` : "/api/cobros-ivr",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: clienteId,
            monto: efectivo,
            usar_saldo_favor: usarSaldoFavor,
            fecha_pago: fechaPago,
            metodo_pago: metodoPago,
            notas: comentarios || null,
            aplicaciones,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || (isEditing ? "Error al editar el cobro" : "Error al registrar el cobro"));

      const partes = [
        totalAplicado > 0.01 ? `${formatCurrency(totalAplicado)} aplicado` : null,
        sobranteAFavor > 0.01 ? `${formatCurrency(sobranteAFavor)} a saldo a favor` : null,
      ].filter(Boolean);
      toast.success(
        `${isEditing ? "Cobro actualizado" : "Cobro registrado"}${partes.length ? " · " + partes.join(" · ") : ""}`
      );

      onSuccess?.();
      onOpenChange(false);
      if (enviar && data?.id && onCobroCreated) {
        setTimeout(() => onCobroCreated(data), 200);
      }
    } catch (e: any) {
      toast.error(e.message || "Error al registrar el cobro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cobro" : "Registrar cobro"}</DialogTitle>
          <DialogDescription>{clienteNombre || "Cliente"}</DialogDescription>
        </DialogHeader>

        {isEditing && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            {editCobro?.esAnticipo
              ? "Editás un anticipo (saldo a favor). Cambiar fecha o monto no lo imputa a remitos: se mantiene como saldo a favor."
              : "Editás un cobro existente. Se mantiene la imputación actual salvo que la ajustes manualmente por remito."}
          </div>
        )}

        <div className="space-y-4">
          {/* Monto recibido */}
          <div className="space-y-1.5">
            <Label htmlFor="cobro-monto" className="text-sm font-medium">
              Monto recibido
            </Label>
            <Input
              id="cobro-monto"
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
              disabled={modoReasignar}
              className="h-11 text-base font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              {modoReasignar
                ? "Reasignar solo redistribuye lo que ya entró: el monto no se puede editar acá."
                : "Efectivo/transferencia que entró ahora. Podés dejarlo en 0 si solo aplicás saldo a favor."}
            </p>
          </div>

          {/* Saldo a favor */}
          {saldoFavorDisponible > 0 && (
            <label className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 cursor-pointer">
              <Checkbox
                checked={usarSaldoFavor}
                onCheckedChange={(c) => setUsarSaldoFavor(c === true)}
              />
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span className="text-sm">
                Usar saldo a favor disponible:{" "}
                <span className="font-semibold">{formatCurrency(saldoFavorDisponible)}</span>
              </span>
            </label>
          )}

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
              {creditoConsumido > 0.01 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Usa de saldo a favor</span>
                  <span>-{formatCurrency(creditoConsumido)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Queda a favor</span>
                <span className="font-medium">{formatCurrency(sobranteAFavor)}</span>
              </div>
            </div>
          )}

          {pendientes.length === 0 && pool > 0 && (
            <p className="text-sm text-muted-foreground italic">
              Este cliente no tiene remitos pendientes. El cobro queda como saldo a favor.
            </p>
          )}

          {/* Ajuste manual */}
          {pendientes.length > 0 && (
            <div>
              {!modoReasignar && (
                <button
                  type="button"
                  onClick={() => setModoManual((v) => !v)}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                >
                  {modoManual ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {modoManual ? "Usar reparto automático (FIFO)" : "Ajustar manualmente por remito"}
                </button>
              )}
              {(modoManual || modoReasignar) && (
                <div className="mt-2">
                  {modoReasignar && (
                    <div className="flex justify-between text-xs mb-2">
                      <span>
                        Asignado {formatCurrency(resumenReasig.totalAsignado)} de{" "}
                        {formatCurrency(parseMonto(monto))}
                      </span>
                      <span className={resumenReasig.excede ? "text-rose-600" : "text-muted-foreground"}>
                        {resumenReasig.excede
                          ? "te pasaste"
                          : `sin asignar ${formatCurrency(resumenReasig.sinAsignar)}`}
                      </span>
                    </div>
                  )}
                  {reasignarDesasignaTodo && (
                    <p className="text-xs text-rose-600 mb-2">
                      No podés dejar el cobro sin imputar desde acá: asignale algo a al
                      menos un remito (desasignar todo a saldo a favor no está soportado).
                    </p>
                  )}
                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
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
                          {modoReasignar &&
                            (() => {
                              const fila = filasReasignacion.find((f) => f.factura_id === ivr.id)!;
                              const er = estadoResultante(fila.saldo_sin_este_cobro, fila.asignado);
                              return (
                                <span className="text-xs w-24 text-right text-muted-foreground">
                                  {er.estado === "pagada"
                                    ? "queda pagada"
                                    : er.estado === "parcial"
                                      ? `parcial ${formatCurrency(er.pendiente)}`
                                      : "pendiente"}
                                </span>
                              );
                            })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fecha + método */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cobro-fecha" className="text-sm font-medium">Fecha de pago</Label>
              <Input
                id="cobro-fecha"
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Método de pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-sm">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Comentarios</Label>
            <Textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Agregar comentarios (opcional)"
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="default" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={() => handleSubmit(false)}
            loading={loading}
            disabled={loading || (modoReasignar && (resumenReasig.excede || reasignarDesasignaTodo))}
          >
            {isEditing ? "Guardar cambios" : "Registrar cobro"}
          </Button>
          {!isEditing && (
            <Button
              type="default"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              Registrar y enviar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
