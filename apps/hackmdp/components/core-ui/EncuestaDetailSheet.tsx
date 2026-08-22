'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Encuesta, EncuestaRespuesta } from '@/lib/types';
import {
  ClipboardList,
  Edit,
  Trash2,
  Star,
  Hash,
  MessageSquare,
  ListChecks,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Copy,
  ExternalLink,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface EncuestaDetailSheetProps {
  encuesta: Encuesta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (encuesta: Encuesta) => void;
  onDelete?: (encuesta: Encuesta) => void;
  defaultTab?: string;
}

interface RespuestaExtended extends EncuestaRespuesta {
  cliente_nombre?: string;
  cliente_email?: string | string[];
}

export default function EncuestaDetailSheet({
  encuesta,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  defaultTab = 'preguntas',
}: EncuestaDetailSheetProps) {
  const [respuestas, setRespuestas] = useState<RespuestaExtended[]>([]);
  const [loadingRespuestas, setLoadingRespuestas] = useState(false);
  const [detailData, setDetailData] = useState<Encuesta | null>(null);

  useEffect(() => {
    if (open && encuesta?.id) {
      fetchDetailData();
      fetchRespuestas();
    }
  }, [open, encuesta?.id]);

  useEffect(() => {
    if (!open) {
      setRespuestas([]);
      setDetailData(null);
    }
  }, [open]);

  const fetchDetailData = async () => {
    if (!encuesta?.id) return;
    try {
      const res = await fetch(`/api/encuestas/${encuesta.id}`);
      const data = await res.json();
      if (res.ok) {
        setDetailData(data);
      }
    } catch (err) {
      console.error('Error loading detail:', err);
    }
  };

  const fetchRespuestas = async () => {
    if (!encuesta?.id) return;
    setLoadingRespuestas(true);
    try {
      const res = await fetch(`/api/encuestas/${encuesta.id}/respuestas`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRespuestas(data);
      }
    } catch (err) {
      console.error('Error loading respuestas:', err);
    } finally {
      setLoadingRespuestas(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/encuesta/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado al portapapeles');
  };

  if (!encuesta) return null;

  const data = detailData || encuesta;
  const preguntas = Array.isArray(data.preguntas) ? data.preguntas : [];

  // NPS metrics from detail data
  const promotores = Number((detailData as any)?.promotores) || 0;
  const pasivos = Number((detailData as any)?.pasivos) || 0;
  const detractores = Number((detailData as any)?.detractores) || 0;
  const totalNPS = promotores + pasivos + detractores;
  const npsScore = totalNPS > 0 ? Math.round(((promotores - detractores) / totalNPS) * 100) : null;

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'nps':
        return <Hash className="h-4 w-4" />;
      case 'estrellas':
        return <Star className="h-4 w-4" />;
      case 'texto':
        return <MessageSquare className="h-4 w-4" />;
      case 'opcion_multiple':
        return <ListChecks className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-purple-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-purple-950/10"
        side="bottom"
      >
        <div className="h-full flex flex-col">
          <SheetHeader className="px-6 pt-4 pb-3 pr-14 border-b border-purple-200/50 dark:border-purple-800/30 shrink-0 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-950/10 dark:to-transparent">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-3 rounded-2xl border border-purple-200/30 dark:border-purple-800/30 shadow-sm shadow-purple-500/10">
                  <ClipboardList className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <SheetTitle className="text-2xl bg-gradient-to-r from-purple-900 to-purple-700 dark:from-purple-100 dark:to-purple-300 bg-clip-text text-transparent">
                    {data.nombre}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={data.activa ? 'default' : 'secondary'}>
                      {data.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {preguntas.length} preguntas
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {onEdit && (
                  <Button
                    size="tiny"
                    type="secondary"
                    onClick={() => onEdit(data)}
                    iconLeft={<Edit />}
                  >
                    Editar
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="tiny"
                    type="danger"
                    onClick={() => onDelete(data)}
                    iconLeft={<Trash2 />}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue={defaultTab} key={defaultTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="preguntas">Preguntas</TabsTrigger>
              <TabsTrigger value="respuestas">
                Respuestas ({Number(data.total_respuestas) || 0})
              </TabsTrigger>
              <TabsTrigger value="metricas">Métricas NPS</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="preguntas" className="mt-0 space-y-4">
                {/* Description */}
                {data.descripcion && (
                  <div className="p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10">
                    <Label className="text-xs text-muted-foreground">Descripción</Label>
                    <p className="text-sm mt-1">{data.descripcion}</p>
                  </div>
                )}

                {/* Questions list */}
                <div className="space-y-3">
                  {preguntas.map((pregunta, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTipoIcon(pregunta.tipo)}
                            <Badge variant="outline" className="text-xs">
                              {pregunta.tipo === 'nps'
                                ? 'NPS (0-10)'
                                : pregunta.tipo === 'estrellas'
                                ? 'Estrellas (1-5)'
                                : pregunta.tipo === 'texto'
                                ? 'Texto libre'
                                : 'Opción múltiple'}
                            </Badge>
                            {pregunta.requerida && (
                              <Badge variant="secondary" className="text-xs">
                                Requerida
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{pregunta.pregunta}</p>
                          {pregunta.tipo === 'opcion_multiple' && pregunta.opciones && (
                            <div className="mt-2 pl-4 space-y-1">
                              {pregunta.opciones.map((opcion: string, optIdx: number) => (
                                <div
                                  key={optIdx}
                                  className="text-sm text-muted-foreground flex items-center gap-2"
                                >
                                  <div className="w-3 h-3 rounded-full border border-gray-300" />
                                  {opcion}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Config */}
                <div className="grid grid-cols-2 gap-4">
                  {data.trigger_automatico && (
                    <div className="p-3 border rounded-lg bg-card">
                      <Label className="text-xs text-muted-foreground">Envío automático</Label>
                      <p className="font-medium text-sm mt-1 capitalize">
                        {data.trigger_automatico.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.dias_despues_trigger} días después
                      </p>
                    </div>
                  )}
                  {data.created_at && (
                    <div className="p-3 border rounded-lg bg-card">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha de creación
                      </Label>
                      <p className="font-medium text-sm mt-1">
                        {format(new Date(data.created_at), 'PPP', { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="respuestas" className="mt-0 space-y-4">
                {/* Summary stats */}
                {respuestas.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Send className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-lg font-bold text-blue-700">{respuestas.length}</p>
                        <p className="text-xs text-blue-600">Enviadas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-lg font-bold text-green-700">
                          {respuestas.filter(r => r.completada).length}
                        </p>
                        <p className="text-xs text-green-600">Completadas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-lg font-bold text-orange-700">
                          {respuestas.filter(r => !r.completada).length}
                        </p>
                        <p className="text-xs text-orange-600">Pendientes</p>
                      </div>
                    </div>
                  </div>
                )}

                {loadingRespuestas ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : respuestas.length === 0 ? (
                  <div className="text-center p-8 bg-muted/30 rounded-lg border-2 border-dashed">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No hay encuestas enviadas aún
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Usa el botón "Enviar a Cliente" para enviar esta encuesta
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {respuestas.map((respuesta) => (
                      <div
                        key={respuesta.id}
                        className={`p-4 border rounded-xl transition-all ${
                          respuesta.completada
                            ? 'border-green-200/60 bg-gradient-to-br from-white to-green-50/30'
                            : 'border-orange-200/60 bg-gradient-to-br from-white to-orange-50/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              respuesta.completada ? 'bg-green-100' : 'bg-orange-100'
                            }`}>
                              {respuesta.completada ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {respuesta.cliente_nombre || 'Cliente sin nombre'}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Enviada: {format(new Date(respuesta.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </p>
                              {respuesta.completada_at && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Completada: {format(new Date(respuesta.completada_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {respuesta.nps_score !== null && respuesta.nps_score !== undefined && (
                              <Badge
                                className={
                                  respuesta.nps_score >= 9
                                    ? 'bg-green-100 text-green-700'
                                    : respuesta.nps_score >= 7
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }
                              >
                                NPS: {respuesta.nps_score}
                              </Badge>
                            )}
                            <Badge variant={respuesta.completada ? 'default' : 'secondary'}
                              className={respuesta.completada ? 'bg-green-600' : 'bg-orange-500 text-white'}
                            >
                              {respuesta.completada ? 'Completada' : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>

                        {!respuesta.completada && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-orange-200/50">
                            <span className="text-sm text-muted-foreground">Acciones:</span>
                            <Button
                              type="outline"
                              size="tiny"
                              onClick={() => copyLink(respuesta.token)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copiar link
                            </Button>
                            <Button
                              type="outline"
                              size="tiny"
                              onClick={() =>
                                window.open(`/encuesta/${respuesta.token}`, '_blank')
                              }
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Abrir
                            </Button>
                          </div>
                        )}

                        {respuesta.completada && Array.isArray(respuesta.respuestas) && (
                          <div className="mt-3 pt-3 border-t border-green-200/50 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Respuestas:</p>
                            {respuesta.respuestas.map((resp: any, idx: number) => (
                              <div key={idx} className="text-sm bg-white/50 p-2 rounded-lg">
                                <span className="text-muted-foreground text-xs">
                                  {preguntas[idx]?.pregunta || `Pregunta ${idx + 1}`}
                                </span>
                                <p className="font-medium mt-0.5">{String(resp.valor)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="metricas" className="mt-0 space-y-6">
                {/* NPS Score */}
                <div className="p-6 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/10">
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Net Promoter Score (NPS)
                  </h3>

                  {totalNPS === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay suficientes respuestas NPS para calcular métricas
                    </p>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <div
                          className={`text-6xl font-bold ${
                            npsScore !== null && npsScore >= 50
                              ? 'text-green-600'
                              : npsScore !== null && npsScore >= 0
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {npsScore !== null ? npsScore : '-'}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Basado en {totalNPS} respuestas
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-700">{promotores}</div>
                          <p className="text-xs text-green-600">Promotores (9-10)</p>
                          <Progress
                            value={(promotores / totalNPS) * 100}
                            className="mt-2 bg-green-100"
                          />
                        </div>

                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <Minus className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-yellow-700">{pasivos}</div>
                          <p className="text-xs text-yellow-600">Pasivos (7-8)</p>
                          <Progress
                            value={(pasivos / totalNPS) * 100}
                            className="mt-2 bg-yellow-100"
                          />
                        </div>

                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <TrendingDown className="h-6 w-6 text-red-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-red-700">{detractores}</div>
                          <p className="text-xs text-red-600">Detractores (0-6)</p>
                          <Progress
                            value={(detractores / totalNPS) * 100}
                            className="mt-2 bg-red-100"
                          />
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <strong>¿Cómo se calcula?</strong> NPS = % Promotores - % Detractores.
                          Un NPS mayor a 50 se considera excelente, entre 0-50 es bueno, y menor a 0
                          indica áreas de mejora.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Average by question */}
                {data.promedio_nps !== null && data.promedio_nps !== undefined && (
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Promedio NPS (todas las respuestas)
                        </Label>
                        <p className="text-3xl font-bold mt-1">{data.promedio_nps}</p>
                      </div>
                      <Star className="h-10 w-10 text-yellow-400 fill-yellow-400" />
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
