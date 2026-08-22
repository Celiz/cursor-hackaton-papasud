'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Clock } from 'lucide-react';

interface TransitoItem {
  id: string;
  instalacion_id: string;
  descripcion: string;
  estado_compra: 'pedido' | 'en_camino';
  fecha_pedido?: string | null;
  fecha_estimada_llegada?: string | null;
  cantidad_requerida: number;
  instalacion_numero: string;
  cliente_nombre: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error');
  return data;
};

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export function EnTransitoWidget({ onItemClick }: { onItemClick?: (instalacionId: string) => void }) {
  const { data: items = [], isLoading } = useSWR<TransitoItem[]>(
    '/api/instalaciones/en-transito',
    fetcher,
    { dedupingInterval: 30000 }
  );

  if (isLoading || items.length === 0) return null;

  const enCamino = items.filter((i) => i.estado_compra === 'en_camino');
  const pedidos = items.filter((i) => i.estado_compra === 'pedido');

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold">
          En tránsito
          <span className="text-muted-foreground font-normal ml-1">
            ({enCamino.length} en camino, {pedidos.length} pedidos)
          </span>
        </h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const dias = item.fecha_pedido ? diasDesde(item.fecha_pedido) : null;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 text-sm p-2 rounded-md hover:bg-white/60 dark:hover:bg-gray-900/40 cursor-pointer"
              onClick={() => onItemClick?.(item.instalacion_id)}
            >
              {item.estado_compra === 'en_camino' ? (
                <Truck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              ) : (
                <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              )}
              <span className="font-medium truncate flex-1">{item.descripcion}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {item.instalacion_numero}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {item.cliente_nombre}
              </span>
              {item.fecha_estimada_llegada && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-xs shrink-0">
                  llega {formatFecha(item.fecha_estimada_llegada)}
                </Badge>
              )}
              {!item.fecha_estimada_llegada && dias !== null && dias > 7 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  {dias}d
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={
                  item.estado_compra === 'en_camino'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-blue-100 text-blue-700'
                }
              >
                {item.estado_compra === 'en_camino' ? 'En camino' : 'Pedido'}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
