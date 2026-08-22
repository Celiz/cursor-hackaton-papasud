"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Save } from 'lucide-react';
import { PlanCuenta } from '@/app/dashboard/contabilidad/plan-cuentas/columns';

const cuentaSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido').max(50, 'Código muy largo'),
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo'),
  descripcion: z.string().optional(),
  tipo: z.enum(['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto'], {
    required_error: 'Tipo es requerido',
  }),
  nivel: z.number().min(1).max(10).default(1),
  activa: z.boolean().default(true),
});

type CuentaFormData = z.infer<typeof cuentaSchema>;

interface PlanCuentaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta?: PlanCuenta | null;
  onSuccess?: () => void;
}

export function PlanCuentaFormDialog({
  open,
  onOpenChange,
  cuenta,
  onSuccess,
}: PlanCuentaFormDialogProps) {
  const isEdit = !!cuenta;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<CuentaFormData>({
    resolver: zodResolver(cuentaSchema) as any,
    defaultValues: cuenta
      ? {
          codigo: cuenta.codigo,
          nombre: cuenta.nombre,
          descripcion: cuenta.descripcion || '',
          tipo: cuenta.tipo,
          nivel: cuenta.nivel,
          activa: cuenta.activa,
        }
      : {
          nivel: 1,
          activa: true,
        },
  });

  const onSubmit = async (data: CuentaFormData) => {
    try {
      const url = '/api/contabilidad/plan-cuentas';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...data, id: cuenta.id } : data;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar cuenta');
      }

      toast.success(isEdit ? 'Cuenta actualizada correctamente' : 'Cuenta creada correctamente');
      reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <Save className="h-5 w-5" />
                Editar Cuenta
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Nueva Cuenta
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos de la cuenta contable'
              : 'Crea una nueva cuenta en el plan de cuentas'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                {...register('codigo')}
                placeholder="1.1.01"
                className="font-mono"
              />
              {errors.codigo && (
                <p className="text-sm text-red-600">{errors.codigo.message}</p>
              )}
            </div>

            {/* Nivel */}
            <div className="space-y-2">
              <Label htmlFor="nivel">Nivel *</Label>
              <Input
                id="nivel"
                type="number"
                min="1"
                max="10"
                {...register('nivel', { valueAsNumber: true })}
              />
              {errors.nivel && (
                <p className="text-sm text-red-600">{errors.nivel.message}</p>
              )}
            </div>
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Cuenta *</Label>
            <Input
              id="nombre"
              {...register('nombre')}
              placeholder="Ej: Caja, Bancos, Capital Social..."
            />
            {errors.nombre && (
              <p className="text-sm text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Cuenta *</Label>
            <Select
              value={watch('tipo')}
              onValueChange={(value: any) => setValue('tipo', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="pasivo">Pasivo</SelectItem>
                <SelectItem value="patrimonio">Patrimonio</SelectItem>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="gasto">Gasto</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-red-600">{errors.tipo.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Descripción detallada de la cuenta..."
              rows={3}
            />
          </div>

          {/* Activa */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="activa">Cuenta Activa</Label>
              <p className="text-sm text-muted-foreground">
                Las cuentas inactivas no se mostrarán en formularios
              </p>
            </div>
            <Switch
              id="activa"
              checked={watch('activa')}
              onCheckedChange={(checked) => setValue('activa', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              htmlType="button"
              type="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              disabled={isSubmitting}
              iconLeft={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            >
              {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Cuenta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
