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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, AlertCircle, Send } from "lucide-react";
import { Factura } from "@/lib/types";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface EnviarRecordatoriosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facturasVencidas: Factura[];
}

export function EnviarRecordatoriosDialog({
  open,
  onOpenChange,
  facturasVencidas,
}: EnviarRecordatoriosDialogProps) {
  const [selectedFacturas, setSelectedFacturas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState(
    `Estimado/a cliente,\n\nLe recordamos que tiene una factura pendiente de pago que ha vencido.\n\nPor favor, regularice su situación a la brevedad.\n\nMuchas gracias.`
  );
  const [enviando, setEnviando] = useState(false);

  const handleToggleFactura = (facturaId: string) => {
    setSelectedFacturas((prev) =>
      prev.includes(facturaId)
        ? prev.filter((id) => id !== facturaId)
        : [...prev, facturaId]
    );
  };

  const handleToggleAll = () => {
    if (selectedFacturas.length === facturasVencidas.length) {
      setSelectedFacturas([]);
    } else {
      setSelectedFacturas(facturasVencidas.map((f) => f.id));
    }
  };

  const handleEnviarRecordatorios = async () => {
    if (selectedFacturas.length === 0) {
      toast.error("Debe seleccionar al menos una factura");
      return;
    }

    setEnviando(true);

    try {
      // Enviar recordatorios uno por uno
      let enviados = 0;
      let errores = 0;

      for (const facturaId of selectedFacturas) {
        const factura = facturasVencidas.find((f) => f.id === facturaId);
        if (!factura || !factura.clientes?.email || factura.clientes.email.length === 0) {
          errores++;
          continue;
        }

        try {
          const response = await fetch("/api/org-email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: factura.clientes.email,
              subject: `Recordatorio: Factura ${factura.tipo_factura} vencida`,
              body: `${mensaje}\n\n---\nFactura: ${factura.tipo_factura} - ${factura.id.slice(0, 8)}\nTotal: $${factura.total.toFixed(2)}\nFecha vencimiento: ${factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toLocaleDateString("es-AR") : "N/A"}`,
            }),
          });

          if (response.ok) {
            enviados++;
          } else {
            errores++;
          }
        } catch (error) {
          errores++;
        }

        // Pequeño delay para no saturar el servidor
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (errores === 0) {
        toast.success(`${enviados} recordatorio(s) enviado(s) exitosamente`);
      } else {
        toast.warning(
          `${enviados} recordatorio(s) enviado(s), ${errores} con error(es)`
        );
      }

      setSelectedFacturas([]);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar recordatorios");
    } finally {
      setEnviando(false);
    }
  };

  const totalSeleccionado = selectedFacturas.reduce((sum, id) => {
    const factura = facturasVencidas.find((f) => f.id === id);
    return sum + (factura?.saldo_pendiente || factura?.total || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-600" />
            Enviar Recordatorios de Pago
          </DialogTitle>
          <DialogDescription>
            Seleccione las facturas vencidas a las que desea enviar recordatorios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Facturas vencidas ({facturasVencidas.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAll}
              >
                {selectedFacturas.length === facturasVencidas.length
                  ? "Deseleccionar todo"
                  : "Seleccionar todo"}
              </Button>
            </div>

            <div className="border rounded-md p-3 max-h-[250px] overflow-y-auto space-y-2">
              {facturasVencidas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay facturas vencidas
                </p>
              ) : (
                facturasVencidas.map((factura) => (
                  <div
                    key={factura.id}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedFacturas.includes(factura.id)}
                        onCheckedChange={() => handleToggleFactura(factura.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {factura.clientes?.nombre || "Sin cliente"}
                          </span>
                          {(!factura.clientes?.email ||
                            factura.clientes.email.length === 0) && (
                            <Badge variant="destructive" className="text-xs">
                              Sin email
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {factura.tipo_factura} - ID: {factura.id.slice(0, 8)} •{" "}
                          Venc:{" "}
                          {factura.fecha_vencimiento
                            ? new Date(
                                factura.fecha_vencimiento
                              ).toLocaleDateString("es-AR")
                            : "N/A"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm text-red-600">
                          ${(factura.saldo_pendiente || factura.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedFacturas.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded-md">
                <span className="text-sm font-medium">
                  {selectedFacturas.length} factura(s) seleccionada(s)
                </span>
                <span className="text-sm font-semibold text-red-600">
                  Total: ${totalSeleccionado.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="mensaje">Mensaje del recordatorio</Label>
            <Textarea
              id="mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Escriba el mensaje del recordatorio..."
            />
            <p className="text-xs text-muted-foreground">
              Los detalles de la factura se agregarán automáticamente al final del
              mensaje.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-900">
            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
            <p className="text-xs text-orange-800 dark:text-orange-200">
              Los recordatorios se enviarán únicamente a facturas con email registrado.
              Facturas sin email serán omitidas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviarRecordatorios}
            disabled={enviando || selectedFacturas.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {enviando ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Enviar Recordatorios ({selectedFacturas.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
