"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  PackageCheck,
  Truck,
  XCircle,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PedidoActionDialogsProps {
  pedidoData: any;
  cliente: any;
  items: any[];
  total: number;
  // Convert to Factura
  showConvertDialog: boolean;
  setShowConvertDialog: (show: boolean) => void;
  onConvertirAFactura: (tipo_factura: string) => Promise<void>;
  isConverting: boolean;
  convertWarnings: string[];
  // Send to Preparation
  showPrepararDialog: boolean;
  setShowPrepararDialog: (show: boolean) => void;
  onEnviarAPreparacion: () => Promise<void>;
  isPreparando: boolean;
  // Cancel
  showCancelDialog: boolean;
  setShowCancelDialog: (show: boolean) => void;
  onCancelarPedido: () => Promise<void>;
  isCancelling: boolean;
}

export function PedidoActionDialogs({
  pedidoData,
  cliente,
  items,
  total,
  showConvertDialog,
  setShowConvertDialog,
  onConvertirAFactura,
  isConverting,
  convertWarnings,
  showPrepararDialog,
  setShowPrepararDialog,
  onEnviarAPreparacion,
  isPreparando,
  showCancelDialog,
  setShowCancelDialog,
  onCancelarPedido,
  isCancelling,
}: PedidoActionDialogsProps) {
  const [tipoFactura, setTipoFactura] = useState("B");

  const formatDireccion = (dir: any) => {
    if (!dir) return null;
    if (typeof dir === 'string') return dir;
    if (dir.tipo === 'retiro') return 'Retiro en local';
    return [dir.direccion, dir.calle, dir.numero, dir.ciudad, dir.provincia, dir.codigo_postal].filter(Boolean).join(', ');
  };

  return (
    <>
      {/* Convert to Invoice */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Convertir Pedido a Factura?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Esto creará automáticamente una factura con los siguientes datos:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Cliente: {cliente?.nombre}</li>
                  <li>Total: {formatCurrency(total)}</li>
                  <li>Items: {items.length} productos</li>
                </ul>
                <p className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Se liberará el stock reservado y se marcará el pedido como facturado
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Tipo de Factura
            </label>
            <Select value={tipoFactura} onValueChange={setTipoFactura}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B">Factura B - Consumidor Final</SelectItem>
                <SelectItem value="A">Factura A - Responsable Inscripto</SelectItem>
                <SelectItem value="C">Factura C - Monotributista</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onConvertirAFactura(tipoFactura)}
              disabled={isConverting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConverting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Convirtiendo...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convertir a Factura
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send to Preparation */}
      <AlertDialog open={showPrepararDialog} onOpenChange={setShowPrepararDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-orange-600" />
              ¿Enviar a Preparación?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Esto creará una orden de preparación para el equipo de logística con los siguientes datos:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Cliente: {cliente?.nombre}</li>
                  <li>Items: {items.length} productos</li>
                  {pedidoData.direccion_entrega && (
                    <li>Dirección: {formatDireccion(pedidoData.direccion_entrega)}</li>
                  )}
                  {pedidoData.fecha_requerida && (
                    <li>Fecha requerida: {new Date(pedidoData.fecha_requerida).toLocaleDateString("es-AR")}</li>
                  )}
                </ul>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    El pedido pasará a estado "En Preparación" y aparecerá en la lista del equipo de logística.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPreparando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onEnviarAPreparacion}
              disabled={isPreparando}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isPreparando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Enviar a Preparación
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Pedido */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              ¿Cancelar Pedido?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Estás por cancelar el pedido <span className="font-mono font-semibold">#{pedidoData.numero || pedidoData.id?.slice(0, 8)}</span> de <span className="font-semibold">{cliente?.nombre || 'cliente desconocido'}</span>.
                </p>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Esta acción cambiará el estado del pedido a "Cancelado". El pedido quedará visible en el historial.
                  </p>
                </div>
                {pedidoData.pago_estado === 'approved' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 shrink-0" />
                      Este pedido tiene un pago aprobado. Recordá gestionar el reembolso si corresponde.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancelarPedido}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Sí, cancelar pedido
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conversion Warnings */}
      {convertWarnings.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            Advertencias al Convertir
          </p>
          {convertWarnings.map((warning, index) => (
            <div
              key={index}
              className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
            >
              <p className="text-sm text-orange-800 dark:text-orange-200">
                {warning}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
