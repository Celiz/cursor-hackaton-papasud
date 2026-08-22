"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Plus, Trash2, EyeOff, RotateCcw, Check, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CRM_FUENTES, FUENTE_ICON_MAP, FUENTE_ICON_NAMES, buildFuenteConfig,
  type FuenteLeadCustom,
} from "@/lib/crm-fuentes-config";
import {
  CRM_ACTIVIDAD_TIPOS, COLOR_CLASSES, ACTIVIDAD_COLORS, ICON_MAP,
  ACTIVIDAD_ICONS as ACTIVIDAD_ICON_NAMES, buildTipoConfig,
  type TipoActividadCustom, type ActividadTipoConfig,
} from "@/lib/crm-actividades-config";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Error al cargar");
    return r.json();
  });

interface RowItem {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  builtin: boolean;
}

function Fila({
  item,
  onAccion,
  accionIcon: AccionIcon,
  accionTitle,
}: {
  item: RowItem;
  onAccion: (id: string) => void;
  accionIcon: React.ComponentType<{ className?: string }>;
  accionTitle: string;
}) {
  const { Icon } = item;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{item.label}</span>
        {item.builtin && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5">
            predeterminado
          </span>
        )}
      </div>
      <button
        type="button"
        title={accionTitle}
        onClick={() => onAccion(item.id)}
        className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        <AccionIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CrmConfigClient() {
  const fuentes = useSWR<{ custom: FuenteLeadCustom[]; ocultas: string[] }>("/api/crm/fuentes-lead", fetcher);
  const tipos = useSWR<{ custom: TipoActividadCustom[]; ocultos: string[] }>("/api/crm/actividad-tipos", fetcher);

  const [fForm, setFForm] = useState({ open: false, label: "", icon: "Building2", saving: false });
  const [tForm, setTForm] = useState({ open: false, label: "", color: "blue", icon: "Tag", saving: false });

  const fCustom = fuentes.data?.custom ?? [];
  const fOcultas = new Set(fuentes.data?.ocultas ?? []);
  const fuentesVisibles: RowItem[] = [
    ...CRM_FUENTES.filter((f) => !fOcultas.has(f.id)).map((f) => ({ id: f.id, label: f.label, Icon: f.icon, builtin: true })),
    ...fCustom.map((c) => { const cfg = buildFuenteConfig(c); return { id: c.id, label: c.label, Icon: cfg.icon, builtin: false }; }),
  ];
  const fuentesOcultas: RowItem[] = CRM_FUENTES.filter((f) => fOcultas.has(f.id)).map((f) => ({ id: f.id, label: f.label, Icon: f.icon, builtin: true }));

  const tCustom = tipos.data?.custom ?? [];
  const tOcultos = new Set(tipos.data?.ocultos ?? []);
  const tipoToRow = (c: ActividadTipoConfig, builtin: boolean): RowItem => ({ id: c.id, label: c.label, Icon: c.icon, builtin });
  const tiposVisibles: RowItem[] = [
    ...CRM_ACTIVIDAD_TIPOS.filter((t) => !tOcultos.has(t.id)).map((t) => tipoToRow(t, true)),
    ...tCustom.map((c) => tipoToRow(buildTipoConfig(c), false)),
  ];
  const tiposOcultos: RowItem[] = CRM_ACTIVIDAD_TIPOS.filter((t) => tOcultos.has(t.id)).map((t) => tipoToRow(t, true));

  const accion = async (url: string, method: string, body?: unknown, ok?: string) => {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Error");
      if (ok) toast.success(ok);
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Error");
      return false;
    }
  };

  const fEliminar = async (id: string) => { if (await accion(`/api/crm/fuentes-lead?id=${encodeURIComponent(id)}`, "DELETE", undefined, "Fuente quitada")) fuentes.mutate(); };
  const fRestaurar = async (id: string) => { if (await accion(`/api/crm/fuentes-lead`, "PATCH", { id, accion: "restaurar" }, "Fuente restaurada")) fuentes.mutate(); };
  const fAgregar = async () => {
    if (!fForm.label.trim()) return;
    setFForm((s) => ({ ...s, saving: true }));
    const okk = await accion(`/api/crm/fuentes-lead`, "POST", { label: fForm.label.trim(), icon: fForm.icon }, "Fuente agregada");
    setFForm((s) => ({ ...s, saving: false }));
    if (okk) { setFForm({ open: false, label: "", icon: "Building2", saving: false }); fuentes.mutate(); }
  };

  const tEliminar = async (id: string) => { if (await accion(`/api/crm/actividad-tipos?id=${encodeURIComponent(id)}`, "DELETE", undefined, "Tipo quitado")) tipos.mutate(); };
  const tRestaurar = async (id: string) => { if (await accion(`/api/crm/actividad-tipos`, "PATCH", { id, accion: "restaurar" }, "Tipo restaurado")) tipos.mutate(); };
  const tAgregar = async () => {
    if (!tForm.label.trim()) return;
    setTForm((s) => ({ ...s, saving: true }));
    const okk = await accion(`/api/crm/actividad-tipos`, "POST", { label: tForm.label.trim(), color: tForm.color, icon: tForm.icon }, "Tipo agregado");
    setTForm((s) => ({ ...s, saving: false }));
    if (okk) { setTForm({ open: false, label: "", color: "blue", icon: "Tag", saving: false }); tipos.mutate(); }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuracion/modulos" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
          <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CRM</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Administrá las fuentes de lead y los tipos de actividad</p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Fuentes de lead</h2>
          <Button type="default" size="tiny" icon={<Plus />} onClick={() => setFForm((s) => ({ ...s, open: !s.open }))}>Agregar</Button>
        </div>

        {fForm.open && (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input value={fForm.label} onChange={(e) => setFForm({ ...fForm, label: e.target.value })} placeholder="Ej: Licitaciones" className="mt-1 h-9" maxLength={40} />
            </div>
            <div>
              <Label className="text-xs">Ícono</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {FUENTE_ICON_NAMES.map((name) => {
                  const Ico = FUENTE_ICON_MAP[name];
                  const active = fForm.icon === name;
                  return (
                    <button key={name} type="button" onClick={() => setFForm({ ...fForm, icon: name })} title={name}
                      className={cn("h-8 w-8 rounded-lg border flex items-center justify-center transition-all",
                        active ? "bg-gray-900 text-white border-transparent dark:bg-white dark:text-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800")}>
                      <Ico className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="outline" size="tiny" onClick={() => setFForm({ open: false, label: "", icon: "Building2", saving: false })}>Cancelar</Button>
              <Button type="primary" size="tiny" loading={fForm.saving} disabled={!fForm.label.trim()} onClick={fAgregar}>Agregar</Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {fuentes.isLoading ? (
            <p className="text-sm text-muted-foreground py-2">Cargando…</p>
          ) : (
            fuentesVisibles.map((it) => (
              <Fila key={it.id} item={it} onAccion={fEliminar} accionIcon={it.builtin ? EyeOff : Trash2} accionTitle={it.builtin ? "Ocultar" : "Eliminar"} />
            ))
          )}
        </div>

        {fuentesOcultas.length > 0 && (
          <details className="pt-1">
            <summary className="text-xs text-muted-foreground cursor-pointer select-none">Ocultas ({fuentesOcultas.length})</summary>
            <div className="mt-2 space-y-1.5">
              {fuentesOcultas.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2 opacity-70">
                  <div className="flex items-center gap-2 min-w-0">
                    <it.Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{it.label}</span>
                  </div>
                  <button type="button" title="Restaurar" onClick={() => fRestaurar(it.id)} className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Tipos de actividad</h2>
          <Button type="default" size="tiny" icon={<Plus />} onClick={() => setTForm((s) => ({ ...s, open: !s.open }))}>Agregar</Button>
        </div>

        {tForm.open && (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input value={tForm.label} onChange={(e) => setTForm({ ...tForm, label: e.target.value })} placeholder="Ej: Demo de equipo" className="mt-1 h-9" maxLength={40} />
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ACTIVIDAD_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setTForm({ ...tForm, color: c })} title={c}
                    className={cn("h-7 w-7 rounded-full transition-all flex items-center justify-center", COLOR_CLASSES[c].bgActive,
                      tForm.color === c ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900" : "")}>
                    {tForm.color === c && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Ícono</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ACTIVIDAD_ICON_NAMES.map((name) => {
                  const Ico = ICON_MAP[name];
                  const active = tForm.icon === name;
                  return (
                    <button key={name} type="button" onClick={() => setTForm({ ...tForm, icon: name })} title={name}
                      className={cn("h-8 w-8 rounded-lg border flex items-center justify-center transition-all",
                        active ? "bg-gray-900 text-white border-transparent dark:bg-white dark:text-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800")}>
                      <Ico className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="outline" size="tiny" onClick={() => setTForm({ open: false, label: "", color: "blue", icon: "Tag", saving: false })}>Cancelar</Button>
              <Button type="primary" size="tiny" loading={tForm.saving} disabled={!tForm.label.trim()} onClick={tAgregar}>Agregar</Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {tipos.isLoading ? (
            <p className="text-sm text-muted-foreground py-2">Cargando…</p>
          ) : (
            tiposVisibles.map((it) => (
              <Fila key={it.id} item={it} onAccion={tEliminar} accionIcon={it.builtin ? EyeOff : Trash2} accionTitle={it.builtin ? "Ocultar" : "Eliminar"} />
            ))
          )}
        </div>

        {tiposOcultos.length > 0 && (
          <details className="pt-1">
            <summary className="text-xs text-muted-foreground cursor-pointer select-none">Ocultos ({tiposOcultos.length})</summary>
            <div className="mt-2 space-y-1.5">
              {tiposOcultos.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2 opacity-70">
                  <div className="flex items-center gap-2 min-w-0">
                    <it.Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{it.label}</span>
                  </div>
                  <button type="button" title="Restaurar" onClick={() => tRestaurar(it.id)} className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
