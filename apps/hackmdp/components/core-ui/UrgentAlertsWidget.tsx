'use client';

import { useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAlertUrgency, getUrgencyMessage, requestNotificationPermission, supportsNotifications } from '@/lib/notification-utils';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar alertas');
  return Array.isArray(data) ? data : [];
};

export function UrgentAlertsWidget() {
  const router = useRouter();
  const { data: alertas, isLoading } = useSWR('/api/equipos-alertas', fetcher);

  // Request notification permission on mount
  useEffect(() => {
    if (supportsNotifications() && Notification.permission === 'default') {
      // Request after a short delay to avoid being too aggressive
      const timer = setTimeout(() => {
        requestNotificationPermission();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const urgentAlerts = useMemo(() => {
    if (!alertas || !Array.isArray(alertas)) return [];

    return alertas
      .filter(a => {
        if (a.estado === 'resuelta' || a.estado === 'cancelada') return false;
        if (!a.fecha_limite) return false;

        const urgency = getAlertUrgency(a.fecha_limite);
        return urgency === 'overdue' || urgency === 'urgent' || urgency === 'soon';
      })
      .sort((a, b) => {
        // Sort by urgency (overdue first, then by date)
        const urgencyA = getAlertUrgency(a.fecha_limite);
        const urgencyB = getAlertUrgency(b.fecha_limite);

        const urgencyOrder: Record<string, number> = {
          overdue: 0,
          urgent: 1,
          soon: 2,
          normal: 3,
        };

        if (urgencyOrder[urgencyA] !== urgencyOrder[urgencyB]) {
          return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
        }

        // Same urgency, sort by date
        return new Date(a.fecha_limite).getTime() - new Date(b.fecha_limite).getTime();
      })
      .slice(0, 5); // Show max 5
  }, [alertas]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (urgentAlerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay alertas urgentes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'urgent':
        return 'bg-orange-100 border-orange-300 text-orange-900';
      case 'soon':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'soon':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas Urgentes
            </CardTitle>
            <CardDescription>{urgentAlerts.length} alertas requieren atención</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/equipos-alertas')}
            className="flex items-center gap-1"
          >
            Ver todas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {urgentAlerts.map((alerta) => {
            const urgency = getAlertUrgency(alerta.fecha_limite);
            const message = getUrgencyMessage(alerta.fecha_limite);

            return (
              <div
                key={alerta.id}
                className={`p-3 border-2 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getUrgencyColor(urgency)}`}
                onClick={() => router.push(`/dashboard/equipos-alertas?id=${alerta.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getUrgencyIcon(urgency)}
                    <span className="font-semibold text-sm">{alerta.titulo}</span>
                  </div>
                  <Badge variant="outline" className="text-xs border-current">
                    {alerta.tipo?.replace('_', ' ')}
                  </Badge>
                </div>

                {alerta.descripcion && (
                  <p className="text-xs mb-2 line-clamp-2 opacity-90">{alerta.descripcion}</p>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{message}</span>
                  {alerta.equipo_unidad && (
                    <span className="opacity-75">
                      {alerta.equipo_unidad.equipos?.marca} {alerta.equipo_unidad.equipos?.modelo}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
