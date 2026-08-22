"use client";

import React, { useState, useMemo } from "react";
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
import { searchEquiposUnidades } from "@/hooks/use-equipo-search";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface BatchComodatosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface EquipoItem {
  id: string;
  equipo_unidad_id: string;
  label: string;
}

export function BatchComodatosDialog({
  open,
  onOpenChange,
  onSuccess,
}: BatchComodatosDialogProps) {
  const [loading, setLoading] = useState(false);
  const [equipos, setEquipos] = useState<EquipoItem[]>([]);
  const [currentEquipoId, setCurrentEquipoId] = useState("");
  const [currentEquipoLabel, setCurrentEquipoLabel] = useState("");

  const [formData, setFormData] = useState({
    cliente_id: "",
    tipo: "comodato",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
    duracion_meses: "",
    renovacion_automatica: false,
    costo_mensual: "",
    estado: "activo",
    condiciones_especiales: "",
    requiere_mantenimiento_incluido: false,
  });

  // Calculate fecha_fin based on duracion_meses
  const fecha_fin_calculada = useMemo(() => {
    if (formData.duracion_meses && formData.fecha_inicio) {
      const inicio = new Date(formData.fecha_inicio);
      const meses = parseInt(formData.duracion_meses);
      if (!isNaN(meses) && meses > 0) {
        const fin = new Date(inicio);
        fin.setMonth(fin.getMonth() + meses);
        return fin.toISOString().split("T")[0];
      }
    }
    return formData.fecha_fin;
  }, [formData.duracion_meses, formData.fecha_inicio, formData.fecha_fin]);

  const handleAddEquipo = async () => {
    if (!currentEquipoId) return;

    // Check if already added
    if (equipos.some((e) => e.equipo_unidad_id === currentEquipoId)) {
      toast.error("Este equipo ya fue agregado");
      return;
    }

    // Get equipo label from search
    const results = await searchEquiposUnidades(currentEquipoId);
    const found = results.find((r) => r.value === currentEquipoId);

    setEquipos([
      ...equipos,
      {
        id: crypto.randomUUID(),
        equipo_unidad_id: currentEquipoId,
        label: found?.label || currentEquipoId,
      },
    ]);
    setCurrentEquipoId("");
    setCurrentEquipoLabel("");
  };

  const handleRemoveEquipo = (id: string) => {
    setEquipos(equipos.filter((e) => e.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id) {
      toast.error("Debe seleccionar un cliente");
      return;
    }

    if (equipos.length === 0) {
      toast.error("Debe agregar al menos un equipo");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        cliente_id: formData.cliente_id,
        tipo: formData.tipo,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: fecha_fin_calculada || null,
        duracion_meses: formData.duracion_meses
          ? parseInt(formData.duracion_meses)
          : null,
        renovacion_automatica: formData.renovacion_automatica,
        costo_mensual: formData.costo_mensual
          ? parseFloat(formData.costo_mensual)
          : 0,
        estado: formData.estado,
        condiciones_especiales: formData.condiciones_especiales,
        requiere_mantenimiento_incluido: formData.requiere_mantenimiento_incluido,
        equipos: equipos.map((e) => e.equipo_unidad_id),
      };

      const res = await fetch("/api/equipos-contratos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear contratos");
      }

      toast.success(`${equipos.length} contratos creados exitosamente`);
      onSuccess();
      onOpenChange(false);

      // Reset form
      setEquipos([]);
      setFormData({
        cliente_id: "",
        tipo: "comodato",
        fecha_inicio: new Date().toISOString().split("T")[0],
        fecha_fin: "",
        duracion_meses: "",
        renovacion_automatica: false,
        costo_mensual: "",
        estado: "activo",
        condiciones_especiales: "",
        requiere_mantenimiento_incluido: false,
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear contratos");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-purple-200/40 dark:border-purple-700/40 shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-purple-200/30 dark:border-purple-700/30">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
              <Package className="h-4 w-4 text-white" />
            </div>
            Comodatos en Lote
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crea múltiples contratos de comodato para un mismo cliente
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
        >
          {/* Cliente - común para todos */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Cliente <span className="text-purple-600">*</span>
            </Label>
            <SearchableCombobox
              value={formData.cliente_id}
              onValueChange={(value) =>
                setFormData({ ...formData, cliente_id: value })
              }
              searchFn={searchClientes}
              placeholder="Buscar cliente..."
              emptyMessage="No se encontraron clientes"
            />
          </div>

          {/* Equipos a agregar */}
          <div className="rounded-lg border border-purple-200/40 dark:border-purple-700/40 bg-purple-50/30 dark:bg-purple-950/20 p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-purple-600">📦</span> Equipos a Incluir
              <Badge variant="secondary" className="ml-auto">
                {equipos.length} equipo{equipos.length !== 1 ? "s" : ""}
              </Badge>
            </h4>

            {/* Add equipo row */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <SearchableCombobox
                  value={currentEquipoId}
                  onValueChange={(value) => {
                    setCurrentEquipoId(value);
                  }}
                  searchFn={searchEquiposUnidades}
                  placeholder="Buscar equipo disponible..."
                  emptyMessage="No se encontraron equipos disponibles"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddEquipo}
                disabled={!currentEquipoId}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {/* Lista de equipos agregados */}
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {equipos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay equipos agregados. Busca y agrega equipos arriba.
                  </p>
                ) : (
                  equipos.map((equipo) => (
                    <div
                      key={equipo.id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-md border border-purple-200/30 dark:border-purple-700/30"
                    >
                      <span className="text-sm font-medium">{equipo.label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEquipo(equipo.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Tipo y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tipo de Contrato <span className="text-purple-600">*</span>
              </Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo: value })
                }
              >
                <SelectTrigger className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comodato">Comodato</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="prestamo">Préstamo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Estado
              </Label>
              <Select
                value={formData.estado}
                onValueChange={(value) =>
                  setFormData({ ...formData, estado: value })
                }
              >
                <SelectTrigger className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fechas */}
          <div className="rounded-lg border border-purple-200/40 dark:border-purple-700/40 bg-purple-50/30 dark:bg-purple-950/20 p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-purple-600">📅</span> Fechas y Duración
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha Inicio <span className="text-purple-600">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_inicio: e.target.value })
                  }
                  required
                  className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duración (meses)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.duracion_meses}
                  onChange={(e) =>
                    setFormData({ ...formData, duracion_meses: e.target.value })
                  }
                  placeholder="Ej: 12"
                  className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha Fin
                </Label>
                <Input
                  type="date"
                  value={fecha_fin_calculada}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_fin: e.target.value })
                  }
                  className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>
            </div>
          </div>

          {/* Costo (aplicado a cada uno) */}
          <div className="rounded-lg border border-green-200/40 dark:border-green-700/40 bg-green-50/30 dark:bg-green-950/20 p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-green-600">💵</span> Costo por Equipo
            </h4>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Costo Mensual ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.costo_mensual}
                onChange={(e) =>
                  setFormData({ ...formData, costo_mensual: e.target.value })
                }
                placeholder="0.00"
                className="border-green-200/40 focus:border-green-400 focus:ring-green-400/20 max-w-xs"
              />
              {formData.costo_mensual && equipos.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total mensual: $
                  {(
                    parseFloat(formData.costo_mensual) * equipos.length
                  ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          {/* Opciones */}
          <div className="rounded-lg border border-blue-200/40 dark:border-blue-700/40 bg-blue-50/30 dark:bg-blue-950/20 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600">⚙️</span> Opciones
            </h4>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-900/30 border border-blue-200/30 dark:border-blue-700/30">
              <div>
                <Label className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                  Renovación Automática
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Los contratos se renovarán automáticamente al vencer
                </p>
              </div>
              <Switch
                checked={formData.renovacion_automatica}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, renovacion_automatica: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-900/30 border border-blue-200/30 dark:border-blue-700/30">
              <div>
                <Label className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                  Mantenimiento Incluido
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Incluir servicio de mantenimiento preventivo
                </p>
              </div>
              <Switch
                checked={formData.requiere_mantenimiento_incluido}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    requiere_mantenimiento_incluido: checked,
                  })
                }
              />
            </div>
          </div>

          {/* Condiciones */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Condiciones Especiales
            </Label>
            <Textarea
              value={formData.condiciones_especiales}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  condiciones_especiales: e.target.value,
                })
              }
              placeholder="Condiciones que aplican a todos los contratos..."
              rows={3}
              className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20 resize-none"
            />
          </div>
        </form>

        <DialogFooter className="px-6 pb-6 pt-4 border-t border-purple-200/30 dark:border-purple-700/30 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="border-purple-200/40 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || equipos.length === 0 || !formData.cliente_id}
            onClick={handleSubmit}
            className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-[0_2px_8px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_12px_rgba(139,92,246,0.4)] transition-all"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear {equipos.length} Contrato{equipos.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
