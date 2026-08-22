"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
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
import { Loader2, Info, DollarSign, Plus, Trash2 } from "lucide-react";
import { Servicio } from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { dialogClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface FacturarServicioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: Servicio | null;
  onSuccess: () => void;
}

export function FacturarServicioDialog({
  open,
  onOpenChange,
  servicio,
  onSuccess,
}: FacturarServicioDialogProps) {
  const [loading, setLoading] = useState(false);

  // Calculate default vencimiento (30 days from today)
  const getDefaultVencimiento = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    fecha_emision: new Date().toISOString().split("T")[0],
    fecha_vencimiento: getDefaultVencimiento(),
    tipo_factura: "IVR",
    aplicar_iva: true,
  });

  if (!servicio) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Iniciando facturación para servicio:', servicio.id);

      // Calcular total de la factura
      const manObra = servicio.precio || 0;
      const insumos = 0; // Los insumos no tienen precio individual en servicios
      const subtotal = manObra + insumos;
      const iva = formData.aplicar_iva ? subtotal * 0.21 : 0;
      const total = subtotal + iva;

      console.log('Totales calculados:', { manObra, subtotal, iva, total });

      // 1. Crear la factura
      const facturaPayload = {
        cliente_id: servicio.cliente_id?.id || servicio.cliente_id,
        fecha_emision: formData.fecha_emision,
        fecha_vencimiento: formData.fecha_vencimiento,
        total: total,
        estado: 'pendiente',
        tipo_factura: formData.tipo_factura,
        comentarios: [{
          texto: `Factura generada desde servicio #${servicio.id?.slice(0, 8)}`,
          fecha: new Date().toISOString()
        }]
      };

      console.log('Creando factura con payload:', facturaPayload);

      const resFactura = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facturaPayload),
      });

      console.log('Respuesta factura status:', resFactura.status);

      if (!resFactura.ok) {
        const data = await resFactura.json();
        console.error('Error al crear factura:', data);
        throw new Error(data.error || 'Error al crear factura');
      }

      const factura = await resFactura.json();
      console.log('Factura creada:', factura);

      // 2. Crear item de factura vinculando el servicio
      console.log('Creando item de factura...');
      const itemPayload = {
        factura_id: factura.id,
        servicio_id: servicio.id,
        descripcion: `Servicio técnico - ${servicio.equipo_id?.equipo_id?.marca || ''} ${servicio.equipo_id?.equipo_id?.modelo || ''}`,
        cantidad: 1,
        precio_unitario: subtotal,
        subtotal: subtotal,
      };
      console.log('Item payload:', itemPayload);

      const resItem = await fetch('/api/facturas-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemPayload),
      });

      console.log('Respuesta item status:', resItem.status);

      if (!resItem.ok) {
        const itemData = await resItem.json();
        console.error('Error al crear item:', itemData);
        throw new Error(itemData.error || 'Error al vincular servicio con factura');
      }

      const item = await resItem.json();
      console.log('Item creado:', item);

      // 3. Actualizar el servicio como facturado
      console.log('Actualizando servicio...');
      const servicioPayload = {
        facturado: true,
        factura_link: factura.id,
        estado_contable: 'facturado',
      };
      console.log('Servicio payload:', servicioPayload);

      const resServicio = await fetch(`/api/servicios/${servicio.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicioPayload),
      });

      console.log('Respuesta servicio status:', resServicio.status);

      if (!resServicio.ok) {
        const servicioData = await resServicio.json();
        console.error('Error al actualizar servicio:', servicioData);
        console.error('ADVERTENCIA: Factura creada pero servicio no actualizado');
      } else {
        console.log('Servicio actualizado correctamente');
      }

      toast.success('Factura generada exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error completo al facturar:', error);
      toast.error(error.message || 'Error al facturar servicio');
    } finally {
      setLoading(false);
    }
  };

  const manObra = servicio.precio || 0;
  const insumos = 0; // Los insumos no tienen precio individual en servicios
  const subtotal = manObra + insumos;
  const iva = formData.aplicar_iva ? subtotal * 0.21 : 0;
  const total = subtotal + iva;

  const clienteNombre = servicio.cliente_id?.nombre_fantasia || servicio.cliente_id?.nombre || 'Cliente no especificado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogClasses.content, "sm:max-w-[500px]")}>
        <DialogHeader className={dialogClasses.header}>
          <DialogTitle className={dialogClasses.title}>Facturar Servicio</DialogTitle>
          <DialogDescription className={dialogClasses.description}>
            Genera una factura para el servicio completado
          </DialogDescription>
        </DialogHeader>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Info del servicio */}
          <div className="border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Información del Servicio</span>
            </div>
            <div className="text-sm space-y-1 pl-6 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{clienteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Servicio:</span>
                <span className="font-mono text-xs text-gray-900 dark:text-gray-100">#{servicio.id?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Equipo:</span>
                <span className="text-gray-900 dark:text-gray-100">{servicio.equipo_id?.equipo_id?.marca || ''} {servicio.equipo_id?.equipo_id?.modelo || ''}</span>
              </div>
            </div>
          </div>

          {/* Detalle de costos */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Detalle de Costos</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Precio:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(manObra)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Insumos:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(insumos)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1 flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(subtotal)}</span>
              </div>
              {formData.aplicar_iva && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">IVA (21%):</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(iva)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1 flex justify-between text-base">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha_emision" className="text-sm font-medium">Fecha de Emisión *</Label>
              <Input
                id="fecha_emision"
                type="date"
                value={formData.fecha_emision}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_emision: e.target.value })
                }
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha_vencimiento" className="text-sm font-medium">Vencimiento *</Label>
              <Input
                id="fecha_vencimiento"
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_vencimiento: e.target.value })
                }
                required
                min={formData.fecha_emision}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo_factura" className="text-sm font-medium">Tipo de Factura *</Label>
              <Select
                value={formData.tipo_factura}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_factura: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IVR" className="text-sm">IVR</SelectItem>
                  <SelectItem value="A" className="text-sm">A</SelectItem>
                  <SelectItem value="B" className="text-sm">B</SelectItem>
                  <SelectItem value="C" className="text-sm">C</SelectItem>
                  <SelectItem value="E" className="text-sm">E</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aplicar_iva" className="text-sm font-medium">IVA</Label>
            <Select
              value={formData.aplicar_iva ? "si" : "no"}
              onValueChange={(value) =>
                setFormData({ ...formData, aplicar_iva: value === "si" })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="si" className="text-sm">Aplicar IVA (21%)</SelectItem>
                <SelectItem value="no" className="text-sm">Sin IVA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className={dialogClasses.footer}>
            <motion.div whileHover={{ opacity: 0.8 }} whileTap={{ opacity: 0.6 }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className={dialogClasses.cancelButton}
              >
                Cancelar
              </Button>
            </motion.div>
            <motion.div whileHover={{ opacity: 0.8 }} whileTap={{ opacity: 0.6 }}>
              <Button type="submit" disabled={loading} iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined} className={dialogClasses.primaryButton}>
                Generar Factura
              </Button>
            </motion.div>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
