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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { searchEquiposUnidades } from "@/hooks/use-equipo-search";
import { searchClientes } from "@/hooks/use-client-search";
import { Loader2 } from "lucide-react";
import { EquipoMovimiento } from "@/lib/types";
import { toast } from "sonner";

interface MovimientoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimiento?: EquipoMovimiento | null;
  onSuccess: () => void;
}

const tipoOptions = [
  { value: "ingreso", label: "Ingreso" },
  { value: "egreso", label: "Egreso" },
  { value: "devolucion", label: "Devolución" },
  { value: "instalacion", label: "Instalación" },
  { value: "desinstalacion", label: "Desinstalación" },
  { value: "traslado", label: "Traslado" },
  { value: "envio_taller", label: "Envío a Taller" },
  { value: "retorno_taller", label: "Retorno de Taller" },
  { value: "baja", label: "Baja" },
];

export function MovimientoFormDialog({
  open,
  onOpenChange,
  movimiento,
  onSuccess,
}: MovimientoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    equipo_unidad_id: "",
    tipo: "egreso",
    origen_tipo: "",
    origen_descripcion: "",
    destino_tipo: "",
    destino_descripcion: "",
    cliente_id: "",
    fecha_movimiento: new Date().toISOString().slice(0, 16),
    fecha_programada: "",
    responsable_movimiento: "",
    transportista: "",
    numero_seguimiento: "",
    condicion_previa: "",
    condicion_posterior: "",
    observaciones: "",
  });

  useEffect(() => {
    if (movimiento) {
      setFormData({
        equipo_unidad_id: movimiento.equipo_unidad_id || "",
        tipo: movimiento.tipo || "egreso",
        origen_tipo: movimiento.origen_tipo || "",
        origen_descripcion: movimiento.origen_descripcion || "",
        destino_tipo: movimiento.destino_tipo || "",
        destino_descripcion: movimiento.destino_descripcion || "",
        cliente_id: movimiento.cliente_id || "",
        fecha_movimiento: movimiento.fecha_movimiento?.slice(0, 16) || new Date().toISOString().slice(0, 16),
        fecha_programada: movimiento.fecha_programada?.slice(0, 10) || "",
        responsable_movimiento: movimiento.responsable_movimiento || "",
        transportista: movimiento.transportista || "",
        numero_seguimiento: movimiento.numero_seguimiento || "",
        condicion_previa: movimiento.condicion_previa || "",
        condicion_posterior: movimiento.condicion_posterior || "",
        observaciones: movimiento.observaciones || "",
      });
    } else {
      setFormData({
        equipo_unidad_id: "",
        tipo: "egreso",
        origen_tipo: "",
        origen_descripcion: "",
        destino_tipo: "",
        destino_descripcion: "",
        cliente_id: "",
        fecha_movimiento: new Date().toISOString().slice(0, 16),
        fecha_programada: "",
        responsable_movimiento: "",
        transportista: "",
        numero_seguimiento: "",
        condicion_previa: "",
        condicion_posterior: "",
        observaciones: "",
      });
    }
  }, [movimiento, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        cliente_id: formData.cliente_id || null,
        fecha_programada: formData.fecha_programada || null,
      };

      const method = movimiento ? "PUT" : "POST";
      const url = "/api/equipos-movimientos";
      const body = movimiento ? { ...payload, id: movimiento.id } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar movimiento");
      }

      toast.success(movimiento ? "Movimiento actualizado" : "Movimiento registrado exitosamente");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar movimiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {movimiento ? "Editar Movimiento" : "Registrar Movimiento de Equipo"}
          </DialogTitle>
          <DialogDescription>
            {movimiento
              ? "Modifica los datos del movimiento"
              : "Registra un ingreso, egreso, traslado o instalación de equipo"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección 1: Información Básica */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold">Información del Movimiento</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equipo_unidad_id">Equipo *</Label>
                <SearchableCombobox
                  value={formData.equipo_unidad_id}
                  onValueChange={(value) => setFormData({ ...formData, equipo_unidad_id: value })}
                  searchFn={searchEquiposUnidades}
                  placeholder="Buscar equipo"
                  emptyMessage="No se encontraron equipos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Movimiento *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_movimiento">Fecha del Movimiento *</Label>
                <Input
                  id="fecha_movimiento"
                  type="datetime-local"
                  value={formData.fecha_movimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_movimiento: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_programada">Fecha Programada (opcional)</Label>
                <Input
                  id="fecha_programada"
                  type="date"
                  value={formData.fecha_programada}
                  onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente (opcional)</Label>
              <SearchableCombobox
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                searchFn={searchClientes}
                placeholder="Buscar cliente..."
                emptyMessage="No se encontraron clientes"
              />
            </div>
          </div>

          <Separator />

          {/* Sección 2: Origen y Destino */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold">Origen y Destino</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origen_tipo">Tipo de Origen</Label>
                <Select
                  value={formData.origen_tipo || "none"}
                  onValueChange={(value) => setFormData({ ...formData, origen_tipo: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="deposito">Depósito</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="taller">Taller</SelectItem>
                    <SelectItem value="proveedor">Proveedor</SelectItem>
                    <SelectItem value="laboratorio">Laboratorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destino_tipo">Tipo de Destino</Label>
                <Select
                  value={formData.destino_tipo || "none"}
                  onValueChange={(value) => setFormData({ ...formData, destino_tipo: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="deposito">Depósito</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="taller">Taller</SelectItem>
                    <SelectItem value="proveedor">Proveedor</SelectItem>
                    <SelectItem value="laboratorio">Laboratorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origen_descripcion">Descripción de Origen</Label>
                <Input
                  id="origen_descripcion"
                  value={formData.origen_descripcion}
                  onChange={(e) => setFormData({ ...formData, origen_descripcion: e.target.value })}
                  placeholder="Dirección o nombre del lugar"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destino_descripcion">Descripción de Destino</Label>
                <Input
                  id="destino_descripcion"
                  value={formData.destino_descripcion}
                  onChange={(e) => setFormData({ ...formData, destino_descripcion: e.target.value })}
                  placeholder="Dirección o nombre del lugar"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sección 3: Responsables */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold">Responsables y Transporte</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsable_movimiento">Responsable del Movimiento</Label>
                <Input
                  id="responsable_movimiento"
                  value={formData.responsable_movimiento}
                  onChange={(e) => setFormData({ ...formData, responsable_movimiento: e.target.value })}
                  placeholder="Nombre del responsable"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportista">Transportista</Label>
                <Input
                  id="transportista"
                  value={formData.transportista}
                  onChange={(e) => setFormData({ ...formData, transportista: e.target.value })}
                  placeholder="Empresa de transporte"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_seguimiento">Número de Seguimiento</Label>
              <Input
                id="numero_seguimiento"
                value={formData.numero_seguimiento}
                onChange={(e) => setFormData({ ...formData, numero_seguimiento: e.target.value })}
                placeholder="Tracking o número de guía"
              />
            </div>
          </div>

          <Separator />

          {/* Sección 4: Condiciones y Observaciones */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Condición del Equipo</h3>

            <div className="space-y-2">
              <Label htmlFor="condicion_previa">Condición Previa</Label>
              <Textarea
                id="condicion_previa"
                value={formData.condicion_previa}
                onChange={(e) => setFormData({ ...formData, condicion_previa: e.target.value })}
                placeholder="Estado del equipo antes del movimiento..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condicion_posterior">Condición Posterior</Label>
              <Textarea
                id="condicion_posterior"
                value={formData.condicion_posterior}
                onChange={(e) => setFormData({ ...formData, condicion_posterior: e.target.value })}
                placeholder="Estado del equipo después del movimiento..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales sobre el movimiento..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {movimiento ? "Guardar Cambios" : "Registrar Movimiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
