"use client";

import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  MapPin,
  Edit2,
  Check,
  X,
  Plus,
  ArrowRightLeft,
  Loader2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuickAddEquipoDialog } from "@/components/core-ui/QuickAddEquipoDialog";

// ============================================================================
// Types
// ============================================================================

interface Lab {
  id: string;
  nombre: string;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  telefono?: string[] | null;
  email?: string[] | null;
}

interface EquipoUnidad {
  id: string;
  codigo?: string | null;
  numero_serie?: string | null;
  laboratorio_id?: string | null;
  equipos?: {
    marca?: string;
    modelo?: string;
    tipo?: string;
  } | null;
}

interface LaboratorioSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laboratorioId: string | null;
  /** Cliente que abrió el sheet — usado para listar otros labs del mismo cliente al mover equipos */
  clienteId?: string | null;
  /** Callback que se llama cuando se hizo cualquier cambio (rename, mover equipo, crear lab) */
  onChange?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function LaboratorioSheet({
  open,
  onOpenChange,
  laboratorioId,
  clienteId,
  onChange,
}: LaboratorioSheetProps) {
  const [lab, setLab] = useState<Lab | null>(null);
  const [equipos, setEquipos] = useState<EquipoUnidad[]>([]);
  const [otrosLabs, setOtrosLabs] = useState<Lab[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Inline edit name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Move equipo state
  const [movingEquipoId, setMovingEquipoId] = useState<string | null>(null);

  // Agregar equipo a este lab
  const [addEquipoOpen, setAddEquipoOpen] = useState(false);

  // Create new lab
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabName, setNewLabName] = useState("");
  const [newLabAddr, setNewLabAddr] = useState("");
  const [newLabLoc, setNewLabLoc] = useState("");
  const [creatingLab, setCreatingLab] = useState(false);

  // ----------------------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------------------

  const loadLab = useCallback(async () => {
    if (!laboratorioId) return;
    setIsLoading(true);
    try {
      const [labRes, equiposRes, otrosLabsRes] = await Promise.all([
        fetch(`/api/laboratorios?completos=true`),
        fetch(`/api/equipos-unidades?laboratorio_id=${laboratorioId}`),
        clienteId
          ? fetch(`/api/laboratorios?razon_social_id=${clienteId}&completos=true`)
          : Promise.resolve(null),
      ]);

      const allLabs: Lab[] = labRes.ok ? await labRes.json() : [];
      const labData = allLabs.find((l) => l.id === laboratorioId) || null;
      setLab(labData);
      setNameValue(labData?.nombre || "");

      const eqData: EquipoUnidad[] = equiposRes.ok ? await equiposRes.json() : [];
      setEquipos(Array.isArray(eqData) ? eqData : []);

      if (otrosLabsRes && otrosLabsRes.ok) {
        const otros: Lab[] = await otrosLabsRes.json();
        setOtrosLabs(otros.filter((l) => l.id !== laboratorioId));
      }
    } catch (e) {
      console.error("Error cargando lab:", e);
      toast.error("Error al cargar el laboratorio");
    } finally {
      setIsLoading(false);
    }
  }, [laboratorioId, clienteId]);

  useEffect(() => {
    if (open && laboratorioId) {
      loadLab();
      setEditingName(false);
      setShowCreateForm(false);
      setNewLabName("");
      setNewLabAddr("");
      setNewLabLoc("");
    }
  }, [open, laboratorioId, loadLab]);

  // ----------------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------------

  const saveLabName = async () => {
    if (!lab || !nameValue.trim() || nameValue === lab.nombre) {
      setEditingName(false);
      return;
    }
    try {
      const res = await fetch(`/api/laboratorios`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lab.id, nombre: nameValue.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setLab({ ...lab, nombre: nameValue.trim() });
      setEditingName(false);
      toast.success("Nombre actualizado");
      onChange?.();
    } catch (e) {
      toast.error("Error al actualizar el nombre");
    }
  };

  const moveEquipo = async (equipoId: string, targetLabId: string) => {
    setMovingEquipoId(equipoId);
    try {
      const res = await fetch(`/api/equipos-unidades/${equipoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laboratorio_id: targetLabId }),
      });
      if (!res.ok) throw new Error("Failed");
      // Optimistic remove from current list
      setEquipos((prev) => prev.filter((e) => e.id !== equipoId));
      const targetLab = otrosLabs.find((l) => l.id === targetLabId);
      toast.success(`Equipo movido a "${targetLab?.nombre || "otro lab"}"`);
      onChange?.();
    } catch (e) {
      toast.error("Error al mover el equipo");
    } finally {
      setMovingEquipoId(null);
    }
  };

  const removeEquipoFromLab = async (equipoId: string) => {
    if (!confirm("¿Quitar este equipo del laboratorio? El equipo no se borra, solo se desasocia.")) return;
    setMovingEquipoId(equipoId);
    try {
      const res = await fetch(`/api/equipos-unidades/${equipoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laboratorio_id: null }),
      });
      if (!res.ok) throw new Error("Failed");
      setEquipos((prev) => prev.filter((e) => e.id !== equipoId));
      toast.success("Equipo desasociado del laboratorio");
      onChange?.();
    } catch (e) {
      toast.error("Error al desasociar el equipo");
    } finally {
      setMovingEquipoId(null);
    }
  };

  const createNewLab = async () => {
    if (!newLabName.trim() || !clienteId) return;
    setCreatingLab(true);
    try {
      // Crear el lab
      const labRes = await fetch(`/api/laboratorios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newLabName.trim(),
          direccion: newLabAddr.trim() || null,
          localidad: newLabLoc.trim() || null,
          razon_social_id: clienteId,
          activo: true,
        }),
      });
      if (!labRes.ok) throw new Error("Failed creating lab");
      const newLab = await labRes.json();

      // Crear el link M:N
      const linkRes = await fetch(`/api/laboratorio-razones-sociales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          laboratorio_id: newLab.id,
          cliente_id: clienteId,
          es_principal: false,
          activo: true,
        }),
      });
      // Si el endpoint M:N no existe, no es bloqueante porque razon_social_id legacy ya está set
      if (!linkRes.ok && linkRes.status !== 404) {
        console.warn("M:N link no creado, fallback a razon_social_id legacy");
      }

      toast.success(`Laboratorio "${newLab.nombre}" creado`);
      setShowCreateForm(false);
      setNewLabName("");
      setNewLabAddr("");
      setNewLabLoc("");
      onChange?.();
      // Refrescar la lista de otros labs para que el usuario pueda mover equipos
      await loadLab();
    } catch (e) {
      console.error(e);
      toast.error("Error al crear el laboratorio");
    } finally {
      setCreatingLab(false);
    }
  };

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[640px] md:max-w-[720px] p-0 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b bg-purple-50/50 dark:bg-purple-950/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg shrink-0">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveLabName();
                      if (e.key === "Escape") { setEditingName(false); setNameValue(lab?.nombre || ""); }
                    }}
                    className="h-7 text-sm font-semibold"
                  />
                  <Button size="tiny" type="primary" onClick={saveLabName} className="h-7 w-7 p-0">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="tiny"
                    type="default"
                    variant="outline"
                    onClick={() => { setEditingName(false); setNameValue(lab?.nombre || ""); }}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <SheetTitle className="text-base font-semibold truncate">
                    {lab?.nombre || "Cargando..."}
                  </SheetTitle>
                  {lab && (
                    <Button
                      size="tiny"
                      type="default"
                      variant="ghost"
                      onClick={() => setEditingName(true)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
              <SheetDescription className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {[lab?.direccion, lab?.localidad].filter(Boolean).join(", ") || "Sin dirección"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden"><div className="px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Equipos */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Equipos ({equipos.length})
                  </h3>
                  {clienteId && (
                    <Button
                      size="tiny"
                      type="default"
                      variant="ghost"
                      onClick={() => setAddEquipoOpen(true)}
                      className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar equipo
                    </Button>
                  )}
                </div>
                {equipos.length === 0 ? (
                  <div className="text-xs text-neutral-400 italic py-4 text-center border border-dashed rounded-md">
                    Sin equipos en este lab
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {equipos.map((eq) => {
                      const marca = eq.equipos?.marca || "Sin marca";
                      const modelo = eq.equipos?.modelo || "";
                      const tipo = eq.equipos?.tipo;
                      return (
                        <li
                          key={eq.id}
                          className="flex items-center gap-2 p-2 rounded-md border bg-white dark:bg-neutral-900 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {marca} {modelo}
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate">
                              {eq.numero_serie ? `S/N: ${eq.numero_serie}` : ""}
                              {eq.codigo ? ` · ${eq.codigo}` : ""}
                              {tipo ? ` · ${tipo}` : ""}
                            </div>
                          </div>
                          {/* Move dropdown — simple implementation: button shows mini list */}
                          {otrosLabs.length > 0 && (
                            <MoveEquipoButton
                              equipoId={eq.id}
                              targetLabs={otrosLabs}
                              isMoving={movingEquipoId === eq.id}
                              onMove={moveEquipo}
                            />
                          )}
                          <Button
                            size="tiny"
                            type="default"
                            variant="ghost"
                            onClick={() => removeEquipoFromLab(eq.id)}
                            disabled={movingEquipoId === eq.id}
                            className="h-7 w-7 p-0 text-neutral-400 hover:text-red-600"
                            title="Quitar del lab"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Otros labs del cliente */}
              {otrosLabs.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                    Otras sedes del cliente ({otrosLabs.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {otrosLabs.map((other) => (
                      <li
                        key={other.id}
                        className="text-xs px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800"
                      >
                        <div className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
                          {other.nombre}
                        </div>
                        <div className="text-neutral-400 truncate">
                          {[other.direccion, other.localidad].filter(Boolean).join(", ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Crear nuevo lab */}
              {clienteId && (
                <section>
                  {!showCreateForm ? (
                    <Button
                      type="default"
                      variant="outline"
                      onClick={() => setShowCreateForm(true)}
                      className="w-full justify-center gap-2 h-9 text-sm border-dashed"
                    >
                      <Plus className="w-4 h-4" />
                      Crear nueva sede para este cliente
                    </Button>
                  ) : (
                    <div className="space-y-2 p-3 border border-purple-200 dark:border-purple-900 rounded-md bg-purple-50/30 dark:bg-purple-950/10">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                        Nueva sede
                      </h3>
                      <Input
                        placeholder="Nombre del laboratorio"
                        value={newLabName}
                        onChange={(e) => setNewLabName(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Dirección"
                        value={newLabAddr}
                        onChange={(e) => setNewLabAddr(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Localidad"
                        value={newLabLoc}
                        onChange={(e) => setNewLabLoc(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="tiny"
                          type="primary"
                          onClick={createNewLab}
                          disabled={!newLabName.trim() || creatingLab}
                          className="flex-1"
                        >
                          {creatingLab ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Crear"}
                        </Button>
                        <Button
                          size="tiny"
                          type="default"
                          variant="outline"
                          onClick={() => setShowCreateForm(false)}
                          disabled={creatingLab}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
          </div>
        </ScrollArea>
      </SheetContent>

      {clienteId && laboratorioId && (
        <QuickAddEquipoDialog
          open={addEquipoOpen}
          onOpenChange={setAddEquipoOpen}
          clienteId={clienteId}
          laboratorioId={laboratorioId}
          onSuccess={() => {
            setAddEquipoOpen(false);
            loadLab();
            onChange?.();
          }}
        />
      )}
    </Sheet>
  );
}

// ============================================================================
// Move Equipo Button (sub-component with mini popover)
// ============================================================================

function MoveEquipoButton({
  equipoId,
  targetLabs,
  isMoving,
  onMove,
}: {
  equipoId: string;
  targetLabs: Lab[];
  isMoving: boolean;
  onMove: (equipoId: string, targetLabId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        size="tiny"
        type="default"
        variant="ghost"
        onClick={() => setOpen(!open)}
        disabled={isMoving}
        className="h-7 w-7 p-0 text-neutral-400 hover:text-purple-600"
        title="Mover a otro lab"
      >
        {isMoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-white dark:bg-neutral-900 border rounded-md shadow-lg py-1">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">
              Mover a:
            </div>
            {targetLabs.map((lab) => (
              <button
                key={lab.id}
                onClick={() => {
                  onMove(equipoId, lab.id);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 dark:hover:bg-purple-950/30 truncate"
              >
                {lab.nombre}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
