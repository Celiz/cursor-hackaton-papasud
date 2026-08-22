"use client";

import React, { useState, useEffect } from "react";
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
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { searchClientes } from "@/hooks/use-client-search";
import { searchEquipos } from "@/hooks/use-equipo-search";
import { Loader2, Plus, Monitor, Check } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { QuickEditableCombobox } from "@/components/ui/quick-editable-combobox";
import useSWR from "swr";

const fetcherCatRapido = (url: string) => fetch(url).then((r) => r.json());

interface CrearEquipoRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (equipoUnidadId: string, equipoInfo: {
    marca: string;
    modelo: string;
    numero_serie?: string;
    codigo: string;
  }) => void;
  preselectedClienteId?: string;
}

const TIPOS_EQUIPO = [
  'Centrifuga',
  'Microscopio',
  'Analizador',
  'Autoclave',
  'Baño María',
  'Espectrofotómetro',
  'Agitador',
  'Balanza',
  'Incubadora',
  'Refrigerador',
  'Congelador',
  'Destilador',
  'pHmetro',
  'Estufa',
  'Campana',
  'Otro',
];

export function CrearEquipoRapidoDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedClienteId,
}: CrearEquipoRapidoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"existente" | "nuevo">("existente");

  // Para equipo existente
  const [equipoId, setEquipoId] = useState("");

  // Para equipo nuevo
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [tipo, setTipo] = useState("");

  // Común
  const [numeroSerie, setNumeroSerie] = useState("");
  const [clienteId, setClienteId] = useState(preselectedClienteId || "");

  // Catalogos desde las tablas org-scoped (solo cuando el dialog esta abierto)
  const { data: marcasData, mutate: mutateMarcas } = useSWR<Array<{ nombre: string }>>(
    open ? "/api/marcas" : null,
    fetcherCatRapido,
    { dedupingInterval: 2 * 60 * 1000 }
  );
  const { data: tiposData, mutate: mutateTipos } = useSWR<Array<{ nombre: string }>>(
    open ? "/api/tipos-equipos" : null,
    fetcherCatRapido,
    { dedupingInterval: 2 * 60 * 1000 }
  );
  const marcasList = (marcasData || []).map((m) => m.nombre).filter(Boolean);
  const tiposList = (tiposData || []).map((t) => t.nombre).filter(Boolean);

  const createCatalogRapido = async (
    endpoint: string,
    mutate: () => void,
    label: string,
    nombre: string
  ) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || `No se pudo agregar ${label}`);
        return;
      }
      const created = await res.json();
      toast.success(`${label} "${created.nombre}" agregado`);
      mutate();
    } catch {
      toast.error(`Error al agregar ${label}`);
    }
  };

  useEffect(() => {
    if (preselectedClienteId) {
      setClienteId(preselectedClienteId);
    }
  }, [preselectedClienteId]);

  useEffect(() => {
    if (!open) {
      // Reset form
      setEquipoId("");
      setMarca("");
      setModelo("");
      setTipo("");
      setNumeroSerie("");
      setActiveTab("existente");
      if (!preselectedClienteId) {
        setClienteId("");
      }
    }
  }, [open, preselectedClienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalEquipoId = equipoId;
      let finalMarca = "";
      let finalModelo = "";

      // Si es equipo nuevo, primero crearlo
      if (activeTab === "nuevo") {
        if (!marca || !modelo || !tipo) {
          toast.error("Completa marca, modelo y tipo");
          setLoading(false);
          return;
        }

        const equipoRes = await fetch("/api/equipos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marca, modelo, tipo }),
        });

        if (!equipoRes.ok) {
          const err = await equipoRes.json();
          throw new Error(err.error || "Error al crear equipo");
        }

        const nuevoEquipo = await equipoRes.json();
        finalEquipoId = nuevoEquipo.id;
        finalMarca = marca;
        finalModelo = modelo;
      } else {
        // Equipo existente - obtener datos
        if (!equipoId) {
          toast.error("Selecciona un equipo");
          setLoading(false);
          return;
        }

        const equipoRes = await fetch(`/api/equipos?search=`);
        const equipos = await equipoRes.json();
        const equipo = equipos.find((e: any) => e.id === equipoId);
        if (equipo) {
          finalMarca = equipo.marca;
          finalModelo = equipo.modelo;
        }
      }

      // Crear la unidad de equipo
      const unidadRes = await fetch("/api/equipos-unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: finalEquipoId,
          numero_serie: numeroSerie || null,
          cliente_id: clienteId || null,
          estado_general: clienteId ? "activo" : "stock",
        }),
      });

      if (!unidadRes.ok) {
        const err = await unidadRes.json();
        throw new Error(err.error || "Error al crear unidad de equipo");
      }

      const nuevaUnidad = await unidadRes.json();

      toast.success("Equipo creado exitosamente");

      onSuccess(nuevaUnidad.id, {
        marca: finalMarca,
        modelo: finalModelo,
        numero_serie: numeroSerie,
        codigo: nuevaUnidad.codigo,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear equipo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-purple-600" />
            Agregar Equipo
          </DialogTitle>
          <DialogDescription>
            Selecciona un modelo existente o crea uno nuevo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "existente" | "nuevo")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existente">Modelo Existente</TabsTrigger>
              <TabsTrigger value="nuevo">Nuevo Modelo</TabsTrigger>
            </TabsList>

            <TabsContent value="existente" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Seleccionar Modelo de Equipo *</Label>
                <SearchableCombobox
                  value={equipoId}
                  onValueChange={setEquipoId}
                  searchFn={searchEquipos}
                  placeholder="Buscar por marca o modelo..."
                  emptyMessage="No se encontraron equipos"
                />
              </div>
            </TabsContent>

            <TabsContent value="nuevo" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca *</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                    <QuickEditableCombobox
                      value={marca}
                      options={marcasList}
                      placeholder="No se encontraron marcas"
                      searchPlaceholder="Buscar marca..."
                      emptyLabel="Sin marca"
                      triggerClassName="font-normal"
                      onChange={async (v) => {
                        setMarca(v);
                        if (
                          v.trim() &&
                          !marcasList.some((m) => m.toLowerCase() === v.trim().toLowerCase())
                        ) {
                          await createCatalogRapido("/api/marcas", mutateMarcas, "Marca", v.trim());
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo *</Label>
                  <Input
                    id="modelo"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ej: Megafuge 16R"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Categoría *</Label>
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                  <QuickEditableCombobox
                    value={tipo}
                    options={tiposList}
                    placeholder="No se encontraron categorías"
                    searchPlaceholder="Buscar categoría..."
                    emptyLabel="Sin categoría"
                    triggerClassName="font-normal"
                    onChange={async (v) => {
                      setTipo(v);
                      if (
                        v.trim() &&
                        !tiposList.some((t) => t.toLowerCase() === v.trim().toLowerCase())
                      ) {
                        await createCatalogRapido("/api/tipos-equipos", mutateTipos, "Categoría", v.trim());
                      }
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numero_serie">Número de Serie</Label>
              <Input
                id="numero_serie"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="Ej: SN-123456"
              />
            </div>

            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <SearchableCombobox
                value={clienteId}
                onValueChange={setClienteId}
                searchFn={searchClientes}
                placeholder="Asignar a cliente..."
                emptyMessage="No se encontraron clientes"
              />
              {clienteId && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  El equipo será asignado al cliente seleccionado
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t flex-shrink-0">
            <Button
              type="outline"
              htmlType="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Equipo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
