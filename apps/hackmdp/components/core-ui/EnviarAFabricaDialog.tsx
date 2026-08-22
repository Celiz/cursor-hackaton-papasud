"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Truck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EnviarAFabricaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicioId: string;
  equipoUnidadId: string | null | undefined;
  equipoLabel?: string;
  onSuccess?: () => void;
}

/**
 * Dialog para registrar el envío de un equipo a fábrica/taller externo.
 *
 * Crea un movimiento `envio_taller` en `equipos_movimientos`, lo cual:
 *   1. Deja registro auditado del envío con tracking, transportista, etc.
 *   2. Actualiza la unidad: `ubicacion_tipo='taller'`, `estado_comodato='en_reparacion'`
 *   3. Permite que aparezca en la futura vista "Equipos fuera del depósito"
 */
export function EnviarAFabricaDialog({
  open,
  onOpenChange,
  servicioId,
  equipoUnidadId,
  equipoLabel,
  onSuccess,
}: EnviarAFabricaDialogProps) {
  const [destino, setDestino] = useState("");
  const [responsable, setResponsable] = useState("");
  const [transportista, setTransportista] = useState("");
  const [tracking, setTracking] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState<Date | undefined>(undefined);
  const [condicionPrevia, setCondicionPrevia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDestino("");
    setResponsable("");
    setTransportista("");
    setTracking("");
    setFechaProgramada(undefined);
    setCondicionPrevia("");
    setObservaciones("");
  };

  const handleSubmit = async () => {
    if (!equipoUnidadId) {
      toast.error("Este servicio no tiene equipo asociado");
      return;
    }
    if (!destino.trim()) {
      toast.error("Indicá el destino (a quién se envía)");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/equipos-movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_unidad_id: equipoUnidadId,
          tipo: "envio_taller",
          servicio_id: servicioId,
          fecha_movimiento: new Date().toISOString(),
          fecha_programada: fechaProgramada
            ? fechaProgramada.toISOString().slice(0, 10)
            : null,
          origen_tipo: "deposito",
          origen_descripcion: "Depósito propio",
          destino_tipo: "taller",
          destino_descripcion: destino.trim(),
          responsable_movimiento: responsable.trim() || null,
          transportista: transportista.trim() || null,
          numero_seguimiento: tracking.trim() || null,
          condicion_previa: condicionPrevia.trim() || null,
          observaciones: observaciones.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Error al registrar el envío");
      }

      toast.success(`Envío a ${destino} registrado correctamente`);
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || "Error al registrar el envío");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-600" />
            Enviar a fábrica / taller externo
          </DialogTitle>
          <DialogDescription>
            {equipoLabel
              ? `Equipo: ${equipoLabel}. `
              : ""}
            El equipo va a quedar marcado como "en reparación externa" hasta que lo
            registres como retornado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="destino" className="text-xs">
              Destino <span className="text-red-500">*</span>
            </Label>
            <Input
              id="destino"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Ej: Mindray Argentina, Olidef Service..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="responsable" className="text-xs">
                Responsable del envío
              </Label>
              <Input
                id="responsable"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Quién lo despachó"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transportista" className="text-xs">
                Transportista
              </Label>
              <Input
                id="transportista"
                value={transportista}
                onChange={(e) => setTransportista(e.target.value)}
                placeholder="Andreani, OCA, propio..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tracking" className="text-xs">
                N° de seguimiento
              </Label>
              <Input
                id="tracking"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Tracking del envío"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Retorno estimado</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-full h-9 px-3 rounded-md border text-sm font-normal flex items-center gap-2 transition-colors",
                      fechaProgramada
                        ? "bg-purple-50 dark:bg-purple-900/30 border-purple-300 text-purple-700"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
                    {fechaProgramada
                      ? format(fechaProgramada, "dd/MM/yyyy", { locale: es })
                      : "DD/MM/AAAA"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={fechaProgramada}
                    onSelect={setFechaProgramada}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="condicion" className="text-xs">
              Condición del equipo al salir
            </Label>
            <Textarea
              id="condicion"
              value={condicionPrevia}
              onChange={(e) => setCondicionPrevia(e.target.value)}
              placeholder="Estado físico, accesorios incluidos, daños visibles..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observaciones" className="text-xs">
              Observaciones
            </Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Trabajo solicitado, presupuesto, notas internas..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="default"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            disabled={submitting || !equipoUnidadId}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4" />
                Registrar envío
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
