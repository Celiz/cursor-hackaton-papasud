"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Calculator,
  FileText,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/use-format-currency";

// Tipos de retención disponibles
const TIPOS_RETENCION = [
  { value: "iibb", label: "IIBB (Ingresos Brutos)", color: "bg-blue-100 text-blue-700" },
  { value: "iva", label: "Percepción IVA", color: "bg-green-100 text-green-700" },
  { value: "ganancias", label: "Ganancias", color: "bg-purple-100 text-purple-700" },
  { value: "suss", label: "SUSS", color: "bg-orange-100 text-orange-700" },
  { value: "municipal", label: "Tasa Municipal", color: "bg-yellow-100 text-yellow-700" },
  { value: "otro", label: "Otro", color: "bg-gray-100 text-gray-700" },
];

// Jurisdicciones para IIBB
const JURISDICCIONES = [
  { value: "buenos_aires", label: "Buenos Aires (ARBA)" },
  { value: "caba", label: "CABA (AGIP)" },
  { value: "cordoba", label: "Córdoba" },
  { value: "santa_fe", label: "Santa Fe" },
  { value: "mendoza", label: "Mendoza" },
  { value: "tucuman", label: "Tucumán" },
  { value: "entre_rios", label: "Entre Ríos" },
  { value: "salta", label: "Salta" },
  { value: "neuquen", label: "Neuquén" },
  { value: "rio_negro", label: "Río Negro" },
  { value: "chubut", label: "Chubut" },
  { value: "otra", label: "Otra provincia" },
];

interface Retencion {
  id: string;
  tipo: string;
  jurisdiccion?: string;
  base_imponible: number;
  alicuota?: number;
  monto: number;
  numero_certificado?: string;
}

interface Movimiento {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  credito?: number;
  debito?: number;
  referencia?: string;
}

interface Factura {
  id: string;
  nro_factura?: string;
  numero?: string;
  total: number;
  saldo_pendiente: number;
  cliente_nombre?: string;
  nombre_fantasia?: string;
  nombre?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimiento: Movimiento | null;
  factura: Factura | null;
  onSuccess: () => void;
}

