'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetStatCard,
  DetailSheetInfoItem,
  DetailSheetEmptyState,
} from '@/components/core-ui/DetailSheetComponents';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { describirEnvio } from '@/lib/email/errores-legibles';
import {
  HorarioEnvioCampana,
  type ValorHorarioEnvio,
} from '@/components/core-ui/campanas/HorarioEnvioCampana';
import { toast } from 'sonner';
import {
  Send, Mail, MailOpen, MousePointerClick, AlertTriangle, Ban, Clock, Users, Gauge,
  CalendarClock,
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campana: any | null;
  onEdit?: (c: any) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ESTADO_BADGE: Record<string, { txt: string; clase: string }> = {
  borrador: { txt: 'Borrador', clase: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  programada: { txt: 'Programada', clase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  enviando: { txt: 'Enviando', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  enviada: { txt: 'Enviada', clase: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  pausada: { txt: 'Pausada', clase: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
};

/** "4 h 20 min", "35 min", "—". El ETA sale del cupo del proveedor, no de la cola. */
function formatearEspera(minutos?: number | null): string {
  if (!minutos || minutos <= 0) return '—';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  const dias = Math.floor(h / 24);
  if (dias >= 1) return `${dias} d ${h % 24} h`;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function fecha(v?: string | null): string {
  if (!v) return '—';
  return new Date(v).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function pct(parte: number, total: number): string {
  if (!total) return '0%';
  return `${((parte / total) * 100).toFixed(1)}%`;
}

/**
 * Guarda cada cambio del horario al toque (la ficha no tiene botón "Guardar").
 * El control en sí es compartido con el panel de Ajustes del editor, que en
 * cambio lo persiste junto con el resto del formulario.
 */
function HorarioEnvio({ campana }: { campana: any }) {
  const [valor, setValor] = useState<ValorHorarioEnvio>({
    envio_hora_desde: campana.envio_hora_desde ?? null,
    envio_hora_hasta: campana.envio_hora_hasta ?? null,
    envio_dias: campana.envio_dias ?? null,
  });
  const [guardando, setGuardando] = useState(false);

  const guardar = async (nuevo: ValorHorarioEnvio) => {
    const previo = valor;
    setValor(nuevo); // optimista: el control responde solo
    setGuardando(true);
    try {
      const res = await fetch(`/api/email/campaigns/${campana.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      });
      if (!res.ok) throw new Error('no se pudo guardar');
      Object.assign(campana, nuevo);
    } catch {
      setValor(previo);
      toast.error('No se pudo guardar el horario de envío');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <HorarioEnvioCampana
      valor={valor}
      onChange={guardar}
      disabled={guardando}
      avisarPausa={campana.estado === 'enviando'}
    />
  );
}

export function CampanaDetailSheet({ open, onOpenChange, campana, onEdit }: Props) {
  const [filtro, setFiltro] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  const id = campana?.id;
  const enCurso = campana?.estado === 'enviando';

  // Mientras envía, el progreso se refresca solo: es la pantalla que uno deja
  // abierta justamente para ver avanzar.
  const { data: progreso } = useSWR(
    open && id ? `/api/email/campaigns/${id}/progress` : null,
    fetcher,
    { refreshInterval: enCurso ? 10_000 : 0 },
  );

  const qs = new URLSearchParams({ filtro, limit: '200' });
  if (busca.trim().length >= 2) qs.set('search', busca.trim());
  const { data: detalle, isLoading } = useSWR(
    open && id ? `/api/email/campaigns/${id}/destinatarios?${qs}` : null,
    fetcher,
    { refreshInterval: enCurso ? 15_000 : 0 },
  );

  if (!campana) return null;

  const r = detalle?.resumen || {};
  const total = progreso?.total ?? r.total ?? 0;
  const enviados = progreso?.enviados ?? r.enviados ?? 0;
  const pendientes = progreso?.pendientes ?? r.pendientes ?? 0;
  const avance = total > 0 ? Math.min(100, Math.round((enviados / total) * 100)) : 0;
  const badge = ESTADO_BADGE[campana.estado] || ESTADO_BADGE.borrador;

  const chips: Array<{ id: string; label: string; valor: number; color: string }> = [
    { id: 'todos', label: 'Todos', valor: r.total ?? 0, color: 'text-gray-700 dark:text-gray-300' },
    { id: 'enviados', label: 'Enviados', valor: r.enviados ?? 0, color: 'text-green-700 dark:text-green-400' },
    { id: 'pendientes', label: 'En cola', valor: r.pendientes ?? 0, color: 'text-amber-700 dark:text-amber-400' },
    { id: 'abiertos', label: 'Abrieron', valor: r.abiertos ?? 0, color: 'text-blue-700 dark:text-blue-400' },
    { id: 'clickearon', label: 'Clickearon', valor: r.clickearon ?? 0, color: 'text-purple-700 dark:text-purple-400' },
    { id: 'rebotados', label: 'Rebotaron', valor: r.rebotados ?? 0, color: 'text-rose-700 dark:text-rose-400' },
    { id: 'fallidos', label: 'Fallaron', valor: r.fallidos ?? 0, color: 'text-red-700 dark:text-red-400' },
  ];

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="purple">
      <DetailSheetHeader
        icon={Send}
        title={campana.nombre || 'Campaña'}
        subtitle={campana.asunto || undefined}
        theme="purple"
        onEdit={onEdit ? () => onEdit(campana) : undefined}
        badges={
          <>
            <Badge className={cn('border-0', badge.clase)}>{badge.txt}</Badge>
            {campana.lista?.nombre && (
              <Badge variant="outline" className="text-xs">{campana.lista.nombre}</Badge>
            )}
          </>
        }
      />

      <DetailSheetContent>
        {/* ── Por dónde va ─────────────────────────────────────────────── */}
        {(enCurso || campana.estado === 'programada' || pendientes > 0) && (
          <DetailSheetSection icon={Gauge} title="Por dónde va" theme="amber">
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium">
                    {enviados.toLocaleString('es-AR')} de {total.toLocaleString('es-AR')} enviados
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{avance}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-[width] duration-500"
                    style={{ width: `${avance}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <DetailSheetInfoItem icon={Clock} theme="amber" label="Faltan" value={pendientes.toLocaleString('es-AR')} />
                <DetailSheetInfoItem
                  icon={Clock}
                  theme="amber"
                  label="Termina en"
                  value={formatearEspera(progreso?.eta_minutos)}
                />
                <DetailSheetInfoItem
                  icon={Gauge}
                  theme="amber"
                  label="Última hora"
                  value={`${progreso?.enviados_ultima_hora ?? 0} / ${progreso?.cupo_hora ?? '—'}`}
                />
                <DetailSheetInfoItem
                  icon={Gauge}
                  theme="amber"
                  label="Último día"
                  value={`${progreso?.enviados_ultimo_dia ?? 0} / ${progreso?.cupo_dia ?? '—'}`}
                />
              </div>

              {progreso?.fin_estimado && (
                <p className="text-xs text-muted-foreground">
                  Estimado de fin: <strong>{fecha(progreso.fin_estimado)}</strong>. Sale al ritmo que
                  permite el cupo del proveedor, no al de la cola.
                </p>
              )}
            </div>
          </DetailSheetSection>
        )}

        {/* ── Resultados ───────────────────────────────────────────────── */}
        <DetailSheetSection icon={Mail} title="Resultados" theme="purple">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetStatCard value={(r.enviados ?? 0).toLocaleString('es-AR')} label="Enviados" color="green" icon={Send} />
            <DetailSheetStatCard
              value={(r.abiertos ?? 0).toLocaleString('es-AR')}
              label="Abrieron"
              color="blue"
              icon={MailOpen}
              subtext={pct(r.abiertos ?? 0, r.enviados ?? 0)}
            />
            <DetailSheetStatCard
              value={(r.clickearon ?? 0).toLocaleString('es-AR')}
              label="Clickearon"
              color="purple"
              icon={MousePointerClick}
              subtext={pct(r.clickearon ?? 0, r.enviados ?? 0)}
            />
            <DetailSheetStatCard
              value={(r.rebotados ?? 0).toLocaleString('es-AR')}
              label="Rebotaron"
              color="rose"
              icon={Ban}
              subtext={pct(r.rebotados ?? 0, r.enviados ?? 0)}
            />
          </div>
        </DetailSheetSection>

        {/* ── Quién es quién ───────────────────────────────────────────── */}
        <DetailSheetSection icon={Users} title="Destinatarios" theme="blue">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFiltro(c.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    filtro === c.id
                      ? 'border-purple-500 bg-purple-600 text-white'
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800',
                  )}
                >
                  <span className={filtro === c.id ? '' : c.color}>{c.label}</span>{' '}
                  <span className="tabular-nums opacity-80">{c.valor.toLocaleString('es-AR')}</span>
                </button>
              ))}
            </div>

            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nombre, empresa o email…"
            />

            <div className="max-h-[420px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
              {isLoading && !detalle ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">Cargando…</p>
              ) : (detalle?.destinatarios?.length ?? 0) === 0 ? (
                <DetailSheetEmptyState icon={Users} message="No hay destinatarios en este filtro." />
              ) : (
                detalle.destinatarios.map((d: any) => {
                  const quien = [d.nombre, d.apellido].filter(Boolean).join(' ') || d.empresa || '';
                  // El texto crudo del servidor no lo entiende nadie: se traduce.
                  const aviso = describirEnvio(d);
                  const problema = aviso?.tono === 'problema';
                  // Un pendiente sin error ya lo cuenta el chip "En cola" de la
                  // derecha; no hace falta repetirlo acá.
                  const mostrarAviso = !!aviso && (!!aviso.tecnico || d.estado === 'fallido');
                  return (
                    <div
                      key={d.id}
                      className={cn(
                        'flex items-start justify-between gap-3 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-800',
                        problema && 'bg-rose-50/50 dark:bg-rose-950/10',
                      )}
                    >
                      <div className="min-w-0">
                        {quien && <p className="truncate font-medium">{quien}</p>}
                        <p className="truncate text-xs text-muted-foreground">{d.email}</p>
                        {mostrarAviso && aviso && (
                          <div
                            className={cn(
                              'mt-0.5 flex items-start gap-1 text-xs',
                              problema
                                ? 'text-rose-700 dark:text-rose-400'
                                : 'text-amber-700 dark:text-amber-400',
                            )}
                          >
                            {problema ? (
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            ) : (
                              <Clock className="mt-0.5 h-3 w-3 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="break-words font-medium">{aviso.titulo}</p>
                              <p className="break-words text-muted-foreground">{aviso.detalle}</p>
                              {aviso.tecnico && (
                                <details className="mt-0.5">
                                  <summary className="cursor-pointer text-muted-foreground/70 hover:text-muted-foreground">
                                    Detalle técnico
                                  </summary>
                                  <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground/80">
                                    {aviso.tecnico}
                                  </p>
                                </details>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        {d.estado === 'pendiente' ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                            <Clock className="h-3 w-3" /> En cola
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{fecha(d.enviado_at)}</span>
                        )}
                        <div className="mt-0.5 flex items-center justify-end gap-2 text-muted-foreground">
                          {d.abierto && (
                            <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400" title={`Abrió el ${fecha(d.abierto_at)}`}>
                              <MailOpen className="h-3 w-3" /> abrió
                            </span>
                          )}
                          {d.clicks > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400" title={`Último click ${fecha(d.ultimo_click_at)}`}>
                              <MousePointerClick className="h-3 w-3" /> {d.clicks}
                            </span>
                          )}
                          {d.retry_count > 0 && <span title="Reintentos">↻ {d.retry_count}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {detalle?.truncado && (
              <p className="text-xs text-muted-foreground">
                Se muestran los primeros 200. Usá el buscador para encontrar a alguien puntual.
              </p>
            )}
          </div>
        </DetailSheetSection>

        {/* ── Horario de envío ─────────────────────────────────────────────
            Sólo si a la campaña todavía le queda algo por mandar. En una ya
            enviada el control no hace nada y ensucia la ficha, que a esa altura
            se abre para ver resultados. Para reenviarla hay que reprogramarla
            desde el editor, y ahí el horario sigue estando. */}
        {campana.estado !== 'enviada' && (
          <DetailSheetSection icon={CalendarClock} title="Horario de envío" theme="blue">
            <HorarioEnvio campana={campana} />
          </DetailSheetSection>
        )}

        {/* ── Ficha ────────────────────────────────────────────────────── */}
        <DetailSheetSection icon={Mail} title="Datos de la campaña" theme="gray">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <DetailSheetInfoItem icon={Mail} theme="gray" label="Asunto" value={campana.asunto || '—'} />
            <DetailSheetInfoItem icon={Mail} theme="gray" label="Preheader" value={campana.preheader || '—'} />
            <DetailSheetInfoItem icon={Users} theme="gray" label="Lista" value={campana.lista?.nombre || '—'} />
            <DetailSheetInfoItem icon={Clock} theme="gray" label="Creada" value={fecha(campana.created_at)} />
            <DetailSheetInfoItem icon={Clock} theme="gray" label="Programada" value={fecha(campana.programada_para)} />
            <DetailSheetInfoItem icon={Clock} theme="gray" label="Completada" value={fecha(campana.completada_at)} />
          </div>
        </DetailSheetSection>
      </DetailSheetContent>
    </DetailSheetContainer>
  );
}
