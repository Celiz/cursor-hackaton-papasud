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
import { searchEquiposUnidades } from "@/hooks/use-equipo-search";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { EquipoContrato, Cliente } from "@/lib/types";
import useSWR from "swr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { dialogClasses, formClasses } from "@/lib/design-system";

interface ContratoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato?: EquipoContrato | null;
  onSuccess: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ContratoFormDialog({
  open,
  onOpenChange,
  contrato,
  onSuccess,
}: ContratoFormDialogProps) {
  // Note: We removed the full data fetches for clientes and equipos
  // The SearchableCombobox components handle search asynchronously

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    equipo_unidad_id: "",
    cliente_id: "",
    tipo: "comodato",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
    duracion_meses: "",
    renovacion_automatica: false,
    costo_mensual: "",
    costo_total: "",
    estado: "borrador",
    condiciones_especiales: "",
    requiere_mantenimiento_incluido: false,
  });

  useEffect(() => {
    if (contrato) {
      setFormData({
        equipo_unidad_id: contrato.equipo_unidad_id || "",
        cliente_id: contrato.cliente_id || "",
        tipo: contrato.tipo || "comodato",
        fecha_inicio: contrato.fecha_inicio?.split("T")[0] || new Date().toISOString().split("T")[0],
        fecha_fin: contrato.fecha_fin?.split("T")[0] || "",
        duracion_meses: contrato.duracion_meses?.toString() || "",
        renovacion_automatica: contrato.renovacion_automatica || false,
        costo_mensual: contrato.costo_mensual?.toString() || "",
        costo_total: contrato.costo_total?.toString() || "",
        estado: contrato.estado || "borrador",
        condiciones_especiales: contrato.condiciones_especiales || "",
        requiere_mantenimiento_incluido: contrato.requiere_mantenimiento_incluido || false,
      });
    } else {
      setFormData({
        equipo_unidad_id: "",
        cliente_id: "",
        tipo: "comodato",
        fecha_inicio: new Date().toISOString().split("T")[0],
        fecha_fin: "",
        duracion_meses: "",
        renovacion_automatica: false,
        costo_mensual: "",
        costo_total: "",
        estado: "borrador",
        condiciones_especiales: "",
        requiere_mantenimiento_incluido: false,
      });
    }
  }, [contrato, open]);

  // Calculate fecha_fin based on duracion_meses
  useEffect(() => {
    if (formData.duracion_meses && formData.fecha_inicio) {
      const inicio = new Date(formData.fecha_inicio);
      const meses = parseInt(formData.duracion_meses);
      if (!isNaN(meses) && meses > 0) {
        const fin = new Date(inicio);
        fin.setMonth(fin.getMonth() + meses);
        setFormData(prev => ({ ...prev, fecha_fin: fin.toISOString().split("T")[0] }));
      }
    }
  }, [formData.duracion_meses, formData.fecha_inicio]);

  // Calculate costo_total based on costo_mensual and duracion_meses
  useEffect(() => {
    if (formData.costo_mensual && formData.duracion_meses) {
      const costoMensual = parseFloat(formData.costo_mensual);
      const meses = parseInt(formData.duracion_meses);
      if (!isNaN(costoMensual) && !isNaN(meses)) {
        setFormData(prev => ({ ...prev, costo_total: (costoMensual * meses).toString() }));
      }
    }
  }, [formData.costo_mensual, formData.duracion_meses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        costo_mensual: parseFloat(formData.costo_mensual) || 0,
        costo_total: parseFloat(formData.costo_total) || 0,
        duracion_meses: formData.duracion_meses ? parseInt(formData.duracion_meses) : null,
        fecha_fin: formData.fecha_fin || null,
      };

      const method = contrato ? "PUT" : "POST";
      const url = "/api/equipos-contratos";
      const body = contrato ? { ...payload, id: contrato.id } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar contrato");
      }

      toast.success(contrato ? "Contrato actualizado" : "Contrato creado exitosamente");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar contrato");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border-purple-200/40 dark:border-purple-700/40 shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-purple-200/30 dark:border-purple-700/30">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
              <span className="text-white text-sm font-bold">{contrato ? "✎" : "+"}</span>
            </div>
            {contrato ? "Editar Contrato" : "Nuevo Contrato"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {contrato
              ? "Modifica los datos del contrato"
              : "Crea un nuevo contrato de comodato, alquiler o préstamo"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Equipo y Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="equipo_unidad_id" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Equipo <span className="text-purple-600">*</span>
              </Label>
              <SearchableCombobox
                value={formData.equipo_unidad_id}
                onValueChange={(value) => setFormData({ ...formData, equipo_unidad_id: value })}
                searchFn={searchEquiposUnidades}
                placeholder="Buscar equipo"
                emptyMessage="No se encontraron equipos disponibles"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente_id" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Cliente <span className="text-purple-600">*</span>
              </Label>
              <SearchableCombobox
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                searchFn={searchClientes}
                placeholder="Buscar cliente"
                emptyMessage="No se encontraron clientes"
              />
            </div>
          </div>

          {/* Tipo y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="tipo" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tipo de Contrato <span className="text-purple-600">*</span>
              </Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                required
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
              <Label htmlFor="estado" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value })}
              >
                <SelectTrigger className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
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
                <Label htmlFor="fecha_inicio" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha Inicio <span className="text-purple-600">*</span>
                </Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  required
                  className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracion_meses" className="text-sm font-medium text-gray-700 dark:text-gray-300">Duración (meses)</Label>
                <Input
                  id="duracion_meses"
                  type="number"
                  min="1"
                  value={formData.duracion_meses}
                  onChange={(e) => setFormData({ ...formData, duracion_meses: e.target.value })}
                  placeholder="Ej: 12"
                  className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_fin" className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Fin</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>
            </div>
          </div>

          {/* Costos */}
          <div className="rounded-lg border border-green-200/40 dark:border-green-700/40 bg-green-50/30 dark:bg-green-950/20 p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-green-600">💵</span> Costos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costo_mensual" className="text-sm font-medium text-gray-700 dark:text-gray-300">Costo Mensual ($)</Label>
                <Input
                  id="costo_mensual"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costo_mensual}
                  onChange={(e) => setFormData({ ...formData, costo_mensual: e.target.value })}
                  placeholder="0.00"
                  className="border-green-200/40 focus:border-green-400 focus:ring-green-400/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costo_total" className="text-sm font-medium text-gray-700 dark:text-gray-300">Costo Total ($)</Label>
                <Input
                  id="costo_total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costo_total}
                  onChange={(e) => setFormData({ ...formData, costo_total: e.target.value })}
                  placeholder="0.00"
                  className="border-green-200/40 focus:border-green-400 focus:ring-green-400/20"
                />
              </div>
            </div>
          </div>

          {/* Switches */}
          <div className="rounded-lg border border-blue-200/40 dark:border-blue-700/40 bg-blue-50/30 dark:bg-blue-950/20 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600">⚙️</span> Opciones Adicionales
            </h4>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-900/30 border border-blue-200/30 dark:border-blue-700/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors">
              <div>
                <Label htmlFor="renovacion_automatica" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                  Renovación Automática
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">El contrato se renovará automáticamente al vencer</p>
              </div>
              <Switch
                id="renovacion_automatica"
                checked={formData.renovacion_automatica}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, renovacion_automatica: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-900/30 border border-blue-200/30 dark:border-blue-700/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors">
              <div>
                <Label htmlFor="requiere_mantenimiento_incluido" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                  Mantenimiento Incluido
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Incluir servicio de mantenimiento preventivo</p>
              </div>
              <Switch
                id="requiere_mantenimiento_incluido"
                checked={formData.requiere_mantenimiento_incluido}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiere_mantenimiento_incluido: checked })
                }
              />
            </div>
          </div>

          {/* Condiciones Especiales */}
          <div className="space-y-2">
            <Label htmlFor="condiciones_especiales" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Condiciones Especiales
            </Label>
            <Textarea
              id="condiciones_especiales"
              value={formData.condiciones_especiales}
              onChange={(e) => setFormData({ ...formData, condiciones_especiales: e.target.value })}
              placeholder="Escribe aquí cualquier condición especial del contrato..."
              rows={4}
              className="border-purple-200/40 focus:border-purple-400 focus:ring-purple-400/20 resize-none"
            />
          </div>
        </form>

        <DialogFooter className="px-6 pb-6 pt-4 border-t border-purple-200/30 dark:border-purple-700/30 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-purple-200/40 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('form');
              if (form) {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
              }
            }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-[0_2px_8px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_12px_rgba(139,92,246,0.4)] transition-all"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {contrato ? "Guardar Cambios" : "Crear Contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
