"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { usePreloadedData } from "@/lib/contexts/DataContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Wrench } from "lucide-react";
import { QuickEditableCombobox } from "@/components/ui/quick-editable-combobox";
import useSWR from "swr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NuevoMantenimientoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Si se pasa, el equipo queda pre-seleccionado y el combobox bloqueado. */
  preselectedEquipoId?: string;
}

const fetcherMant = (url: string) => fetch(url).then((r) => r.json());

const TIPO_OPTIONS = [
  { value: "preventivo", label: "Preventivo" },
  { value: "correctivo", label: "Correctivo" },
  { value: "predictivo", label: "Predictivo" },
];

const PRIORIDAD_OPTIONS = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

/**
 * Dialog para crear un nuevo mantenimiento. Similar al NuevaActividad del CRM
 * pero orientado a equipos: seleccionar equipo (unidad), tipo, fecha programada,
 * técnico asignado y notas previas. Al crear, llama onSuccess para refrescar.
 */
export function NuevoMantenimientoDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedEquipoId,
}: NuevoMantenimientoDialogProps) {
  const { clientesOptions, getLaboratoriosByCliente, getEquiposUnidadesByLaboratorio } =
    usePreloadedData();

  const [clienteId, setClienteId] = useState("");
  const [laboratorioId, setLaboratorioId] = useState("");
  const [equipoId, setEquipoId] = useState(preselectedEquipoId || "");
  const [tipo, setTipo] = useState<string>("preventivo");
  const [prioridad, setPrioridad] = useState<string>("media");
  const [fechaProgramada, setFechaProgramada] = useState<Date | undefined>(
    new Date()
  );
  const [hora, setHora] = useState("09:00");
  const [tecnicoNombre, setTecnicoNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [observacionesPrevias, setObservacionesPrevias] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Cascade data
  const laboratoriosOptions = clienteId ? getLaboratoriosByCliente(clienteId) : [];
  const equiposOptions = laboratorioId
    ? getEquiposUnidadesByLaboratorio(laboratorioId)
    : [];

  // Lista de técnicos del catálogo org-scoped
  const { data: tecnicosData, mutate: mutateTecnicos } = useSWR<
    Array<{ nombre: string }>
  >(
    open ? "/api/servicio-tecnicos" : null,
    fetcherMant,
    { dedupingInterval: 2 * 60 * 1000 }
  );
  const tecnicosList = (tecnicosData || []).map((t) => t.nombre).filter(Boolean);

  const reset = () => {
    setClienteId("");
    setLaboratorioId("");
    setEquipoId(preselectedEquipoId || "");
    setTipo("preventivo");
    setPrioridad("media");
    setFechaProgramada(new Date());
    setHora("09:00");
    setTecnicoNombre("");
    setDescripcion("");
    setObservacionesPrevias("");
  };

  useEffect(() => {
    if (open && preselectedEquipoId) {
      setEquipoId(preselectedEquipoId);
    }
  }, [open, preselectedEquipoId]);

  const handleSubmit = async () => {
    if (!equipoId) {
      toast.error("Seleccioná un equipo");
      return;
    }
    if (!fechaProgramada) {
      toast.error("Seleccioná una fecha programada");
      return;
    }

    setSubmitting(true);
    try {
      // Combinar fecha + hora en ISO local
      const [hh, mm] = hora.split(":").map((n) => parseInt(n) || 0);
      const fechaConHora = new Date(fechaProgramada);
      fechaConHora.setHours(hh, mm, 0, 0);

      const res = await fetch("/api/mantenimiento/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: equipoId,
          tipo,
          prioridad,
          fecha_programada: fechaConHora.toISOString(),
          descripcion: descripcion.trim() || null,
          observaciones_previas: observacionesPrevias.trim() || null,
          // tecnico_asignado_id no se manda porque el backend espera un
          // persona_id, pero el catálogo servicio_tecnicos es TEXT libre.
          // Lo guardamos en observaciones_previas por ahora si hace falta.
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al crear el mantenimiento");
      }

      const created = await res.json();
      toast.success(`Mantenimiento ${created.numero} creado`);
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || "Error al crear el mantenimiento");
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
            <Wrench className="h-5 w-5 text-purple-600" />
            Nuevo mantenimiento
          </DialogTitle>
          <DialogDescription>
            Programá un mantenimiento preventivo, correctivo o predictivo
            para un equipo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Cascade Cliente → Laboratorio → Equipo */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Cliente <span className="text-red-500">*</span>
            </Label>
            <SearchableCombobox
              preloadedOptions={clientesOptions}
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v);
                // Al cambiar cliente, resetear lab y equipo
                setLaboratorioId("");
                setEquipoId("");
              }}
              placeholder="Buscar cliente..."
              emptyMessage="No se encontraron clientes"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Laboratorio <span className="text-red-500">*</span>
            </Label>
            <SearchableCombobox
              key={clienteId || "no-client"}
              preloadedOptions={laboratoriosOptions}
              value={laboratorioId}
              onValueChange={(v) => {
                setLaboratorioId(v);
                setEquipoId("");
              }}
              placeholder={
                !clienteId
                  ? "Primero seleccioná un cliente"
                  : laboratoriosOptions.length === 0
                  ? "Cliente sin laboratorios"
                  : "Seleccionar laboratorio"
              }
              disabled={!clienteId || laboratoriosOptions.length === 0}
              emptyMessage="No hay laboratorios para este cliente"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Equipo <span className="text-red-500">*</span>
            </Label>
            <SearchableCombobox
              key={laboratorioId || "no-lab"}
              preloadedOptions={equiposOptions}
              value={equipoId}
              onValueChange={setEquipoId}
              placeholder={
                !laboratorioId
                  ? "Primero seleccioná un laboratorio"
                  : equiposOptions.length === 0
                  ? "Laboratorio sin equipos"
                  : "Seleccionar equipo"
              }
              disabled={!laboratorioId || equiposOptions.length === 0}
              emptyMessage="No hay equipos en este laboratorio"
            />
          </div>

          {/* Tipo + Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prioridad</Label>
              <Select value={prioridad} onValueChange={setPrioridad}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDAD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Fecha programada <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-full h-9 px-3 rounded-md border text-sm font-normal flex items-center gap-2 transition-colors",
                      fechaProgramada
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hora" className="text-xs">
                Hora
              </Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Técnico */}
          <div className="space-y-1.5">
            <Label className="text-xs">Técnico asignado</Label>
            <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-900 text-sm">
              <QuickEditableCombobox
                value={tecnicoNombre}
                options={tecnicosList}
                placeholder="No se encontraron técnicos"
                searchPlaceholder="Buscar técnico..."
                emptyLabel="Sin asignar"
                triggerClassName="font-normal"
                onChange={async (v) => {
                  setTecnicoNombre(v);
                  if (
                    v.trim() &&
                    !tecnicosList.some(
                      (t) => t.toLowerCase() === v.trim().toLowerCase()
                    )
                  ) {
                    try {
                      const res = await fetch("/api/servicio-tecnicos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ nombre: v.trim() }),
                      });
                      if (res.ok) {
                        toast.success(`Técnico "${v.trim()}" agregado`);
                        mutateTecnicos();
                      }
                    } catch {}
                  }
                }}
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs">
              Descripción
            </Label>
            <Textarea
              id="desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Qué se va a hacer en el mantenimiento..."
              rows={2}
            />
          </div>

          {/* Observaciones previas */}
          <div className="space-y-1.5">
            <Label htmlFor="obs" className="text-xs">
              Observaciones previas
            </Label>
            <Textarea
              id="obs"
              value={observacionesPrevias}
              onChange={(e) => setObservacionesPrevias(e.target.value)}
              placeholder="Estado del equipo, fallas reportadas, contexto..."
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
            disabled={submitting || !equipoId || !fechaProgramada}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                Crear mantenimiento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
