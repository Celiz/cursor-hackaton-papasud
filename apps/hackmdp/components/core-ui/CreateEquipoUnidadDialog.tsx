"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { searchEquipos } from "@/hooks/use-equipo-search";
import { searchClientes } from "@/hooks/use-client-search";
import { searchLaboratorios } from "@/hooks/use-laboratorio-search";
import { EquipoUnidad } from "@/lib/types";
import { Loader2, Building2, FlaskConical, Monitor, Info } from "lucide-react";

interface CreateEquipoUnidadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<EquipoUnidad>) => Promise<void>;
  defaultClienteId?: string;
  defaultLaboratorioId?: string;
}

export function CreateEquipoUnidadDialog({
  open,
  onOpenChange,
  onSave,
  defaultClienteId,
  defaultLaboratorioId
}: CreateEquipoUnidadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    equipo_id: "",
    numero_serie: "",
    cliente_id: defaultClienteId || "",
    laboratorio_id: defaultLaboratorioId || "",
    fecha_compra: "",
    estado_general: "stock",
    notas: "",
  });

  // Cuando cambia el cliente, resetear el laboratorio
  const handleClienteChange = (clienteId: string) => {
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      laboratorio_id: "", // Resetear laboratorio al cambiar cliente
    }));
  };

  // Función de búsqueda de laboratorios filtrada por cliente
  const searchLaboratoriosFiltered = useCallback(
    (query: string) => {
      return searchLaboratorios(query, formData.cliente_id || undefined);
    },
    [formData.cliente_id]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipo_id) {
      return;
    }

    setLoading(true);
    try {
      await onSave({
        equipo_id: formData.equipo_id,
        numero_serie: formData.numero_serie || undefined,
        cliente_id: formData.cliente_id || undefined,
        laboratorio_id: formData.laboratorio_id || undefined,
        fecha_compra: formData.fecha_compra || undefined,
        estado_general: formData.estado_general,
        notas: formData.notas || undefined,
      });
      // Reset form
      setFormData({
        equipo_id: "",
        numero_serie: "",
        cliente_id: defaultClienteId || "",
        laboratorio_id: defaultLaboratorioId || "",
        fecha_compra: "",
        estado_general: "stock",
        notas: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating equipo unidad:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Crear Nueva Unidad de Equipo
            </DialogTitle>
            <DialogDescription>
              Registra una nueva unidad física de equipo en el inventario.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Equipo del catálogo */}
            <div className="grid gap-2">
              <Label htmlFor="equipo_id" className="flex items-center gap-1">
                Equipo del Catálogo <span className="text-red-500">*</span>
              </Label>
              <SearchableCombobox
                value={formData.equipo_id}
                onValueChange={(value) => setFormData({ ...formData, equipo_id: value })}
                searchFn={searchEquipos}
                placeholder="Buscar por marca, modelo o tipo..."
                emptyMessage="No se encontraron equipos"
              />
              <p className="text-xs text-muted-foreground">
                Selecciona el modelo de equipo del catálogo
              </p>
            </div>

            {/* Número de Serie */}
            <div className="grid gap-2">
              <Label htmlFor="numero_serie">Número de Serie</Label>
              <Input
                id="numero_serie"
                value={formData.numero_serie}
                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                placeholder="Ej: SN-2024-001234"
                className="font-mono"
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Asignación (opcional)
              </h4>

              <div className="grid gap-4">
                {/* Cliente / Razón Social */}
                <div className="grid gap-2">
                  <Label htmlFor="cliente_id">Cliente / Razón Social</Label>
                  <SearchableCombobox
                    value={formData.cliente_id}
                    onValueChange={handleClienteChange}
                    searchFn={searchClientes}
                    placeholder="Buscar cliente..."
                    emptyMessage="No se encontraron clientes"
                  />
                  <p className="text-xs text-muted-foreground">
                    La razón social a la que pertenece el equipo (para facturación)
                  </p>
                </div>

                {/* Laboratorio */}
                <div className="grid gap-2">
                  <Label htmlFor="laboratorio_id" className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-purple-600" />
                    Laboratorio / Ubicación Física
                  </Label>
                  <SearchableCombobox
                    key={formData.cliente_id} // Re-render cuando cambia el cliente
                    value={formData.laboratorio_id}
                    onValueChange={(value) => setFormData({ ...formData, laboratorio_id: value })}
                    searchFn={searchLaboratoriosFiltered}
                    placeholder={formData.cliente_id ? "Buscar laboratorio del cliente..." : "Buscar laboratorio..."}
                    emptyMessage={formData.cliente_id ? "Este cliente no tiene laboratorios registrados" : "No se encontraron laboratorios"}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.cliente_id
                      ? "Laboratorios asociados al cliente seleccionado"
                      : "Ubicación física donde estará instalado el equipo"
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-600" />
                Información Adicional
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Fecha de Compra */}
                <div className="grid gap-2">
                  <Label htmlFor="fecha_compra">Fecha de Compra</Label>
                  <Input
                    id="fecha_compra"
                    type="date"
                    value={formData.fecha_compra}
                    onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                  />
                </div>

                {/* Estado */}
                <div className="grid gap-2">
                  <Label htmlFor="estado_general">Estado</Label>
                  <Select
                    value={formData.estado_general}
                    onValueChange={(value) => setFormData({ ...formData, estado_general: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">En Stock</SelectItem>
                      <SelectItem value="activo">Activo (Instalado)</SelectItem>
                      <SelectItem value="en_reparacion">En Reparación</SelectItem>
                      <SelectItem value="retirado">Retirado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notas */}
              <div className="grid gap-2 mt-4">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Observaciones adicionales sobre esta unidad..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.equipo_id}
              iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              Crear Unidad
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
