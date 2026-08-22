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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Servicio } from "@/lib/types";
import { toast } from "sonner";
import {
  Clock,
  Wrench,
  CheckCircle2,
  Send,
  AlertCircle,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuickStatusChangeProps {
  servicio: Servicio | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (servicioId: string, newStatus: string) => Promise<void>;
}

const ESTADOS = [
  {
    value: "Reparar",
    label: "Reparar",
    icon: AlertCircle,
    color: "bg-red-500",
    description: "El equipo necesita ser reparado",
  },
  {
    value: "En reparación",
    label: "En Reparación",
    icon: Wrench,
    color: "bg-yellow-500",
    description: "El técnico está trabajando en el equipo",
  },
  {
    value: "Presupuestado/esperando respuesta",
    label: "Presupuestado",
    icon: Clock,
    color: "bg-purple-500",
    description: "Esperando confirmación del cliente",
  },
  {
    value: "Listo/Reparado",
    label: "Listo/Reparado",
    icon: CheckCircle2,
    color: "bg-green-500",
    description: "El equipo está reparado y listo",
  },
  {
    value: "Entregar/Enviar",
    label: "Para Entregar",
    icon: Send,
    color: "bg-blue-500",
    description: "Listo para ser entregado al cliente",
  },
  {
    value: "Entregado",
    label: "Entregado",
    icon: Package,
    color: "bg-gray-500",
    description: "El equipo fue entregado al cliente",
  },
];

export function QuickStatusChange({
  servicio,
  isOpen,
  onClose,
  onUpdate,
}: QuickStatusChangeProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!servicio || !selectedStatus) return;

    setIsUpdating(true);
    try {
      await onUpdate(servicio.id, selectedStatus);
      toast.success(`Estado actualizado a: ${selectedStatus}`);
      onClose();
    } catch (error) {
      toast.error("Error al actualizar el estado");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentEstado = ESTADOS.find((e) => e.value === servicio?.estado);
  const selectedEstado = ESTADOS.find((e) => e.value === selectedStatus);

  if (!servicio) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Estado del Servicio</DialogTitle>
          <DialogDescription>
            Actualiza rápidamente el estado de la orden #{servicio.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Estado actual */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Estado Actual
            </Label>
            {currentEstado && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <div
                  className={`w-10 h-10 ${currentEstado.color} rounded-full flex items-center justify-center`}
                >
                  <currentEstado.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{currentEstado.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentEstado.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Selector de nuevo estado */}
          <div className="space-y-2">
            <Label htmlFor="nuevo-estado">Nuevo Estado</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar nuevo estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((estado) => (
                  <SelectItem
                    key={estado.value}
                    value={estado.value}
                    disabled={estado.value === servicio.estado}
                  >
                    <div className="flex items-center gap-2">
                      <estado.icon className="w-4 h-4" />
                      {estado.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview del nuevo estado */}
          {selectedEstado && selectedEstado.value !== servicio.estado && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Vista Previa</Label>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div
                  className={`w-10 h-10 ${selectedEstado.color} rounded-full flex items-center justify-center`}
                >
                  <selectedEstado.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedEstado.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedEstado.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información del cliente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-800 mb-1">
              Cliente:
            </p>
            <p className="text-sm text-blue-900">
              {servicio.cliente_id?.datos_contacto?.nombre || "N/A"}
            </p>
            {servicio.cliente_id?.datos_contacto?.telefono && (
              <p className="text-xs text-blue-700 mt-1">
                Tel: {servicio.cliente_id.datos_contacto.telefono}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleUpdate}
            disabled={!selectedStatus || selectedStatus === servicio.estado || isUpdating}
            loading={isUpdating}
          >
            Actualizar Estado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
