'use client';

import { Tarea, TareaComentario, TareaHistorial } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  User,
  Calendar,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  MessageSquare,
  History,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { sheetClasses } from '@/lib/design-system';

interface TareaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarea: Tarea | null;
  onSuccess?: () => void;
}

const prioridadColors: Record<string, string> = {
  baja: 'bg-gray-500',
  media: 'bg-blue-500',
  alta: 'bg-orange-500',
  urgente: 'bg-red-500',
};

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-500',
  asignada: 'bg-blue-500',
  en_proceso: 'bg-purple-500',
  en_espera: 'bg-orange-500',
  completada: 'bg-green-500',
  cancelada: 'bg-gray-400',
};

const tipoLabels: Record<string, string> = {
  servicio_tecnico: 'Servicio Técnico',
  instalacion: 'Instalación',
  reparacion: 'Reparación',
  mantenimiento: 'Mantenimiento',
  consulta_tecnica: 'Consulta Técnica',
  presupuesto: 'Presupuesto',
  seguimiento_comercial: 'Seguimiento Comercial',
  reclamo: 'Reclamo',
  otro: 'Otro',
};

export default function TareaDetailSheet({
  open,
  onOpenChange,
  tarea,
  onSuccess,
}: TareaDetailSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [comentarios, setComentarios] = useState<TareaComentario[]>([]);
  const [historial, setHistorial] = useState<TareaHistorial[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [isSubmittingComentario, setIsSubmittingComentario] = useState(false);
  const [isChangingEstado, setIsChangingEstado] = useState(false);

  useEffect(() => {
    if (tarea && open) {
      fetchComentarios();
      fetchHistorial();
    }
  }, [tarea, open]);

  const fetchComentarios = async () => {
    if (!tarea) return;
    try {
      const res = await fetch(`/api/tareas/${tarea.id}/comentarios`);
      const data = await res.json();
      setComentarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching comentarios:', error);
    }
  };

  const fetchHistorial = async () => {
    if (!tarea) return;
    try {
      const res = await fetch(`/api/tareas/${tarea.id}/historial`);
      const data = await res.json();
      setHistorial(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching historial:', error);
    }
  };

  const handleSubmitComentario = async () => {
    if (!tarea || !nuevoComentario.trim()) return;

    setIsSubmittingComentario(true);
    try {
      const res = await fetch(`/api/tareas/${tarea.id}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comentario: nuevoComentario,
          es_interno: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al agregar comentario');
      }

      setNuevoComentario('');
      fetchComentarios();
      toast.success('Comentario agregado');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmittingComentario(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado: Tarea['estado']) => {
    if (!tarea) return;

    setIsChangingEstado(true);
    try {
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al cambiar estado');
      }

      toast.success('Estado actualizado');
      onSuccess?.();
      fetchHistorial();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsChangingEstado(false);
    }
  };

  const handleDelete = async () => {
    if (!tarea) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al eliminar tarea');
      }

      toast.success('Tarea eliminada correctamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!tarea) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full h-[95vh] overflow-hidden p-0 bg-purple-50 dark:bg-gray-950" side="bottom">
        <div className="h-full flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b shrink-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <ClipboardList className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-2xl">{tarea.titulo}</SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{tarea.codigo}</span>
                    <Badge className={estadoColors[tarea.estado]}>
                      {tarea.estado.replace(/_/g, ' ').charAt(0).toUpperCase() +
                        tarea.estado.replace(/_/g, ' ').slice(1)}
                    </Badge>
                    <Badge className={prioridadColors[tarea.prioridad]}>
                      {tarea.prioridad.charAt(0).toUpperCase() + tarea.prioridad.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <Tabs defaultValue="detalles" className="w-full">
              <TabsList className={cn(sheetClasses.tabsList, "grid-cols-3 mb-6")}>
                <TabsTrigger value="detalles" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Detalles</span>
                </TabsTrigger>
                <TabsTrigger value="comentarios" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">Comentarios ({comentarios.length})</span>
                </TabsTrigger>
                <TabsTrigger value="historial" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                  <History className="w-4 h-4" />
                  <span className="text-sm">Historial ({historial.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="detalles" className="space-y-6">
                {/* Description */}
                {tarea.descripcion && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Descripción</h3>
                    <p className="text-sm text-muted-foreground">{tarea.descripcion}</p>
                  </div>
                )}

                <Separator />

                {/* Cliente Info */}
                {tarea.cliente_nombre && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Cliente</h3>
                      </div>
                      <div className="pl-7">
                        <p className="text-sm">{tarea.cliente_nombre}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Fechas */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Fechas</h3>
                  </div>
                  <div className="space-y-2 pl-7">
                    {tarea.fecha_requerida && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Fecha requerida:</span>
                        <span className="text-sm">
                          {format(new Date(tarea.fecha_requerida), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      </div>
                    )}
                    {tarea.fecha_asignacion && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Asignada:</span>
                        <span className="text-sm">
                          {format(new Date(tarea.fecha_asignacion), 'dd/MM/yyyy HH:mm', {
                            locale: es,
                          })}
                        </span>
                      </div>
                    )}
                    {tarea.fecha_inicio && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Iniciada:</span>
                        <span className="text-sm">
                          {format(new Date(tarea.fecha_inicio), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                      </div>
                    )}
                    {tarea.fecha_completada && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Completada:</span>
                        <span className="text-sm">
                          {format(new Date(tarea.fecha_completada), 'dd/MM/yyyy HH:mm', {
                            locale: es,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Ubicación */}
                {tarea.ubicacion && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Ubicación</h3>
                      </div>
                      <div className="pl-7">
                        <p className="text-sm">{tarea.ubicacion}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Asignación */}
                {tarea.asignado_a_nombre && (
                  <>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Asignado a</h3>
                      <p className="text-sm text-muted-foreground">{tarea.asignado_a_nombre}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Resultado */}
                {tarea.resultado && (
                  <>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Resultado</h3>
                      <p className="text-sm text-muted-foreground">{tarea.resultado}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Creada por:</span>
                    <span>{tarea.creado_por_nombre || 'Sistema'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Creada:</span>
                    <span>
                      {format(new Date(tarea.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actualizada:</span>
                    <span>
                      {format(new Date(tarea.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Cambiar Estado</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {tarea.estado !== 'en_proceso' && tarea.estado !== 'completada' && (
                      <Button
                        onClick={() => handleCambiarEstado('en_proceso')}
                        disabled={isChangingEstado}
                        variant="outline"
                        size="sm"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Iniciar
                      </Button>
                    )}
                    {tarea.estado === 'en_proceso' && (
                      <Button
                        onClick={() => handleCambiarEstado('en_espera')}
                        disabled={isChangingEstado}
                        variant="outline"
                        size="sm"
                      >
                        <PauseCircle className="h-4 w-4 mr-2" />
                        Pausar
                      </Button>
                    )}
                    {tarea.estado !== 'completada' && (
                      <Button
                        onClick={() => handleCambiarEstado('completada')}
                        disabled={isChangingEstado}
                        variant="outline"
                        size="sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Completar
                      </Button>
                    )}
                    {tarea.estado !== 'cancelada' && (
                      <Button
                        onClick={() => handleCambiarEstado('cancelada')}
                        disabled={isChangingEstado}
                        variant="outline"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={() => setShowDeleteDialog(true)} variant="destructive" className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="comentarios" className="space-y-4">
                {/* New Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Agregar comentario..."
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleSubmitComentario}
                    disabled={isSubmittingComentario || !nuevoComentario.trim()}
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Agregar Comentario
                  </Button>
                </div>

                <Separator />

                {/* Comments List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {comentarios.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No hay comentarios
                      </div>
                    )}

                    {comentarios.map((comentario) => (
                      <Card key={comentario.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {comentario.usuario_nombre || 'Usuario'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comentario.created_at), 'dd/MM HH:mm', { locale: es })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comentario.comentario}</p>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="historial" className="space-y-4">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {historial.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No hay historial
                      </div>
                    )}

                    {historial.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 border-l-2 border-blue-500 bg-blue-50/50">
                        <History className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.descripcion}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {item.usuario_nombre || 'Sistema'}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La tarea será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
