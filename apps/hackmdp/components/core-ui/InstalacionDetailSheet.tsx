'use client';

import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ItemsTab } from './instalaciones/ItemsTab';
import { ComentariosTab } from './instalaciones/ComentariosTab';
import { FechaEstadoPicker } from './instalaciones/FechaEstadoPicker';
import type { FechaEstado } from '@locus/core/instalaciones';
import { MapPin, User, MessageSquare, Building2, Mail } from 'lucide-react';
import { useInstalacionHistorial } from '@/lib/hooks/use-instalacion-historial';
import { cn } from '@/lib/utils';

interface Instalacion {
  id: string;
  numero: string;
  cliente_nombre?: string;
  estado: string;
  descripcion_equipo: string;
  tipo_equipo_nombre?: string;
  direccion_instalacion: string;
  direccion_efectiva?: string | null;
  laboratorio_id?: string | null;
  laboratorio?: {
    id: string;
    nombre: string;
    direccion?: string | null;
    localidad?: string | null;
    provincia?: string | null;
  } | null;
  ubicacion_tipo_nombre?: string;
  fecha_planificada?: string | null;
  fecha_inicio_real?: string;
  fecha_finalizacion_real?: string;
  tecnico_asignado_nombre?: string;
  costo_mano_obra: number;
  costo_materiales: number;
  costo_total: number;
  notas_planificacion?: string;
  notas_ejecucion?: string;
  problemas_encontrados?: string;
  soluciones_aplicadas?: string;
  total_items?: number;
  total_comentarios?: number;
  created_at: string;
  updated_at?: string;
  fecha_estado?: FechaEstado;
  fecha_nota?: string | null;
  oportunidad_id?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instalacion: Instalacion;
  onInstalacionUpdated?: () => void;
}

