'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Badge } from '@/components/ui/badge';
import { DescuentoPromocion } from '@/lib/types';
import { toast } from 'sonner';
import {
  Percent,
  DollarSign,
  Package,
  Tag,
  Users,
  Calendar,
  Hash,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import useSWR from 'swr';

interface DescuentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  descuento?: DescuentoPromocion | null;
  onSuccess?: () => void;
}

const TIPOS_DESCUENTO = [
  { value: 'porcentaje', label: 'Descuento Porcentaje', icon: Percent, color: 'info' },
  { value: 'monto_fijo', label: 'Descuento Monto Fijo', icon: DollarSign, color: 'success' },
  { value: 'por_volumen', label: 'Descuento por Volumen', icon: Package, color: 'warning' },
  { value: 'combo', label: 'Descuento Combo', icon: Tag, color: 'purple' },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al cargar datos');
  return res.json();
};

export function DescuentoFormDialog({
  open,
  onOpenChange,
  descuento,
  onSuccess,
}: DescuentoFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'porcentaje' as 'porcentaje' | 'monto_fijo' | 'por_volumen' | 'combo',
    valor: '',
    cantidad_minima: '',
    monto_minimo: '',
    cliente_id: '',
    producto_id: '',
    categoria_producto: '',
    productos_combo: [] as any[],
    fecha_inicio: '',
    fecha_fin: '',
    codigo_promocional: '',
    uso_maximo: '',
    activo: true,
  });

  // Load clientes and productos for selection
  const { data: clientes } = useSWR('/api/clientes?view=principal', fetcher);
  const { data: productosResp } = useSWR('/api/productos?pageSize=1000', fetcher);
  const productos = Array.isArray(productosResp) ? productosResp : ((productosResp as any)?.data ?? []);

  useEffect(() => {
    if (descuento) {
      setFormData({
        nombre: descuento.nombre || '',
        descripcion: descuento.descripcion || '',
        tipo: descuento.tipo || 'porcentaje',
        valor: descuento.valor?.toString() || '',
        cantidad_minima: descuento.cantidad_minima?.toString() || '',
        monto_minimo: descuento.monto_minimo?.toString() || '',
        cliente_id: descuento.cliente_id || '',
        producto_id: descuento.producto_id || '',
        categoria_producto: descuento.categoria_producto || '',
        productos_combo: descuento.productos_combo || [],
        fecha_inicio: descuento.fecha_inicio ? descuento.fecha_inicio.split('T')[0] : '',
        fecha_fin: descuento.fecha_fin ? descuento.fecha_fin.split('T')[0] : '',
        codigo_promocional: descuento.codigo_promocional || '',
        uso_maximo: descuento.uso_maximo?.toString() || '',
        activo: descuento.activo ?? true,
      });
    } else {
      // Reset form for new descuento
      setFormData({
        nombre: '',
        descripcion: '',
        tipo: 'porcentaje',
        valor: '',
        cantidad_minima: '',
        monto_minimo: '',
        cliente_id: '',
        producto_id: '',
        categoria_producto: '',
        productos_combo: [],
        fecha_inicio: '',
        fecha_fin: '',
        codigo_promocional: '',
        uso_maximo: '',
        activo: true,
      });
    }
  }, [descuento, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.nombre.trim()) {
        toast.error('El nombre es requerido');
        return;
      }

      if (!formData.valor || parseFloat(formData.valor) <= 0) {
        toast.error('El valor del descuento debe ser mayor a 0');
        return;
      }

      // Validate percentage range
      if (
        (formData.tipo === 'porcentaje' || formData.tipo === 'por_volumen') &&
        parseFloat(formData.valor) > 100
      ) {
        toast.error('El porcentaje no puede ser mayor a 100%');
        return;
      }

      // Build request body
      const body: any = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        tipo: formData.tipo,
        valor: parseFloat(formData.valor),
        cantidad_minima: formData.cantidad_minima ? parseInt(formData.cantidad_minima) : null,
        monto_minimo: formData.monto_minimo ? parseFloat(formData.monto_minimo) : null,
        cliente_id: formData.cliente_id || null,
        producto_id: formData.producto_id || null,
        categoria_producto: formData.categoria_producto || null,
        productos_combo: formData.productos_combo.length > 0 ? formData.productos_combo : null,
        fecha_inicio: formData.fecha_inicio || null,
        fecha_fin: formData.fecha_fin || null,
        codigo_promocional: formData.codigo_promocional.trim() || null,
        uso_maximo: formData.uso_maximo ? parseInt(formData.uso_maximo) : null,
        activo: formData.activo,
      };

      const url = descuento
        ? `/api/descuentos?id=${descuento.id}`
        : '/api/descuentos';

      const res = await fetch(url, {
        method: descuento ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar descuento');
      }

      toast.success(
        descuento
          ? 'Descuento actualizado correctamente'
          : 'Descuento creado correctamente'
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar descuento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTipo = TIPOS_DESCUENTO.find((t) => t.value === formData.tipo);
  const TipoIcon = selectedTipo?.icon || Percent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl">
            {descuento ? 'Editar Descuento' : 'Nuevo Descuento'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {descuento
              ? 'Modifica los detalles del descuento o promoción'
              : 'Crea un nuevo descuento o promoción para tus clientes'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            <div className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Información Básica
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nombre">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Descuento Verano 2025"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Describe los términos y condiciones del descuento"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Tipo y Valor del Descuento */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Tipo y Valor
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo">
                  Tipo de Descuento <span className="text-destructive">*</span>
                </Label>
                <select
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo: e.target.value as any,
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  {TIPOS_DESCUENTO.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="valor">
                  Valor <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <TipoIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    min="0"
                    max={
                      formData.tipo === 'porcentaje' || formData.tipo === 'por_volumen'
                        ? '100'
                        : undefined
                    }
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData({ ...formData, valor: e.target.value })
                    }
                    placeholder={
                      formData.tipo === 'porcentaje' || formData.tipo === 'por_volumen'
                        ? '0-100'
                        : '0.00'
                    }
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.tipo === 'porcentaje' || formData.tipo === 'por_volumen'
                    ? 'Porcentaje de descuento (0-100)'
                    : 'Monto fijo de descuento en pesos'}
                </p>
              </div>
            </div>
          </div>

          {/* Condiciones de Aplicación */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Condiciones de Aplicación
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cantidad_minima">Cantidad Mínima</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="cantidad_minima"
                    type="number"
                    min="1"
                    value={formData.cantidad_minima}
                    onChange={(e) =>
                      setFormData({ ...formData, cantidad_minima: e.target.value })
                    }
                    placeholder="Unidades mínimas"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="monto_minimo">Monto Mínimo de Compra</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="monto_minimo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto_minimo}
                    onChange={(e) =>
                      setFormData({ ...formData, monto_minimo: e.target.value })
                    }
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cliente_id">Cliente Específico</Label>
                <SearchableCombobox
                  preloadedOptions={
                    clientes?.map((c: any) => ({
                      value: c.id,
                      label: c.nombre,
                    })) || []
                  }
                  placeholder="Buscar cliente..."
                  emptyMessage="No se encontraron clientes"
                  value={formData.cliente_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cliente_id: value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dejar vacío para aplicar a todos los clientes
                </p>
              </div>

              <div>
                <Label htmlFor="producto_id">Producto Específico</Label>
                <SearchableCombobox
                  preloadedOptions={
                    productos?.map((p: any) => ({
                      value: p.id,
                      label: `${p.codigo} - ${p.nombre}`,
                    })) || []
                  }
                  placeholder="Buscar producto..."
                  emptyMessage="No se encontraron productos"
                  value={formData.producto_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, producto_id: value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dejar vacío para aplicar a todos los productos
                </p>
              </div>
            </div>
          </div>

          {/* Vigencia y Uso */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Vigencia y Límites de Uso
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_inicio: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="fecha_fin">Fecha de Fin</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_fin: e.target.value })
                  }
                  min={formData.fecha_inicio || undefined}
                />
              </div>

              <div>
                <Label htmlFor="codigo_promocional">Código Promocional</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="codigo_promocional"
                    value={formData.codigo_promocional}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        codigo_promocional: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="VERANO2025"
                    className="pl-10 uppercase"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Opcional. Si se define, el usuario debe ingresarlo
                </p>
              </div>

              <div>
                <Label htmlFor="uso_maximo">Uso Máximo</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="uso_maximo"
                    type="number"
                    min="1"
                    value={formData.uso_maximo}
                    onChange={(e) =>
                      setFormData({ ...formData, uso_maximo: e.target.value })
                    }
                    placeholder="Ilimitado"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cantidad máxima de veces que se puede usar
                </p>
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) =>
                setFormData({ ...formData, activo: e.target.checked })
              }
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="activo" className="cursor-pointer">
              Promoción activa
            </Label>
          </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t bg-muted/20 flex-shrink-0 flex justify-end gap-3">
            <Button
              htmlType="button"
              type="default"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10"
            >
              Cancelar
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="h-10"
            >
              {descuento ? 'Actualizar Descuento' : 'Crear Descuento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
