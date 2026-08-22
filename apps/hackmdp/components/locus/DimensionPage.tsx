'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { type LucideIcon, Plus, Trash2, ChevronDown, Loader2, Check, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Dimension = 'movimiento' | 'mente' | 'nutricion' | 'descanso' | 'biomarkers';

export interface DimensionPageProps {
  dimension: Dimension;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

interface Registro {
  id: string;
  dimension: string;
  tipo: string;
  fecha: string;
  duracion_min: number | null;
  valor: number | null;
  unidad: string | null;
  notas: string | null;
  estado_animo: number | null;
  origen: string | null;
  analisis_id: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  dimension: string;
  titulo: string;
  descripcion: string | null;
  meta: string | null;
  estado: string;
  total_actividades: number;
}

interface Actividad {
  id: string;
  plan_id: string;
  titulo: string;
  descripcion: string | null;
  frecuencia: string;
  dias_semana: number[] | null;
  orden: number;
  registros: { fecha: string; completada: boolean; notas: string | null; valor: number | null }[];
}

interface ProgresoResponse {
  plan: Plan;
  actividades: Actividad[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#10b981';

const TIPO_PLACEHOLDERS: Record<Dimension, string> = {
  movimiento: 'ej: caminata, yoga, natacion, gym...',
  mente: 'ej: meditacion, terapia, journaling, lectura...',
  nutricion: 'ej: desayuno saludable, agua, frutas...',
  descanso: 'ej: siesta, noche completa, relajacion...',
  biomarkers: 'ej: presion, glucosa, colesterol, peso...',
};

const MOOD_EMOJIS = ['😫', '😕', '😐', '🙂', '😄'];

const UNIDAD_SUGGESTIONS: Record<string, string> = {
  presion: 'mmHg',
  glucosa: 'mg/dL',
  colesterol: 'mg/dL',
  peso: 'kg',
  temperatura: '°C',
  frecuencia: 'bpm',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed');
    return r.json();
  });

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateLabel(dateStr: string): string {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays <= 7) return 'Esta semana';
  return target.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function groupByDate(registros: Registro[]): [string, Registro[]][] {
  const groups = new Map<string, Registro[]>();
  for (const r of registros) {
    const label = dateLabel(r.fecha);
    const arr = groups.get(label);
    if (arr) arr.push(r);
    else groups.set(label, [r]);
  }
  return Array.from(groups.entries());
}

function groupByTipo(registros: Registro[]): [string, Registro[]][] {
  const groups = new Map<string, Registro[]>();
  for (const r of registros) {
    const key = r.tipo;
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }
  return Array.from(groups.entries());
}

// ---------------------------------------------------------------------------
// Glass card wrapper
// ---------------------------------------------------------------------------

function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(0,0,0,0.05)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick-add Form
// ---------------------------------------------------------------------------

function QuickAddForm({
  dimension,
  onSuccess,
}: {
  dimension: Dimension;
  onSuccess: () => void;
}) {
  const isBio = dimension === 'biomarkers';

  const [tipo, setTipo] = useState('');
  const [duracion, setDuracion] = useState('');
  const [valor, setValor] = useState('');
  const [unidad, setUnidad] = useState('');
  const [fecha, setFecha] = useState(todayStr());
  const [mood, setMood] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [showNotas, setShowNotas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-suggest unidad for biomarkers
  useEffect(() => {
    if (isBio && tipo) {
      const key = tipo.toLowerCase().trim();
      const suggestion = UNIDAD_SUGGESTIONS[key];
      if (suggestion && !unidad) setUnidad(suggestion);
    }
  }, [tipo, isBio, unidad]);

  const resetForm = useCallback(() => {
    setTipo('');
    setDuracion('');
    setValor('');
    setUnidad('');
    setFecha(todayStr());
    setMood(null);
    setNotas('');
    setShowNotas(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo.trim()) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        dimension,
        tipo: tipo.trim(),
        fecha,
      };

      if (isBio) {
        if (valor) body.valor = parseFloat(valor);
        if (unidad) body.unidad = unidad.trim();
      } else {
        if (duracion) body.duracion_min = parseInt(duracion, 10);
      }

      if (mood !== null) body.estado_animo = mood;
      if (notas.trim()) body.notas = notas.trim();

      const res = await fetch('/api/locus/vitalidad/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al guardar');
      }

      toast.success('Registro agregado');
      resetForm();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassCard className="p-5 mb-6">
      <form onSubmit={handleSubmit}>
        {/* Row 1: tipo + duracion/valor */}
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="text"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder={TIPO_PLACEHOLDERS[dimension]}
            className="flex-1 min-w-[180px] text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 placeholder:text-neutral-300 outline-none focus:border-emerald-300 transition-colors"
          />

          {isBio ? (
            <>
              <input
                type="number"
                step="any"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Valor"
                className="w-20 text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 placeholder:text-neutral-300 outline-none focus:border-emerald-300 transition-colors"
              />
              <input
                type="text"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="Unidad"
                className="w-20 text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 placeholder:text-neutral-300 outline-none focus:border-emerald-300 transition-colors"
              />
            </>
          ) : (
            <input
              type="number"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              placeholder="Min"
              min={0}
              className="w-20 text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 placeholder:text-neutral-300 outline-none focus:border-emerald-300 transition-colors"
            />
          )}
        </div>

        {/* Row 2: fecha + mood */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 outline-none focus:border-emerald-300 transition-colors"
          />

          <div className="flex items-center gap-1">
            {MOOD_EMOJIS.map((emoji, idx) => {
              const val = idx + 1;
              const selected = mood === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMood(selected ? null : val)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all duration-200"
                  style={{
                    background: selected ? `${ACCENT}18` : 'transparent',
                    border: selected ? `1.5px solid ${ACCENT}40` : '1.5px solid transparent',
                    transform: selected ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={`Estado de animo: ${val}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notas toggle */}
        {!showNotas ? (
          <button
            type="button"
            onClick={() => setShowNotas(true)}
            className="text-[12px] text-neutral-400 hover:text-neutral-500 transition-colors mb-3 flex items-center gap-1"
          >
            <ChevronDown className="w-3 h-3" />
            Agregar notas...
          </button>
        ) : (
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas sobre este registro..."
            rows={2}
            className="w-full text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 placeholder:text-neutral-300 outline-none focus:border-emerald-300 transition-colors resize-none mb-3"
          />
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !tipo.trim()}
          className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-xl text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: ACCENT }}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Agregar registro
        </button>
      </form>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function Timeline({
  dimension,
  registros,
  onDeleted,
}: {
  dimension: Dimension;
  registros: Registro[];
  onDeleted: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const isBio = dimension === 'biomarkers';

  const grouped = useMemo(
    () => (isBio ? groupByTipo(registros) : groupByDate(registros)),
    [registros, isBio],
  );

  const handleDelete = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/locus/vitalidad/registros/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Registro eliminado');
      onDeleted();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  if (registros.length === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <p className="text-neutral-400 text-[13px]">Sin registros todavia</p>
        <p className="text-neutral-300 text-[11px] mt-1">
          Usa el formulario de arriba para agregar tu primer registro
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([label, items]) => (
        <div key={label}>
          <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-2 pl-1">
            {label}
            {isBio && items.length > 0 && (
              <span className="ml-2 normal-case tracking-normal text-neutral-300">
                ultimo: {dateLabel(items[0].fecha)}
              </span>
            )}
          </p>

          {/* Biomarkers: show latest value prominently for the group */}
          {isBio && items.length > 0 && (
            <GlassCard className="p-4 mb-2">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-light text-neutral-700">
                  {items[0].valor ?? '—'}
                </span>
                {items[0].unidad && (
                  <span className="text-[12px] text-neutral-400">{items[0].unidad}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {items.map((r) => (
                  <RegistroRow
                    key={r.id}
                    registro={r}
                    isBio={isBio}
                    isConfirming={confirmId === r.id}
                    isDeleting={deletingId === r.id}
                    onDelete={() => handleDelete(r.id)}
                    onCancelConfirm={() => setConfirmId(null)}
                  />
                ))}
              </div>
            </GlassCard>
          )}

          {/* Standard (non-bio): each registro is its own row */}
          {!isBio && (
            <div className="space-y-1.5">
              {items.map((r) => (
                <GlassCard key={r.id} className="px-4 py-3">
                  <RegistroRow
                    registro={r}
                    isBio={isBio}
                    isConfirming={confirmId === r.id}
                    isDeleting={deletingId === r.id}
                    onDelete={() => handleDelete(r.id)}
                    onCancelConfirm={() => setConfirmId(null)}
                  />
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RegistroRow({
  registro: r,
  isBio,
  isConfirming,
  isDeleting,
  onDelete,
  onCancelConfirm,
}: {
  registro: Registro;
  isBio: boolean;
  isConfirming: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  onCancelConfirm: () => void;
}) {
  return (
    <div className="group flex items-center gap-2">
      {/* Tipo badge */}
      <span
        className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
        style={{ color: ACCENT, background: `${ACCENT}12` }}
      >
        {r.tipo}
      </span>

      {/* Lab origin indicator */}
      {r.origen === 'lab' && (
        <FlaskConical className="w-3 h-3 shrink-0" style={{ color: ACCENT, opacity: 0.7 }} />
      )}

      {/* Value */}
      <span className="text-[13px] text-neutral-600 shrink-0">
        {isBio ? (
          <>
            {r.valor ?? '—'}
            {r.unidad && <span className="text-neutral-400 text-[11px] ml-0.5">{r.unidad}</span>}
            <span className="text-neutral-300 text-[11px] ml-1.5">
              {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </>
        ) : r.duracion_min ? (
          `${r.duracion_min} min`
        ) : null}
      </span>

      {/* Mood */}
      {r.estado_animo && r.estado_animo >= 1 && r.estado_animo <= 5 && (
        <span className="text-sm shrink-0">{MOOD_EMOJIS[r.estado_animo - 1]}</span>
      )}

      {/* Notas */}
      {r.notas && (
        <span className="text-[12px] text-neutral-400 truncate min-w-0">
          {r.notas}
        </span>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* Delete */}
      {isConfirming ? (
        <span className="flex items-center gap-1 shrink-0">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-[11px] text-red-500 hover:text-red-600 transition-colors"
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Eliminar'}
          </button>
          <button
            onClick={onCancelConfirm}
            className="text-[11px] text-neutral-400 hover:text-neutral-500 ml-1 transition-colors"
          >
            Cancelar
          </button>
        </span>
      ) : (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-neutral-300 hover:text-red-400"
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Plan panel
// ---------------------------------------------------------------------------

function ActivePlan({
  dimension,
  plan,
  progreso,
  isLoadingProgreso,
  onCheckin,
}: {
  dimension: Dimension;
  plan: Plan | null;
  progreso: ProgresoResponse | null;
  isLoadingProgreso: boolean;
  onCheckin: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  if (!plan) {
    return (
      <GlassCard className="p-5">
        <p className="text-neutral-400 text-[13px] mb-3">Sin plan activo</p>
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: ACCENT, background: `${ACCENT}10`, border: `1px solid ${ACCENT}20` }}
          >
            Crear plan
          </button>
        ) : (
          <CreatePlanForm
            dimension={dimension}
            onCreated={onCheckin}
            onCancel={() => setShowCreate(false)}
          />
        )}
      </GlassCard>
    );
  }

  const actividades = progreso?.actividades ?? [];
  const todayIso = todayStr();
  const completedToday = actividades.filter((a) =>
    a.registros.some((r) => r.fecha === todayIso && r.completada),
  ).length;
  const total = actividades.length;
  const pct = total > 0 ? Math.round((completedToday / total) * 100) : 0;

  return (
    <GlassCard className="p-5">
      {/* Plan header */}
      <div className="mb-4">
        <h3 className="text-[14px] font-medium text-neutral-700 mb-1">
          {plan.titulo}
        </h3>
        {plan.meta && (
          <p className="text-[12px] text-neutral-400">{plan.meta}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-neutral-400">Hoy</span>
          <span className="text-[11px] font-medium" style={{ color: ACCENT }}>
            {pct}%
          </span>
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: ACCENT }}
          />
        </div>
      </div>

      {/* Activities checklist */}
      {isLoadingProgreso ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
        </div>
      ) : (
        <div className="space-y-2">
          {actividades.map((act) => (
            <ActivityCheckItem
              key={act.id}
              actividad={act}
              planId={plan.id}
              onToggled={onCheckin}
            />
          ))}
          {actividades.length === 0 && (
            <p className="text-[12px] text-neutral-300 text-center py-2">
              Sin actividades
            </p>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function ActivityCheckItem({
  actividad,
  planId,
  onToggled,
}: {
  actividad: Actividad;
  planId: string;
  onToggled: () => void;
}) {
  const [toggling, setToggling] = useState(false);

  const todayIso = todayStr();
  const todayReg = actividad.registros.find((r) => r.fecha === todayIso);
  const checked = todayReg?.completada ?? false;

  // Calculate streak: consecutive days completed
  const streak = useMemo(() => {
    const sorted = actividad.registros
      .filter((r) => r.completada)
      .map((r) => r.fecha)
      .sort()
      .reverse();
    if (sorted.length === 0) return 0;
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < sorted.length; i++) {
      const d = new Date(sorted[i] + 'T00:00:00');
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (d.getTime() === expected.getTime()) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [actividad.registros]);

  const toggle = async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/locus/vitalidad/planes/${planId}/registros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actividad_id: actividad.id,
          fecha: todayIso,
          completada: !checked,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      onToggled();
    } catch {
      toast.error('Error al registrar');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={toggle}
        disabled={toggling}
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200"
        style={{
          background: checked ? ACCENT : 'rgba(255,255,255,0.6)',
          border: checked ? `1.5px solid ${ACCENT}` : '1.5px solid rgba(0,0,0,0.12)',
        }}
      >
        {toggling ? (
          <Loader2 className="w-3 h-3 animate-spin text-white" />
        ) : checked ? (
          <Check className="w-3 h-3 text-white" />
        ) : null}
      </button>
      <span
        className={`text-[13px] flex-1 min-w-0 truncate ${
          checked ? 'text-neutral-400 line-through' : 'text-neutral-600'
        }`}
      >
        {actividad.titulo}
      </span>
      {streak > 0 && (
        <span
          className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ color: ACCENT, background: `${ACCENT}12` }}
        >
          {streak}d
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Plan inline form
// ---------------------------------------------------------------------------

function CreatePlanForm({
  dimension,
  onCreated,
  onCancel,
}: {
  dimension: Dimension;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [meta, setMeta] = useState('');
  const [actividadesText, setActividadesText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setSubmitting(true);
    try {
      const actividades = actividadesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((titulo) => ({ titulo, frecuencia: 'diaria' }));

      const res = await fetch('/api/locus/vitalidad/planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimension,
          titulo: titulo.trim(),
          meta: meta.trim() || null,
          actividades: actividades.length > 0 ? actividades : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al crear plan');
      }

      toast.success('Plan creado');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 mt-2">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Nombre del plan"
        className="w-full text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 placeholder:text-neutral-300 outline-none focus:border-emerald-300 transition-colors"
        autoFocus
      />
      <input
        type="text"
        value={meta}
        onChange={(e) => setMeta(e.target.value)}
        placeholder="Meta (opcional)"
        className="w-full text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 placeholder:text-neutral-300 outline-none focus:border-emerald-300 transition-colors"
      />
      <textarea
        value={actividadesText}
        onChange={(e) => setActividadesText(e.target.value)}
        placeholder="Actividades (una por linea)"
        rows={3}
        className="w-full text-[13px] bg-white/60 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 placeholder:text-neutral-300 outline-none focus:border-emerald-300 transition-colors resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !titulo.trim()}
          className="text-[12px] font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-40"
          style={{ background: ACCENT }}
        >
          {submitting ? 'Creando...' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] text-neutral-400 hover:text-neutral-500 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DimensionPage({
  dimension,
  title,
  subtitle,
  icon: Icon,
}: DimensionPageProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // SWR keys
  const registrosKey = `/api/locus/vitalidad/registros?dimension=${dimension}&limit=50`;
  const planesKey = `/api/locus/vitalidad/planes?dimension=${dimension}&estado=activo`;

  const {
    data: registros,
    error: registrosError,
    isLoading: registrosLoading,
  } = useSWR<Registro[]>(registrosKey, fetcher, { dedupingInterval: 30_000 });

  const { data: planes } = useSWR<Plan[]>(planesKey, fetcher, {
    dedupingInterval: 30_000,
  });

  const activePlan = planes && planes.length > 0 ? planes[0] : null;

  const progresoKey = activePlan
    ? `/api/locus/vitalidad/planes/${activePlan.id}/progreso`
    : null;

  const { data: progreso, isLoading: progresoLoading } =
    useSWR<ProgresoResponse>(progresoKey, fetcher, { dedupingInterval: 30_000 });

  const mutateAll = useCallback(() => {
    mutate(registrosKey);
    mutate(planesKey);
    if (progresoKey) mutate(progresoKey);
  }, [registrosKey, planesKey, progresoKey]);

  const mutatePlans = useCallback(() => {
    mutate(planesKey);
    // After creating a plan, revalidate progreso too (key might change)
    if (progresoKey) mutate(progresoKey);
    // Force SWR to revalidate the planes key which may create a new progreso key
    setTimeout(() => mutate(planesKey), 500);
  }, [planesKey, progresoKey]);

  return (
    <div
      className="relative flex-1 w-full overflow-hidden"
      style={{ minHeight: 'calc(100vh - 64px)' }}
    >
      {/* Aurora gradient washes */}
      <div className="absolute inset-0">
        <div
          className="absolute"
          style={{
            width: '150%',
            height: '150%',
            top: '-25%',
            left: '-25%',
            background:
              'radial-gradient(ellipse 50% 40% at 20% 30%, rgba(16,185,129,0.14) 0%, transparent 70%)',
            animation: 'dpAurora1 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: '150%',
            height: '150%',
            top: '-25%',
            left: '-25%',
            background:
              'radial-gradient(ellipse 45% 35% at 75% 60%, rgba(59,130,246,0.11) 0%, transparent 65%)',
            animation: 'dpAurora2 17s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: '130%',
            height: '130%',
            top: '-15%',
            left: '-15%',
            background:
              'radial-gradient(ellipse 40% 30% at 50% 80%, rgba(168,85,247,0.08) 0%, transparent 60%)',
            animation: 'dpAurora3 20s ease-in-out infinite',
          }}
        />
      </div>

      {/* Geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute"
          style={{
            width: '600px',
            height: '600px',
            top: '-180px',
            right: '-120px',
            border: '1px solid rgba(0,0,0,0.03)',
            borderRadius: '50%',
            animation: 'dpGeoRotate 60s linear infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: '400px',
            height: '400px',
            bottom: '-150px',
            left: '-100px',
            border: '1px solid rgba(0,0,0,0.025)',
            borderRadius: '50%',
            animation: 'dpGeoRotate 45s linear infinite reverse',
          }}
        />
      </div>

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-[800px] mx-auto px-6 py-10"
        style={{
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: mounted ? 1 : 0,
          transform: `translateY(${mounted ? 0 : 12}px)`,
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: `${ACCENT}14`,
              border: `1px solid ${ACCENT}20`,
            }}
          >
            <Icon className="w-6 h-6" style={{ color: ACCENT }} />
          </div>
          <h1
            className="text-[1.8rem] font-light tracking-[0.3em] text-neutral-700 mb-3"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {title}
          </h1>
          <div className="w-8 h-px bg-neutral-200 mx-auto mb-4" />
          <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">
            {subtitle}
          </p>
        </div>

        {/* Quick-add form */}
        <QuickAddForm
          dimension={dimension}
          onSuccess={() => mutate(registrosKey)}
        />

        {/* Main content: two columns on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Timeline — 3/5 on lg */}
          <div className="lg:col-span-3">
            <h2 className="text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-3 pl-1">
              {dimension === 'biomarkers' ? 'Metricas' : 'Registros'}
            </h2>
            {registrosLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
              </div>
            ) : registrosError ? (
              <GlassCard className="p-5 text-center">
                <p className="text-red-400 text-[13px]">Error al cargar registros</p>
              </GlassCard>
            ) : (
              <Timeline
                dimension={dimension}
                registros={registros ?? []}
                onDeleted={() => mutate(registrosKey)}
              />
            )}
          </div>

          {/* Active Plan — 2/5 on lg */}
          <div className="lg:col-span-2">
            <h2 className="text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-3 pl-1">
              Plan activo
            </h2>
            <ActivePlan
              dimension={dimension}
              plan={activePlan}
              progreso={progreso ?? null}
              isLoadingProgreso={progresoLoading}
              onCheckin={mutatePlans}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes dpAurora1 {
          0%,
          100% {
            transform: translate(0%, 0%) rotate(0deg);
          }
          33% {
            transform: translate(5%, -3%) rotate(2deg);
          }
          66% {
            transform: translate(-3%, 4%) rotate(-1deg);
          }
        }
        @keyframes dpAurora2 {
          0%,
          100% {
            transform: translate(0%, 0%) rotate(0deg);
          }
          33% {
            transform: translate(-4%, 5%) rotate(-2deg);
          }
          66% {
            transform: translate(6%, -2%) rotate(1deg);
          }
        }
        @keyframes dpAurora3 {
          0%,
          100% {
            transform: translate(0%, 0%);
          }
          50% {
            transform: translate(3%, -3%);
          }
        }
        @keyframes dpGeoRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