const estadoLabels: Record<string, string> = {
  planificada: 'Planificada',
  materiales_pedidos: 'Materiales pedidos',
  materiales_recibidos: 'Materiales recibidos',
  programada: 'Programada',
  en_progreso: 'En progreso',
  pausada: 'Pausada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export function InstalacionDetailSheet({
  open,
  onOpenChange,
  instalacion,
  onInstalacionUpdated,
}: Props) {
  const [direccion, setDireccion] = useState(instalacion.direccion_instalacion);
  const [fechaEstado, setFechaEstado] = useState<FechaEstado>(
    instalacion.fecha_estado || 'a_confirmar'
  );
  const [fechaPlanificada, setFechaPlanificada] = useState<string | null>(
    instalacion.fecha_planificada || null
  );
  const [fechaNota, setFechaNota] = useState<string | null>(instalacion.fecha_nota || null);
  const [chatterOpen, setChatterOpen] = useState(true);
  const { historial, isLoading: historialLoading } = useInstalacionHistorial(instalacion.id);

  const patchInstalacion = async (updates: Record<string, unknown>) => {
    const res = await fetch('/api/instalaciones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: instalacion.id, ...updates }),
    });
    if (res.ok && onInstalacionUpdated) onInstalacionUpdated();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] max-h-[90vh] overflow-hidden p-0 flex flex-row bg-white dark:bg-gray-950"
        title={instalacion.numero}
      >
        {/* Main content */}
        <div
          className={cn(
            'flex flex-col overflow-y-auto transition-all duration-200',
            chatterOpen ? 'flex-1 min-w-0' : 'w-full'
          )}
        >
          {/* Header */}
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 pr-12 sm:pr-14 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {instalacion.numero}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {instalacion.cliente_nombre || 'Sin cliente'}
                </p>
              </div>
              <Badge>{estadoLabels[instalacion.estado] || instalacion.estado}</Badge>
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-6">
            <Tabs defaultValue="resumen">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="resumen">Resumen</TabsTrigger>
                <TabsTrigger value="items">Equipos e insumos</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="resumen" className="space-y-4 mt-4">
                {instalacion.laboratorio && (
                  <div className="p-3 rounded-lg border border-purple-200/60 dark:border-purple-800/40 bg-purple-50/40 dark:bg-purple-950/20">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {instalacion.laboratorio.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[
                            instalacion.laboratorio.direccion,
                            instalacion.laboratorio.localidad,
                            instalacion.laboratorio.provincia,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'Sin dirección cargada'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Dirección puntual
                    {instalacion.laboratorio && (
                      <span className="text-xs text-muted-foreground font-normal">
                        (override opcional)
                      </span>
                    )}
                  </Label>
                  <Input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    onBlur={() => {
                      if (direccion !== instalacion.direccion_instalacion) {
                        patchInstalacion({ direccion_instalacion: direccion });
                      }
                    }}
                    placeholder={
                      instalacion.laboratorio
                        ? 'Vacío = usar dirección de la sede'
                        : 'Dirección donde se realiza la instalación'
                    }
                    className="mt-1"
                  />
                </div>

                <FechaEstadoPicker
                  fechaEstado={fechaEstado}
                  fechaPlanificada={fechaPlanificada}
                  fechaNota={fechaNota}
                  onChange={(u) => {
                    setFechaEstado(u.fecha_estado);
                    setFechaPlanificada(u.fecha_planificada);
                    setFechaNota(u.fecha_nota);
                    patchInstalacion({
                      fecha_estado: u.fecha_estado,
                      fecha_planificada: u.fecha_planificada,
                      fecha_nota: u.fecha_nota,
                    });
                  }}
                />

                {instalacion.tecnico_asignado_nombre && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Técnico: {instalacion.tecnico_asignado_nombre}
                  </div>
                )}

                {instalacion.oportunidad_id && (
                  <a
                    href={`/dashboard/oportunidades/${instalacion.oportunidad_id}`}
                    className="inline-block text-xs text-primary underline"
                  >
                    Ver oportunidad vinculada →
                  </a>
                )}
              </TabsContent>

              <TabsContent value="items" className="mt-4">
                <ItemsTab instalacionId={instalacion.id} />
              </TabsContent>

              <TabsContent value="historial" className="mt-4">
                {historialLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando historial...</p>
                ) : historial.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
                ) : (
                  <div className="space-y-0">
                    {historial.map((entry, idx) => {
                      const estadoColors: Record<string, string> = {
                        en_stock: 'bg-green-500',
                        por_pedir: 'bg-yellow-500',
                        pedido: 'bg-blue-500',
                        en_camino: 'bg-indigo-500',
                        recibido: 'bg-teal-500',
                      };
                      const estadoLabelsCompra: Record<string, string> = {
                        en_stock: 'En stock',
                        por_pedir: 'Por pedir',
                        pedido: 'Pedido',
                        en_camino: 'En camino',
                        recibido: 'Recibido',
                      };
                      const allColors: Record<string, string> = {
                        ...estadoColors,
                        planificada: 'bg-blue-500',
                        materiales_pedidos: 'bg-purple-500',
                        materiales_recibidos: 'bg-cyan-500',
                        programada: 'bg-indigo-500',
                        en_progreso: 'bg-orange-500',
                        pausada: 'bg-yellow-500',
                        completada: 'bg-green-500',
                        cancelada: 'bg-red-500',
                      };
                      const allEstadoLabels: Record<string, string> = {
                        ...estadoLabelsCompra,
                        planificada: 'Planificada',
                        materiales_pedidos: 'Materiales pedidos',
                        materiales_recibidos: 'Materiales recibidos',
                        programada: 'Programada',
                        en_progreso: 'En progreso',
                        pausada: 'Pausada',
                        completada: 'Completada',
                        cancelada: 'Cancelada',
                      };
                      const isLast = idx === historial.length - 1;
                      const color = allColors[entry.estado_nuevo] || 'bg-gray-400';
                      const d = new Date(entry.created_at);
                      const dateStr = d.toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      });

                      return (
                        <div key={entry.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${color}`} />
                            {!isLast && <div className="w-px flex-1 bg-border" />}
                          </div>
                          <div className="pb-4 min-w-0">
                            <div className="flex items-baseline gap-2 text-sm flex-wrap">
                              <span className="font-medium">
                                {entry.tipo_historial === 'instalacion' ? 'Instalación' : (entry.item_descripcion || 'Item')}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">{allEstadoLabels[entry.estado_nuevo] || entry.estado_nuevo}</span>
                              <span className="text-xs text-muted-foreground">{dateStr}</span>
                              {entry.autor_nombre && (
                                <span className="text-xs text-muted-foreground">— {entry.autor_nombre}</span>
                              )}
                            </div>
                            {entry.nota && (
                              <p className="text-sm text-muted-foreground mt-0.5">&ldquo;{entry.nota}&rdquo;</p>
                            )}
                            {entry.email_thread_id && entry.email_subject && (
                              <button
                                className="flex items-center gap-1.5 mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                                onClick={() => {
                                  window.dispatchEvent(
                                    new CustomEvent('open-email-thread', {
                                      detail: { threadId: entry.email_thread_id, accountId: entry.email_account_id },
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
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Chatter panel (comentarios) */}
        {chatterOpen ? (
          <div className="w-[340px] shrink-0 h-full border-l border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Comentarios</span>
              </div>
              <button
                onClick={() => setChatterOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
                title="Ocultar"
              >
                Ocultar
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <ComentariosTab instalacionId={instalacion.id} />
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col items-center py-3 px-1.5 bg-gray-50/50 dark:bg-gray-900/50">
            <button
              onClick={() => setChatterOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Mostrar comentarios"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
