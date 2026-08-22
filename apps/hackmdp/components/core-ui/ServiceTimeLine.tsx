"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Send, 
  AlertCircle,
  Package,
  DollarSign,
  User,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'comment' | 'payment' | 'insumo' | 'assignment';
  title: string;
  description?: string;
  timestamp: Date;
  user?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

interface ServiceTimelineProps {
  events: TimelineEvent[];
}

const eventIcons = {
  status_change: Wrench,
  comment: FileText,
  payment: DollarSign,
  insumo: Package,
  assignment: User,
};

const eventColors = {
  status_change: 'bg-blue-500',
  comment: 'bg-gray-500',
  payment: 'bg-green-500',
  insumo: 'bg-purple-500',
  assignment: 'bg-orange-500',
};

export function ServiceTimeline({ events }: ServiceTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-sm text-muted-foreground">No hay eventos registrados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historial del Servicio
        </CardTitle>
        <CardDescription>
          Seguimiento cronológico de todos los eventos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Events */}
          <div className="space-y-6">
            {sortedEvents.map((event, index) => {
              const Icon = eventIcons[event.type] || AlertCircle;
              const colorClass = eventColors[event.type] || 'bg-gray-500';
              const isFirst = index === 0;
              const isLast = index === sortedEvents.length - 1;

              return (
                <div key={event.id} className="relative pl-12">
                  {/* Icon */}
                  <div 
                    className={`absolute left-0 w-8 h-8 rounded-full ${colorClass} flex items-center justify-center border-4 border-primary/20 dark:border-primary/30 shadow-md z-10`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>

                  {/* Pulse animation for most recent */}
                  {isFirst && (
                    <div className={`absolute left-0 w-8 h-8 rounded-full ${colorClass} animate-ping opacity-20`} />
                  )}

                  {/* Content */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {event.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(event.timestamp, "PPp", { locale: es })}
                        </p>
                      </div>
                      {isFirst && (
                        <Badge variant="secondary" className="text-xs">
                          Reciente
                        </Badge>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-700 mb-2">
                        {event.description}
                      </p>
                    )}

                    {event.user && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{event.user}</span>
                      </div>
                    )}

                    {/* Metadata específica por tipo */}
                    {event.type === 'payment' && event.metadata?.amount && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm font-semibold text-green-600">
                          Monto: ${event.metadata.amount.toLocaleString('es-AR')}
                        </p>
                      </div>
                    )}

                    {event.type === 'insumo' && event.metadata?.items && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Insumos agregados:</p>
                        <div className="space-y-1">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {event.metadata.items.map((item: any, idx: number) => (
                            <p key={idx} className="text-sm">
                              • {item.nombre} (x{item.cantidad})
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para generar eventos de ejemplo (puedes adaptarlo a tu API)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateTimelineEvents(service: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Evento de creación
  if (service.fecha) {
    events.push({
      id: `create-${service.id}`,
      type: 'status_change',
      title: 'Servicio creado',
      description: `Ingresó al sistema con estado: ${service.estado}`,
      timestamp: new Date(service.fecha),
      user: service.creado_por || 'Sistema',
    });
  }

  // Asignación de técnico
  if (service.tecnico) {
    events.push({
      id: `assign-${service.id}`,
      type: 'assignment',
      title: 'Técnico asignado',
      description: `Servicio asignado a ${service.tecnico}`,
      timestamp: new Date(service.fecha || Date.now()),
      user: 'Sistema',
    });
  }

  // Insumos agregados
  if (service.insumos_utilizados) {
    try {
      const insumos = JSON.parse(service.insumos_utilizados);
      if (Array.isArray(insumos) && insumos.length > 0) {
        events.push({
          id: `insumos-${service.id}`,
          type: 'insumo',
          title: 'Insumos agregados',
          description: `Se agregaron ${insumos.length} insumo(s) al servicio`,
          timestamp: new Date(insumos[0]?.fecha || service.fecha || Date.now()),
          user: service.tecnico,
          metadata: { items: insumos },
        });
      }
    } catch (e) {
      console.error('Error parsing insumos:', e);
    }
  }

  // Evento de finalización
  if (service.estado === 'Listo/Reparado' && service.fecha_finalizacion) {
    events.push({
      id: `complete-${service.id}`,
      type: 'status_change',
      title: 'Servicio completado',
      description: 'El servicio fue marcado como terminado',
      timestamp: new Date(service.fecha_finalizacion),
      user: service.tecnico,
    });
  }

  // Evento de pago
  if (service.monto_total && service.estado_contable === 'Facturado') {
    events.push({
      id: `payment-${service.id}`,
      type: 'payment',
      title: 'Pago registrado',
      description: 'Se registró el pago del servicio',
      timestamp: new Date(service.fecha_pago || Date.now()),
      user: 'Sistema',
      metadata: { amount: parseFloat(service.monto_total) },
    });
  }

  return events;
}