export function ConciliarConRetencionesDialog({
  open,
  onOpenChange,
  movimiento,
  factura,
  onSuccess,
}: Props) {
  const [retenciones, setRetenciones] = useState<Retencion[]>([]);
  const [saving, setSaving] = useState(false);

  // Resetear al abrir
  useEffect(() => {
    if (open) {
      setRetenciones([]);
    }
  }, [open]);

  const formatCurrency = useFormatCurrency()

  const montoAcreditado = movimiento?.credito || movimiento?.monto || 0;
  const saldoFactura = factura?.saldo_pendiente || factura?.total || 0;
  const totalRetenciones = retenciones.reduce((sum, r) => sum + (r.monto || 0), 0);
  const montoCubierto = montoAcreditado + totalRetenciones;
  const diferencia = saldoFactura - montoCubierto;

  const addRetencion = () => {
    setRetenciones([
      ...retenciones,
      {
        id: crypto.randomUUID(),
        tipo: "iibb",
        base_imponible: saldoFactura,
        monto: 0,
      },
    ]);
  };

  const updateRetencion = (id: string, field: keyof Retencion, value: any) => {
    setRetenciones(
      retenciones.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };

        // Auto-calcular monto si hay alícuota y base
        if ((field === "alicuota" || field === "base_imponible") && updated.alicuota && updated.base_imponible) {
          updated.monto = Math.round(updated.base_imponible * updated.alicuota * 100) / 100;
        }

        return updated;
      })
    );
  };

  const removeRetencion = (id: string) => {
    setRetenciones(retenciones.filter((r) => r.id !== id));
  };

  const handleConciliar = async () => {
    if (!movimiento || !factura) return;

    setSaving(true);
    try {
      const res = await fetch("/api/integraciones/bancarias/conciliar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movimiento_id: movimiento.id,
          factura_id: factura.id,
          retenciones: retenciones.map((r) => ({
            tipo: r.tipo,
            jurisdiccion: r.jurisdiccion,
            base_imponible: r.base_imponible,
            alicuota: r.alicuota,
            monto: r.monto,
            numero_certificado: r.numero_certificado,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al conciliar");
      }

      const result = await res.json();
      toast.success(result.message || "Movimiento conciliado correctamente");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!movimiento || !factura) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            Conciliar con Retenciones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen del movimiento y factura */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium">Movimiento Bancario</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {new Date(movimiento.fecha).toLocaleDateString("es-AR")}
              </p>
              <p className="text-sm truncate">{movimiento.descripcion}</p>
              <p className="text-xl font-bold text-green-600 mt-2">
                {formatCurrency(montoAcreditado)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Factura</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {factura.nro_factura || factura.numero}
              </p>
              <p className="text-sm truncate">
                {factura.cliente_nombre || factura.nombre_fantasia || factura.nombre}
              </p>
              <p className="text-xl font-bold text-blue-600 mt-2">
                Saldo: {formatCurrency(saldoFactura)}
              </p>
            </div>
          </div>

          {/* Diferencia sin retenciones */}
          {Math.abs(saldoFactura - montoAcreditado) > 0.01 && retenciones.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Diferencia detectada: {formatCurrency(saldoFactura - montoAcreditado)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  El monto acreditado no coincide con el saldo de la factura.
                  Si el cliente aplicó retenciones, agrégalas abajo.
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Retenciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Retenciones aplicadas por el cliente</h3>
              <Button variant="outline" size="sm" onClick={addRetencion}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar retención
              </Button>
            </div>

            {retenciones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay retenciones. Si el cliente no aplicó retenciones, puedes conciliar directamente.
              </p>
            ) : (
              <div className="space-y-4">
                {retenciones.map((ret, index) => (
                  <div
                    key={ret.id}
                    className="p-4 rounded-lg border bg-card space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className={TIPOS_RETENCION.find(t => t.value === ret.tipo)?.color}>
                        Retención #{index + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRetencion(ret.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo de retención</Label>
                        <Select
                          value={ret.tipo}
                          onValueChange={(v) => updateRetencion(ret.id, "tipo", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_RETENCION.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {ret.tipo === "iibb" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Jurisdicción</Label>
                          <Select
                            value={ret.jurisdiccion || ""}
                            onValueChange={(v) => updateRetencion(ret.id, "jurisdiccion", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {JURISDICCIONES.map((j) => (
                                <SelectItem key={j.value} value={j.value}>
                                  {j.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Base imponible</Label>
                        <Input
                          type="number"
                          value={ret.base_imponible || ""}
                          onChange={(e) =>
                            updateRetencion(ret.id, "base_imponible", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Alícuota (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ret.alicuota ? (ret.alicuota * 100).toFixed(2) : ""}
                          onChange={(e) =>
                            updateRetencion(ret.id, "alicuota", parseFloat(e.target.value) / 100 || 0)
                          }
                          placeholder="3.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Monto retenido *</Label>
                        <Input
                          type="number"
                          value={ret.monto || ""}
                          onChange={(e) =>
                            updateRetencion(ret.id, "monto", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">N° Certificado (opcional)</Label>
                      <Input
                        value={ret.numero_certificado || ""}
                        onChange={(e) =>
                          updateRetencion(ret.id, "numero_certificado", e.target.value)
                        }
                        placeholder="Número del certificado de retención"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Resumen final */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Monto acreditado en banco:</span>
              <span className="font-medium">{formatCurrency(montoAcreditado)}</span>
            </div>
            {totalRetenciones > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>+ Total retenciones:</span>
                <span className="font-medium">{formatCurrency(totalRetenciones)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Monto que cubre de la factura:</span>
              <span className="text-green-600">{formatCurrency(montoCubierto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Saldo de factura:</span>
              <span>{formatCurrency(saldoFactura)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Saldo restante después de conciliar:</span>
              <span className={diferencia <= 0.01 ? "text-green-600" : "text-orange-600"}>
                {formatCurrency(Math.max(0, diferencia))}
              </span>
            </div>
            {diferencia <= 0.01 && diferencia >= -0.01 && (
              <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                <CheckCircle2 className="h-4 w-4" />
                La factura quedará completamente pagada
              </div>
            )}
            {diferencia > 0.01 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                <AlertCircle className="h-4 w-4" />
                Quedará un saldo pendiente de {formatCurrency(diferencia)}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConciliar} disabled={saving}>
            {saving ? "Conciliando..." : "Conciliar"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
