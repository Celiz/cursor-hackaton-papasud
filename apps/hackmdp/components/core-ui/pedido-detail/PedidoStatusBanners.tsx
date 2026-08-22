"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Package, Truck, CreditCard, ExternalLink, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import type { Pedido } from "@/lib/types";
import type { PedidoFeatureFlags } from "./types";

function MercadoPagoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#009EE3"/>
      <path d="M16.5 8.5c-1.2-1-3-1.5-4.5-1.5s-3.3.5-4.5 1.5C6.2 9.7 5.5 11.3 5.5 13c0 1.2.8 2 2 2h9c1.2 0 2-.8 2-2 0-1.7-.7-3.3-2-4.5z" fill="#fff"/>
    </svg>
  );
}

interface PedidoStatusBannersProps {
  pedido: any;
  featureFlags: PedidoFeatureFlags;
  onOpenPreparacion?: () => void;
  onUpdate?: () => void;
}

export function PedidoStatusBanners({ pedido, featureFlags, onOpenPreparacion, onUpdate }: PedidoStatusBannersProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const enPreparacion = featureFlags.hasPreparationFlow && (pedido.estado === 'en_preparacion' || pedido.preparacion_id);

  const needsTracking = pedido.estado === 'enviado' && !pedido.entrega_tracking && !pedido.entrega_id;

  const handleAddTracking = async () => {
    if (!trackingNumber.trim()) return;
    setIsSavingTracking(true);
    try {
      const res = await fetch('/api/envios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedido_id: pedido.id,
          cliente_id: pedido.cliente_id || pedido.persona_id,
          numero_seguimiento: trackingNumber.trim(),
          estado: 'despachado',
          fecha_despacho: new Date().toISOString().split('T')[0],
          direccion_destino: typeof pedido.direccion_envio === 'object'
            ? [pedido.direccion_envio?.direccion, pedido.direccion_envio?.ciudad, pedido.direccion_envio?.provincia].filter(Boolean).join(', ')
            : pedido.direccion_envio || pedido.direccion_entrega || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear envío');
      }
      toast.success('Número de seguimiento guardado');
      setTrackingNumber('');
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar tracking');
    } finally {
      setIsSavingTracking(false);
    }
  };

  return (
    <>
      {/* Payment info (e-commerce) */}
      {featureFlags.hasPaymentInfo && (
        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Método:</span>
            <Badge variant="outline" className="capitalize gap-1.5">
              {pedido.metodo_pago === 'mercadopago' && <MercadoPagoIcon className="h-4 w-4" />}
              {pedido.metodo_pago === 'mercadopago' ? 'Mercado Pago' : pedido.metodo_pago || '-'}
            </Badge>
            {pedido.pago_online?.mp_status && (
              <>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={pedido.pago_online.mp_status === 'approved' ? 'default' : pedido.pago_online.mp_status === 'rejected' ? 'destructive' : 'outline'}>
                  {pedido.pago_online.mp_status === 'approved' ? 'Aprobado' :
                   pedido.pago_online.mp_status === 'rejected' ? 'Rechazado' :
                   pedido.pago_online.mp_status === 'pending' ? 'Pendiente' :
                   pedido.pago_online.mp_status === 'cancelled' ? 'Cancelado' :
                   pedido.pago_online.mp_status}
                </Badge>
              </>
            )}
          </div>
          {pedido.pago_online && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-gray-100 dark:border-gray-700">
              {pedido.pago_online.mp_payment_id && (
                <div>
                  <span className="text-muted-foreground block">ID Pago MP</span>
                  <span className="font-mono font-medium">{pedido.pago_online.mp_payment_id}</span>
                </div>
              )}
              {pedido.pago_online.mp_metodo_tipo && (
                <div>
                  <span className="text-muted-foreground block">Tipo</span>
                  <span className="capitalize">{pedido.pago_online.mp_metodo_tipo.replace(/_/g, ' ')}</span>
                  {pedido.pago_online.mp_tarjeta_ultimos4 && (
                    <span className="text-muted-foreground"> ****{pedido.pago_online.mp_tarjeta_ultimos4}</span>
                  )}
                </div>
              )}
              {pedido.pago_online.mp_cuotas && pedido.pago_online.mp_cuotas > 1 && (
                <div>
                  <span className="text-muted-foreground block">Cuotas</span>
                  <span>{pedido.pago_online.mp_cuotas}x</span>
                </div>
              )}
              {pedido.pago_online.mp_neto_recibido != null && (
                <div>
                  <span className="text-muted-foreground block">Neto recibido</span>
                  <span className="font-medium">${Number(pedido.pago_online.mp_neto_recibido).toLocaleString('es-AR')}</span>
                  {pedido.pago_online.mp_comision != null && Number(pedido.pago_online.mp_comision) > 0 && (
                    <span className="text-muted-foreground"> (comisión ${Number(pedido.pago_online.mp_comision).toLocaleString('es-AR')})</span>
                  )}
                </div>
              )}
              {pedido.pago_online.mp_pagador_nombre && (
                <div>
                  <span className="text-muted-foreground block">Pagador</span>
                  <span>{pedido.pago_online.mp_pagador_nombre}</span>
                </div>
              )}
              {pedido.pago_online.mp_pagador_email && (
                <div>
                  <span className="text-muted-foreground block">Email pagador</span>
                  <span>{pedido.pago_online.mp_pagador_email}</span>
                </div>
              )}
              {pedido.pago_online.mp_fecha_aprobado && (
                <div>
                  <span className="text-muted-foreground block">Fecha aprobado</span>
                  <span>{new Date(pedido.pago_online.mp_fecha_aprobado).toLocaleString('es-AR')}</span>
                </div>
              )}
              {pedido.pago_online.mp_live_mode === false && (
                <div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Sandbox</Badge>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Missing tracking warning + inline form */}
      {needsTracking && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Pedido enviado sin número de seguimiento
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Número de seguimiento"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTracking()}
              className="h-8 text-sm bg-white dark:bg-gray-900 flex-1"
            />
            <Button
              size="sm"
              onClick={handleAddTracking}
              disabled={isSavingTracking || !trackingNumber.trim()}
              className="h-8 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {isSavingTracking ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}

      {/* Preparation progress */}
      {enPreparacion && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Preparación
            </span>
            {pedido.preparacion_numero && (
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
                {pedido.preparacion_numero}
              </span>
            )}
            {pedido.preparacion_estado && (
              <Badge variant="outline" className="ml-auto text-xs text-purple-700 bg-purple-50 border-purple-300">
                {pedido.preparacion_estado === 'en_preparacion' ? 'En preparación' :
                 pedido.preparacion_estado === 'listo' ? 'Listo' :
                 pedido.preparacion_estado === 'despachado' ? 'Despachado' :
                 pedido.preparacion_estado === 'parcial' ? 'Parcial' :
                 pedido.preparacion_estado}
              </Badge>
            )}
          </div>
          {pedido.prep_total_items != null && pedido.prep_total_items > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-purple-600 dark:text-purple-400">
                  {pedido.prep_items_listos || 0} de {pedido.prep_total_items} items listos
                </span>
                <span className="text-xs font-medium text-purple-700">
                  {Math.round(((pedido.prep_items_listos || 0) / pedido.prep_total_items) * 100)}%
                </span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5">
                <div
                  className="bg-purple-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.round(((pedido.prep_items_listos || 0) / pedido.prep_total_items) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {!pedido.prep_total_items && (
            <p className="text-xs text-purple-600 dark:text-purple-400">
              El equipo de logística está preparando este pedido
            </p>
          )}
          {onOpenPreparacion && pedido.preparacion_id && (
            <button
              type="button"
              onClick={onOpenPreparacion}
              className="flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-medium rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Ver preparación
            </button>
          )}
        </div>
      )}

      {/* Delivery tracking */}
      {pedido.entrega_id && (
        <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-cyan-600" />
            <span className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
              Envío
            </span>
            {pedido.entrega_estado && (
              <Badge variant="outline" className="ml-auto text-xs text-cyan-700 bg-cyan-50 border-cyan-300">
                {pedido.entrega_estado === 'despachado' ? 'Despachado' :
                 pedido.entrega_estado === 'en_transito' ? 'En tránsito' :
                 pedido.entrega_estado === 'entregado' ? 'Entregado' :
                 pedido.entrega_estado}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-cyan-700 dark:text-cyan-300">
            {pedido.entrega_transportista && (
              <span className="capitalize">{pedido.entrega_transportista.replace(/_/g, ' ')}</span>
            )}
            {pedido.entrega_tracking && (
              <span className="font-mono font-medium">{pedido.entrega_tracking}</span>
            )}
            {pedido.entrega_fecha_entrega && (
              <span>Entregado: {new Date(pedido.entrega_fecha_entrega).toLocaleDateString('es-AR')}</span>
            )}
          </div>
        </div>
      )}

      {/* Already converted */}
      {pedido.convertido_factura && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800 dark:text-green-200">
            Este pedido ya fue convertido a factura
          </p>
        </div>
      )}
    </>
  );
}
