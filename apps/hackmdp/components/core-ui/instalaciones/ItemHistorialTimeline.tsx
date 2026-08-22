'use client';

import { Mail } from 'lucide-react';
import { useInstalacionItemHistorial } from '@/lib/hooks/use-instalacion-item-historial';
import type { EstadoCompra } from '@locus/core/instalaciones';

const estadoColors: Record<EstadoCompra, string> = {
  en_stock: 'bg-green-500',
  por_pedir: 'bg-yellow-500',
  pedido: 'bg-blue-500',
  en_camino: 'bg-indigo-500',
  recibido: 'bg-teal-500',
};

const estadoLabels: Record<EstadoCompra, string> = {
  en_stock: 'En stock',
  por_pedir: 'Por pedir',
  pedido: 'Pedido',
  en_camino: 'En camino',
  recibido: 'Recibido',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  instalacionId: string;
  itemId: string;
}

export function ItemHistorialTimeline({ instalacionId, itemId }: Props) {
  const { historial, isLoading } = useInstalacionItemHistorial(instalacionId, itemId);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2 px-3">Cargando historial...</p>;
  }

  if (historial.length === 0) {
    return <p className="text-xs text-muted-foreground py-2 px-3">Sin cambios registrados.</p>;
  }

  // Most recent first
  const sorted = [...historial].reverse();

  return (
    <div className="py-2 px-3 space-y-0">
      {sorted.map((entry, idx) => {
        const isLast = idx === sorted.length - 1;
        const color = estadoColors[entry.estado_nuevo] || 'bg-gray-400';

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${color}`} />
              {!isLast && <div className="w-px flex-1 bg-border" />}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">
                  {estadoLabels[entry.estado_nuevo]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(entry.created_at)}
                </span>
                {entry.autor_nombre && (
                  <span className="text-xs text-muted-foreground">
                    — {entry.autor_nombre}
                  </span>
                )}
              </div>
              {entry.nota && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  &ldquo;{entry.nota}&rdquo;
                </p>
              )}
              {entry.email_thread_id && entry.email_subject && (
                <button
                  className="flex items-center gap-1.5 mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent('open-email-thread', {
                        detail: {
                          threadId: entry.email_thread_id,
                          accountId: entry.email_account_id,
                        },
                      })
                    );
                  }}
                >
                  <Mail className="h-3 w-3" />
                  {entry.email_subject}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
