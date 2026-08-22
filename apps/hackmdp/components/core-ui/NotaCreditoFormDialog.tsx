"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Info, AlertCircle } from "lucide-react";
import { NotaCredito, Factura } from "@/lib/types";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { dialogClasses, formClasses } from "@/lib/design-system";

interface NotaCreditoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notaCredito?: NotaCredito | null;
  facturaId?: string; // Para pre-seleccionar factura
  onSuccess: () => void;
}

interface PaginatedFacturasResponse {
  data: Factura[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function NotaCreditoFormDialog({
  open,
  onOpenChange,
  notaCredito,
  facturaId,
  onSuccess,
}: NotaCreditoFormDialogProps) {
  // Traer facturas para el selector (con límite alto para tener todas disponibles)
  const { data: facturasResponse } = useSWR<PaginatedFacturasResponse>(
    '/api/facturas?pageSize=500',
    fetcher
  );
  const facturas = facturasResponse?.data || [];
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    factura_id: "",
    monto: "",
    motivo: "",
    comentarios: "",
  });

  // Información de la factura seleccionada
  const facturaSeleccionada = facturas?.find(f => f.id === formData.factura_id);
  const saldoPendiente = facturaSeleccionada?.saldo_pendiente ?? facturaSeleccionada?.total ?? 0;

  useEffect(() => {
    if (notaCredito) {
      setFormData({
        factura_id: notaCredito.factura_id || "",
        monto: notaCredito.monto?.toString() || "",
        motivo: notaCredito.motivo || "",
        comentarios: notaCredito.comentarios || "",
      });
    } else if (facturaId) {
      setFormData({
        factura_id: facturaId,
        monto: "",
        motivo: "",
        comentarios: "",
      });
    } else {
      setFormData({
        factura_id: "",
        monto: "",
        motivo: "",
        comentarios: "",
      });
    }
  }, [notaCredito, facturaId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        ...formData,
        monto: parseFloat(formData.monto),
      };

      const url = '/api/notas-credito';
      const method = notaCredito ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notaCredito ? { ...body, id: notaCredito.id } : body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar nota de crédito");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      alert(error.message || "Error al guardar nota de crédito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogClasses.content, "sm:max-w-[500px]")}>
        <DialogHeader className={dialogClasses.header}>
          <DialogTitle className={dialogClasses.title}>
            {notaCredito ? "Editar Nota de Crédito" : "Emitir Nota de Crédito"}
          </DialogTitle>
          <DialogDescription className={dialogClasses.description}>
            {notaCredito
              ? "Modifica los datos de la nota de crédito"
              : "Emite una nota de crédito para ajustar una factura"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={formClasses.fieldGroup}>
            <Label htmlFor="factura_id" className={formClasses.label}>Factura *</Label>
            <Select
              value={formData.factura_id}
              onValueChange={(value) =>
                setFormData({ ...formData, factura_id: value })
              }
              required
              disabled={!!facturaId || !!notaCredito}
            >
              <SelectTrigger className={formClasses.select}>
                <SelectValue placeholder="Seleccionar factura" />
              </SelectTrigger>
              <SelectContent className={formClasses.selectContent}>
                {facturas?.map((factura) => (
                  <SelectItem key={factura.id} value={factura.id} className={formClasses.selectItem}>
                    {factura.clientes?.nombre_fantasia || factura.clientes?.nombre}
                    {' - '}
                    {factura.tipo_factura}
                    {' - '}
                    {formatCurrency(factura.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {facturaSeleccionada && (
            <div className={formClasses.infoBox}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-orange-600" />
                <span>Información de la Factura</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1 pl-6">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium">{formatCurrency(facturaSeleccionada.total)}</span>
                </div>
                {facturaSeleccionada.total_pagado !== undefined && facturaSeleccionada.total_pagado > 0 && (
                  <div className="flex justify-between">
                    <span>Pagado:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(facturaSeleccionada.total_pagado)}
                    </span>
                  </div>
                )}
                {facturaSeleccionada.total_notas_credito !== undefined && facturaSeleccionada.total_notas_credito > 0 && (
                  <div className="flex justify-between">
                    <span>NC anteriores:</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(facturaSeleccionada.total_notas_credito)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Saldo pendiente:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(saldoPendiente)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className={formClasses.fieldGroup}>
            <Label htmlFor="monto" className={formClasses.label}>Monto de la NC *</Label>
            <Input
              id="monto"
              type="number"
              step="0.01"
              min="0"
              max={facturaSeleccionada?.total}
              placeholder="0.00"
              value={formData.monto}
              onChange={(e) =>
                setFormData({ ...formData, monto: e.target.value })
              }
              required
              className={formClasses.input}
            />
            {parseFloat(formData.monto) > (facturaSeleccionada?.total || 0) && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>El monto no puede superar el total de la factura</span>
              </div>
            )}
          </div>

          <div className={formClasses.fieldGroup}>
            <Label htmlFor="motivo" className={formClasses.label}>Motivo de la NC *</Label>
            <Select
              value={formData.motivo}
              onValueChange={(value) =>
                setFormData({ ...formData, motivo: value })
              }
              required
            >
              <SelectTrigger className={formClasses.select}>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent className={formClasses.selectContent}>
                <SelectItem value="devolucion" className={formClasses.selectItem}>Devolución de mercadería</SelectItem>
                <SelectItem value="descuento" className={formClasses.selectItem}>Descuento aplicado</SelectItem>
                <SelectItem value="error_facturacion" className={formClasses.selectItem}>Error en facturación</SelectItem>
                <SelectItem value="bonificacion" className={formClasses.selectItem}>Bonificación</SelectItem>
                <SelectItem value="anulacion" className={formClasses.selectItem}>Anulación parcial</SelectItem>
                <SelectItem value="otro" className={formClasses.selectItem}>Otro motivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={formClasses.fieldGroup}>
            <Label htmlFor="comentarios" className={formClasses.label}>Comentarios adicionales</Label>
            <Textarea
              id="comentarios"
              placeholder="Detalles del motivo de la nota de crédito (opcional)"
              value={formData.comentarios}
              onChange={(e) =>
                setFormData({ ...formData, comentarios: e.target.value })
              }
              rows={3}
              className={formClasses.textarea}
            />
          </div>

          <DialogFooter className={dialogClasses.footer}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className={dialogClasses.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              htmlType="submit"
              disabled={loading}
              iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
              className={dialogClasses.primaryButton}
            >
              {notaCredito ? "Guardar Cambios" : "Emitir NC"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
