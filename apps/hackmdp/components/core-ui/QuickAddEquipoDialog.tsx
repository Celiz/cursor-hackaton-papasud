"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { QuickEditableCombobox } from "@/components/ui/quick-editable-combobox";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";
import useSWR from "swr";

interface QuickAddEquipoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  /** Si se provee, el equipo se linkea a este laboratorio/sede. */
  laboratorioId?: string | null;
  onSuccess: (equipoId: string, equipoNombre: string) => void;
}

interface Equipo {
  id: string;
  marca: string;
  modelo: string;
  tipo: string;
}

export function QuickAddEquipoDialog({ open, onOpenChange, clienteId, laboratorioId, onSuccess }: QuickAddEquipoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedEquipoId, setSelectedEquipoId] = useState<string>("");
  const [formData, setFormData] = useState({
    marca: "",
    modelo: "",
    tipo: "",
    numero_serie: "",
  });

  // Tipos de equipo predefinidos en la DB
  const { data: tiposData } = useSWR<Array<{ nombre: string }>>(
    open ? "/api/tipos-equipos" : null,
    (url: string) => fetch(url).then((r) => r.json())
  );
  const tiposList = (tiposData || []).map((t) => t.nombre).filter(Boolean);

  const searchEquipos = async (searchTerm: string) => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/equipos?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al buscar equipos");
      }

      const equipos: Equipo[] = await response.json();

      return equipos.map((equipo) => ({
        label: `${equipo.marca} ${equipo.modelo}`,
        value: equipo.id,
        badge: equipo.tipo || undefined,
        secondaryLabel: equipo.tipo ? `Categoría: ${equipo.tipo}` : undefined,
      }));
    } catch (error) {
      console.error("Error searching equipos:", error);
      return [];
    }
  };

  const handleSubmit = async () => {
    if (!selectedEquipoId && (!formData.marca.trim() || !formData.modelo.trim())) {
      toast.error("Selecciona un equipo existente o ingresa marca y modelo para crear uno nuevo");
      return;
    }

    setLoading(true);
    try {
      let equipoId = selectedEquipoId;

      // Si no hay equipo seleccionado, crear uno nuevo
      if (!equipoId) {
        const equipoResponse = await fetch("/api/equipos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marca: formData.marca.trim(),
            modelo: formData.modelo.trim(),
            tipo: formData.tipo.trim() || null,
          }),
        });

        if (!equipoResponse.ok) {
          const error = await equipoResponse.json();
          throw new Error(error.error || "Error al crear equipo");
        }

        const equipo = await equipoResponse.json();
        equipoId = equipo.id;
      }

      // Crear la unidad del equipo asociada al cliente
      const unidadResponse = await fetch("/api/equipos-unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: equipoId,
          cliente_id: clienteId,
          laboratorio_id: laboratorioId || null,
          numero_serie: formData.numero_serie.trim() || null,
          estado_general: "activo",
        }),
      });

      if (!unidadResponse.ok) {
        const error = await unidadResponse.json();
        console.error("Error creating unidad:", error);
        throw new Error(error.details || error.error || "Error al crear unidad de equipo");
      }

      const unidad = await unidadResponse.json();

      const equipoNombre = selectedEquipoId
        ? "Equipo"
        : `${formData.tipo ? formData.tipo + ' ' : ''}${formData.marca} ${formData.modelo}`;

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <p>
            Equipo <strong>{equipoNombre}</strong> agregado correctamente
          </p>
        </div>
      );

      onSuccess(unidad.id, equipoNombre);
      setFormData({ marca: "", modelo: "", tipo: "", numero_serie: "" });
      setSelectedEquipoId("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating equipo:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear equipo");
    } finally {
      setLoading(false);
    }
  };

  // Limpiar el formulario cuando se cierra
  useEffect(() => {
    if (!open) {
      setFormData({ marca: "", modelo: "", tipo: "", numero_serie: "" });
      setSelectedEquipoId("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Agregar Equipo al Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
          <div className="space-y-2">
            <Label>Buscar equipo existente</Label>
            <SearchableCombobox
              searchFn={searchEquipos}
              value={selectedEquipoId}
              onValueChange={(value) => {
                setSelectedEquipoId(value);
                // Limpiar formulario si se selecciona un equipo existente
                if (value) {
                  setFormData({ marca: "", modelo: "", tipo: "", numero_serie: formData.numero_serie });
                }
              }}
              placeholder="Buscar por marca, modelo o tipo..."
              emptyMessage="No se encontraron equipos"
            />
            <p className="text-xs text-muted-foreground">
              O crea un nuevo equipo completando los campos de abajo
            </p>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Crear nuevo equipo</h4>

            <div className="space-y-2">
              <Label>Categoría (opcional)</Label>
              {selectedEquipoId ? (
                <Input value={formData.tipo} placeholder="Categoría del equipo" disabled />
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                  <QuickEditableCombobox
                    value={formData.tipo}
                    options={tiposList}
                    placeholder="No se encontraron categorías"
                    searchPlaceholder="Buscar o escribir categoría..."
                    emptyLabel="Elegir categoría del equipo"
                    triggerClassName="font-normal"
                    onChange={(v) => setFormData({ ...formData, tipo: v })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca {!selectedEquipoId && "*"}</Label>
                <Input
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Marca del equipo"
                  disabled={loading || !!selectedEquipoId}
                />
              </div>

              <div className="space-y-2">
                <Label>Modelo {!selectedEquipoId && "*"}</Label>
                <Input
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="Modelo del equipo"
                  disabled={loading || !!selectedEquipoId}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <h4 className="text-sm font-medium">Detalles de esta unidad</h4>
            <div className="space-y-2">
              <Label>Número de Serie (opcional)</Label>
              <Input
                value={formData.numero_serie}
                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                placeholder="Número de serie de esta unidad"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || (!selectedEquipoId && (!formData.marca.trim() || !formData.modelo.trim()))}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Agregar equipo"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
