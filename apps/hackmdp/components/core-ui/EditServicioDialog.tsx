"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Servicio } from "@/lib/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const servicioSchema = z.object({
  estado: z.string().min(1, "Estado es requerido"),
  estado_contable: z.string().min(1, "Estado contable es requerido"),
  tecnico: z.string().min(1, "Técnico es requerido"),
  diagnostico: z.string().optional(),
  falla_declarada: z.string().optional(),
  insumos_utilizados: z.string().optional(),
  monto_servicio: z.string().optional(),
  monto_insumos: z.string().optional(),
  garantia: z.boolean().optional(),
  tipo_garantia: z.string().optional(),
});

type ServicioFormData = z.infer<typeof servicioSchema>;

interface EditServicioDialogProps {
  servicio: Servicio | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Servicio>) => Promise<void>;
}

const ESTADOS = [
  "Reparar",
  "En reparación",
  "Presupuestado/esperando respuesta",
  "Listo/Reparado",
  "Entregar/Enviar",
  "Entregado",
];

const ESTADOS_CONTABLES = [
  "Pendiente",
  "Facturado",
  "Pagado",
  "Garantía",
];

const TECNICOS = [
  "Juan Pérez",
  "María González",
  "Carlos Rodríguez",
  "Ana Martínez",
];

export function EditServicioDialog({
  servicio,
  isOpen,
  onClose,
  onSave,
}: EditServicioDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ServicioFormData>({
    resolver: zodResolver(servicioSchema),
    defaultValues: servicio
      ? {
          estado: servicio.estado,
          estado_contable: servicio.estado_contable,
          tecnico: servicio.tecnico,
          diagnostico: servicio.diagnostico || "",
          falla_declarada: servicio.falla_declarada || "",
          insumos_utilizados: servicio.insumos_utilizados || "",
          monto_servicio: servicio.monto_servicio?.toString() || "",
          monto_insumos: servicio.monto_insumos?.toString() || "",
          garantia: servicio.garantia || false,
          tipo_garantia: servicio.tipo_garantia || "",
        }
      : undefined,
  });

  const onSubmit = async (data: ServicioFormData) => {
    try {
      const updateData: Partial<Servicio> = {
        ...data,
        monto_servicio: data.monto_servicio ? parseFloat(data.monto_servicio) : 0,
        monto_insumos: data.monto_insumos ? parseFloat(data.monto_insumos) : 0,
      };

      await onSave(updateData);
      toast.success("Servicio actualizado correctamente");
      onClose();
    } catch (error) {
      toast.error("Error al actualizar el servicio");
      console.error(error);
    }
  };

  if (!servicio) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Servicio #{servicio.id}</DialogTitle>
          <DialogDescription>
            Actualiza la información de la orden de servicio
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Estados */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado del Servicio *</Label>
              <Select
                defaultValue={servicio.estado}
                onValueChange={(value) => setValue("estado", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.estado && (
                <p className="text-sm text-red-600">{errors.estado.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado_contable">Estado Contable *</Label>
              <Select
                defaultValue={servicio.estado_contable}
                onValueChange={(value) => setValue("estado_contable", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_CONTABLES.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.estado_contable && (
                <p className="text-sm text-red-600">
                  {errors.estado_contable.message}
                </p>
              )}
            </div>
          </div>

          {/* Técnico */}
          <div className="space-y-2">
            <Label htmlFor="tecnico">Técnico Asignado *</Label>
            <Select
              defaultValue={servicio.tecnico}
              onValueChange={(value) => setValue("tecnico", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar técnico" />
              </SelectTrigger>
              <SelectContent>
                {TECNICOS.map((tecnico) => (
                  <SelectItem key={tecnico} value={tecnico}>
                    {tecnico}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tecnico && (
              <p className="text-sm text-red-600">{errors.tecnico.message}</p>
            )}
          </div>

          {/* Falla declarada */}
          <div className="space-y-2">
            <Label htmlFor="falla_declarada">Falla Declarada</Label>
            <textarea
              id="falla_declarada"
              {...register("falla_declarada")}
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Descripción de la falla reportada por el cliente..."
            />
          </div>

          {/* Diagnóstico */}
          <div className="space-y-2">
            <Label htmlFor="diagnostico">Diagnóstico Técnico</Label>
            <textarea
              id="diagnostico"
              {...register("diagnostico")}
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Diagnóstico realizado por el técnico..."
            />
          </div>

          {/* Insumos */}
          <div className="space-y-2">
            <Label htmlFor="insumos_utilizados">Insumos Utilizados</Label>
            <textarea
              id="insumos_utilizados"
              {...register("insumos_utilizados")}
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Lista de insumos y repuestos utilizados..."
            />
          </div>

          {/* Montos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto_servicio">Monto Servicio ($)</Label>
              <Input
                id="monto_servicio"
                type="number"
                step="0.01"
                {...register("monto_servicio")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto_insumos">Monto Insumos ($)</Label>
              <Input
                id="monto_insumos"
                type="number"
                step="0.01"
                {...register("monto_insumos")}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Garantía */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="garantia"
                {...register("garantia")}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <Label htmlFor="garantia" className="cursor-pointer">
                Servicio en garantía
              </Label>
            </div>

            {watch("garantia") && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="tipo_garantia">Tipo de Garantía</Label>
                <Input
                  id="tipo_garantia"
                  {...register("tipo_garantia")}
                  placeholder="Ej: Garantía del fabricante, Garantía del servicio previo..."
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              iconLeft={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
