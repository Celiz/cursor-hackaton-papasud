"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { searchClientes } from "@/hooks/use-client-search";
import { searchPersonas } from "@/hooks/use-persona-search";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OportunidadVenta } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { safeFormat } from "@/lib/safe-date";
import {
  Building,
  Users,
  Calendar,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MessageSquare,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Flame,
  Check,
  X,
  GripVertical,
  FileText,
  Target,
  Sparkles,
  Star,
  Tag,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

export interface TeamMember {
  id: string;
  nombre: string;
  email: string;
  avatar?: string;
}

export interface ActividadResumen {
  vencidas: number;
  total: number;
  proxima_fecha: string;
}

interface KanbanPipelineCardProps {
  oportunidad: OportunidadVenta;
  onViewDetails: (op: OportunidadVenta) => void;
  onEdit: (op: OportunidadVenta) => void;
  onDelete: (op: OportunidadVenta) => void;
  onQuickUpdate: (id: string, data: Partial<OportunidadVenta>) => Promise<void>;
  onQuickAction: (op: OportunidadVenta, action: "call" | "email" | "note") => void;
  isDragging?: boolean;
  /** Días para considerar "deal rotting" */
  rottingThreshold?: number;
  teamMembers?: TeamMember[];
  actividadResumen?: ActividadResumen;
}

interface InlineEntitySearchProps {
  value: string;
  onChange: (v: string) => void;
  onPickExisting: (id: string, label: string) => void;
  onCommitFreeText: (text: string) => void;
  onCancel: () => void;
  searchFn: (q: string) => Promise<Array<{ value: string; label: string; secondaryLabel?: string }>>;
  placeholder: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

function InlineEntitySearch({
  value,
  onChange,
  onPickExisting,
  onCommitFreeText,
  onCancel,
  searchFn,
  placeholder,
  icon,
  disabled,
}: InlineEntitySearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<Array<{ value: string; label: string; secondaryLabel?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!value.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const r = await searchFn(value);
        setResults(r.slice(0, 5));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [value, searchFn]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) onCancel();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onCancel]);

  const exactMatch = results.find(r => r.label.toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        {icon}
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setActiveIdx(-1); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); return; }
            if (e.key === "Enter") {
              e.preventDefault();
              if (activeIdx >= 0 && results[activeIdx]) {
                onPickExisting(results[activeIdx].value, results[activeIdx].label);
              } else if (exactMatch) {
                onPickExisting(exactMatch.value, exactMatch.label);
              } else {
                onCommitFreeText(value.trim());
              }
            }
          }}
          className="h-6 text-xs px-1 flex-1"
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
      {value.trim() && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          {loading && (
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">Buscando...</div>
          )}
          {!loading && results.map((r, idx) => (
            <button
              key={r.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPickExisting(r.value, r.label); }}
              className={cn(
                "w-full text-left px-2 py-1.5 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 flex flex-col",
                activeIdx === idx && "bg-purple-50 dark:bg-purple-900/20"
              )}
            >
              <span className="font-medium truncate">{r.label}</span>
              {r.secondaryLabel && <span className="text-[10px] text-muted-foreground truncate">{r.secondaryLabel}</span>}
            </button>
          ))}
          {!loading && !exactMatch && value.trim() && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onCommitFreeText(value.trim()); }}
              className="w-full text-left px-2 py-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-t border-gray-100 dark:border-gray-800"
            >
              Usar «{value.trim()}» como texto libre
            </button>
          )}
          {!loading && results.length === 0 && !value.trim() && (
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">Escribí para buscar</div>
          )}
        </div>
      )}
    </div>
  );
}

export function KanbanPipelineCard({
  oportunidad,
  onViewDetails,
  onEdit,
  onDelete,
  onQuickUpdate,
  onQuickAction,
  isDragging = false,
  rottingThreshold = 7,
  teamMembers = [],
  actividadResumen,
}: KanbanPipelineCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingMonto, setIsEditingMonto] = useState(false);
  const [editMonto, setEditMonto] = useState(String(oportunidad.monto_estimado || 0));
  const [isSaving, setIsSaving] = useState(false);
  const [seguimientoOpen, setSeguimientoOpen] = useState(false);
  const [isEditingContacto, setIsEditingContacto] = useState(false);
  const [editContacto, setEditContacto] = useState(oportunidad.contacto_nombre || "");
  const [isEditingEmpresa, setIsEditingEmpresa] = useState(false);
  const [editEmpresa, setEditEmpresa] = useState(oportunidad.empresa_nombre || "");
  const [isAddingNota, setIsAddingNota] = useState(false);
  const [notaText, setNotaText] = useState("");

  const montoInputRef = useRef<HTMLInputElement>(null);
  const contactoInputRef = useRef<HTMLInputElement>(null);
  const empresaInputRef = useRef<HTMLInputElement>(null);

  // dnd-kit sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: oportunidad.id,
    data: {
      type: "oportunidad",
      oportunidad,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const diasEnEtapa = oportunidad.dias_en_etapa || 0;
  const isRotting = diasEnEtapa >= rottingThreshold;
  const isHot = (oportunidad.probabilidad_cierre || 0) >= 75;
  const isWarm = (oportunidad.probabilidad_cierre || 0) >= 50 && !isHot;

  // Calcular días hasta cierre
  const diasHastaCierre = oportunidad.fecha_estimada_cierre
    ? differenceInDays(parseISO(oportunidad.fecha_estimada_cierre), new Date())
    : null;
  const isOverdue = diasHastaCierre !== null && diasHastaCierre < 0;

  const getProbabilidadColor = (prob: number) => {
    if (prob >= 75) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50";
    if (prob >= 50) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50";
    if (prob >= 25) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50";
    return "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50";
  };

  const getRottingIntensity = (days: number) => {
    if (days >= 21) return "ring-2 ring-red-500/50 border-red-400 dark:border-red-600";
    if (days >= 14) return "ring-2 ring-orange-500/40 border-orange-400 dark:border-orange-600";
    if (days >= 7) return "ring-1 ring-amber-500/30 border-amber-400 dark:border-amber-600";
    return "";
  };

  // Inline editing handlers
  const handleSaveMonto = useCallback(async () => {
    const newMonto = parseFloat(editMonto);
    if (isNaN(newMonto) || newMonto < 0) {
      toast.error("Monto inválido");
      setEditMonto(String(oportunidad.monto_estimado || 0));
      setIsEditingMonto(false);
      return;
    }

    setIsSaving(true);
    try {
      await onQuickUpdate(oportunidad.id, { monto_estimado: newMonto });
      toast.success("Monto actualizado");
    } catch (error) {
      setEditMonto(String(oportunidad.monto_estimado || 0));
    } finally {
      setIsSaving(false);
      setIsEditingMonto(false);
    }
  }, [editMonto, oportunidad.id, oportunidad.monto_estimado, onQuickUpdate]);

  const handleSaveEmpresa = useCallback(async () => {
    const trimmed = editEmpresa.trim();
    if (trimmed === (oportunidad.empresa_nombre || "")) {
      setIsEditingEmpresa(false);
      return;
    }
    setIsSaving(true);
    try {
      await onQuickUpdate(oportunidad.id, { empresa_nombre: trimmed || null } as any);
      toast.success("Empresa actualizada");
    } catch {
      setEditEmpresa(oportunidad.empresa_nombre || "");
    } finally {
      setIsSaving(false);
      setIsEditingEmpresa(false);
    }
  }, [editEmpresa, oportunidad.id, oportunidad.empresa_nombre, onQuickUpdate]);

  const handleSaveContacto = useCallback(async () => {
    const trimmed = editContacto.trim();
    if (trimmed === (oportunidad.contacto_nombre || "")) {
      setIsEditingContacto(false);
      return;
    }
    setIsSaving(true);
    try {
      await onQuickUpdate(oportunidad.id, { contacto_nombre: trimmed || null } as any);
      toast.success("Contacto actualizado");
    } catch {
      setEditContacto(oportunidad.contacto_nombre || "");
    } finally {
      setIsSaving(false);
      setIsEditingContacto(false);
    }
  }, [editContacto, oportunidad.id, oportunidad.contacto_nombre, onQuickUpdate]);

  const handleSaveNota = useCallback(async () => {
    const trimmed = notaText.trim();
    if (!trimmed) {
      setIsAddingNota(false);
      return;
    }
    setIsSaving(true);
    try {
      await fetch("/api/oportunidades-actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oportunidad_id: oportunidad.id,
          tipo: "nota",
          titulo: "Nota agregada",
          descripcion: trimmed,
        }),
      });
      toast.success("Nota guardada");
      setNotaText("");
      setIsAddingNota(false);
    } catch {
      toast.error("Error al guardar nota");
    } finally {
      setIsSaving(false);
    }
  }, [notaText, oportunidad.id]);

  const handleToggleSeguimiento = useCallback(async (memberId: string) => {
    const currentIds = (oportunidad.usuarios_asignados || []).map(u => u.id);
    const newIds = currentIds.includes(memberId)
      ? currentIds.filter(id => id !== memberId)
      : [...currentIds, memberId];
    setIsSaving(true);
    try {
      await onQuickUpdate(oportunidad.id, { asignados_ids: newIds } as any);
      toast.success(newIds.length > currentIds.length ? "Seguimiento asignado" : "Seguimiento removido");
    } catch {
      // onQuickUpdate already handles errors
    } finally {
      setIsSaving(false);
    }
  }, [oportunidad.id, oportunidad.usuarios_asignados, onQuickUpdate]);

  const handleClearSeguimiento = useCallback(async () => {
    setSeguimientoOpen(false);
    setIsSaving(true);
    try {
      await onQuickUpdate(oportunidad.id, { asignados_ids: [] } as any);
      toast.success("Seguimiento removido");
    } catch {
      // onQuickUpdate already handles errors
    } finally {
      setIsSaving(false);
    }
  }, [oportunidad.id, onQuickUpdate]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpanded(false);
      }}
      className="relative"
    >
      <Card
        onClick={() => onViewDetails(oportunidad)}
        className={cn(
          "group relative cursor-pointer",
          "bg-white dark:bg-zinc-900",
          "hover:shadow-md",
          isSortableDragging && "opacity-50 shadow-2xl z-50",
          isRotting && getRottingIntensity(diasEnEtapa),
          isHot && !isRotting && "border-emerald-300 dark:border-emerald-700",
        )}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center",
            "cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "bg-gradient-to-r from-zinc-100 dark:from-zinc-800 to-transparent",
            "rounded-l-lg"
          )}
        >
          <GripVertical className="h-4 w-4 text-zinc-400" />
        </div>

        <CardContent className="p-3 pl-4">
          {/* Status Indicators Row */}
          <div className="flex items-center gap-1.5 mb-2">
            {isHot && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded">
                    <Flame className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Oportunidad caliente ({oportunidad.probabilidad_cierre}%)</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isWarm && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-1 bg-amber-100 dark:bg-amber-900/50 rounded">
                    <Target className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>En negociación activa</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isRotting && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-1 bg-red-100 dark:bg-red-900/50 rounded">
                    <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold text-red-600">Deal estancado</p>
                  <p className="text-xs">{diasEnEtapa} días sin movimiento</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isOverdue && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-1 bg-rose-100 dark:bg-rose-900/50 rounded">
                    <Clock className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-rose-600">Vencida hace {Math.abs(diasHastaCierre!)} días</p>
                </TooltipContent>
              </Tooltip>
            )}
            {(oportunidad as any).tiene_conflictos_equipos && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-1 bg-amber-100 dark:bg-amber-900/50 rounded">
                    <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold text-amber-400 dark:text-amber-600">Equipo compartido</p>
                  <p className="text-xs">Un equipo de esta oportunidad también está en otra abierta</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="text"
                  size="tiny"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    isHovered && "opacity-100"
                  )}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => onViewDetails(oportunidad)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(oportunidad)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar completo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onQuickAction(oportunidad, "call")}>
                  <Phone className="h-4 w-4 mr-2" />
                  Registrar llamada
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onQuickAction(oportunidad, "email")}>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onQuickAction(oportunidad, "note")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Agregar nota
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(oportunidad)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancelar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <Tooltip>
            <TooltipTrigger asChild>
              <h4
                className="font-semibold text-sm line-clamp-2 mb-2"
              >
                {oportunidad.nombre}
              </h4>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-semibold">{oportunidad.nombre}</p>
              {oportunidad.descripcion && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                  {oportunidad.descripcion}
                </p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Prioridad + Tags row */}
          {((oportunidad.prioridad && oportunidad.prioridad !== 'normal') ||
            (oportunidad.etiquetas && oportunidad.etiquetas.length > 0)) && (
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {/* Prioridad indicator */}
              {oportunidad.prioridad && oportunidad.prioridad !== 'normal' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                      oportunidad.prioridad === 'urgente' && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
                      oportunidad.prioridad === 'alta' && "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
                      oportunidad.prioridad === 'baja' && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      <Star className={cn(
                        "h-2.5 w-2.5",
                        oportunidad.prioridad === 'urgente' && "fill-red-500",
                        oportunidad.prioridad === 'alta' && "fill-orange-500"
                      )} />
                      {oportunidad.prioridad === 'urgente' ? 'Urgente' :
                       oportunidad.prioridad === 'alta' ? 'Alta' : 'Baja'}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Prioridad: {oportunidad.prioridad}</TooltipContent>
                </Tooltip>
              )}

              {/* Tags/Etiquetas */}
              {oportunidad.etiquetas && oportunidad.etiquetas.slice(0, 2).map((tag, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px]">
                      <Tag className="h-2 w-2" />
                      {tag.length > 12 ? tag.slice(0, 12) + '...' : tag}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{tag}</TooltipContent>
                </Tooltip>
              ))}
              {oportunidad.etiquetas && oportunidad.etiquetas.length > 2 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground">
                      +{oportunidad.etiquetas.length - 2}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {oportunidad.etiquetas.slice(2).join(', ')}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Laboratorio/Empresa - Inline Editable */}
          <div onClick={(e) => e.stopPropagation()} className="mb-1.5">
            {isEditingEmpresa ? (
              <InlineEntitySearch
                value={editEmpresa}
                onChange={setEditEmpresa}
                searchFn={searchClientes}
                placeholder="Buscar o escribir empresa"
                icon={<Building className="h-3 w-3 shrink-0 text-muted-foreground" />}
                disabled={isSaving}
                onPickExisting={async (id) => {
                  setIsEditingEmpresa(false);
                  await onQuickUpdate(oportunidad.id, { cliente_id: id, empresa_nombre: null } as any);
                }}
                onCommitFreeText={async (text) => {
                  setIsEditingEmpresa(false);
                  await onQuickUpdate(oportunidad.id, { empresa_nombre: text || null, cliente_id: null } as any);
                }}
                onCancel={() => {
                  setEditEmpresa(oportunidad.empresa_nombre || "");
                  setIsEditingEmpresa(false);
                }}
              />
            ) : (
              <div
                onClick={() => {
                  if (!oportunidad.cliente_id) {
                    setEditEmpresa(oportunidad.empresa_nombre || "");
                    setIsEditingEmpresa(true);
                    setTimeout(() => empresaInputRef.current?.select(), 50);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 text-xs rounded px-1 -mx-1 py-0.5 transition-colors",
                  oportunidad.cliente_id
                    ? "text-muted-foreground cursor-default"
                    : "text-muted-foreground cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30",
                  !oportunidad.cliente_id && !oportunidad.empresa_nombre && "text-muted-foreground/50"
                )}
              >
                <Building className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {oportunidad.cliente?.nombre ||
                   oportunidad.cliente?.nombre_fantasia ||
                   oportunidad.empresa_nombre || "Sin empresa"}
                </span>
              </div>
            )}
          </div>

          {/* Contacto - Inline Editable */}
          <div onClick={(e) => e.stopPropagation()} className="mb-2">
            {isEditingContacto ? (
              <InlineEntitySearch
                value={editContacto}
                onChange={setEditContacto}
                searchFn={searchPersonas}
                placeholder="Buscar o escribir contacto"
                icon={<Users className="h-3 w-3 shrink-0 text-muted-foreground" />}
                disabled={isSaving}
                onPickExisting={async (id) => {
                  setIsEditingContacto(false);
                  await onQuickUpdate(oportunidad.id, { persona_id: id, contacto_nombre: null } as any);
                }}
                onCommitFreeText={async (text) => {
                  setIsEditingContacto(false);
                  await onQuickUpdate(oportunidad.id, { contacto_nombre: text || null, persona_id: null } as any);
                }}
                onCancel={() => {
                  setEditContacto(oportunidad.contacto_nombre || "");
                  setIsEditingContacto(false);
                }}
              />
            ) : (
              <div
                onClick={() => {
                  if (!(oportunidad as any).persona) {
                    setEditContacto(oportunidad.contacto_nombre || "");
                    setIsEditingContacto(true);
                    setTimeout(() => contactoInputRef.current?.select(), 50);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 text-xs rounded px-1 -mx-1 py-0.5 transition-colors",
                  (oportunidad as any).persona
                    ? "text-muted-foreground cursor-default"
                    : "text-muted-foreground cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30",
                  !(oportunidad as any).persona && !oportunidad.contacto_nombre && "text-muted-foreground/50"
                )}
              >
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {(oportunidad as any).persona?.nombre_completo || oportunidad.contacto_nombre || "Sin contacto"}
                </span>
                {(oportunidad as any).persona && (
                  <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" title="Vinculado" />
                )}
              </div>
            )}
          </div>

          {/* Seguimiento (usuarios asignados) - Multi-select */}
          <Popover open={seguimientoOpen} onOpenChange={setSeguimientoOpen}>
            <PopoverTrigger asChild>
              <div
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex items-center gap-1.5 text-xs mb-2 cursor-pointer rounded px-1 -mx-1 py-0.5 transition-colors",
                  (oportunidad.usuarios_asignados?.length || 0) > 0
                    ? "text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    : "text-muted-foreground/50 hover:bg-muted/50 hover:text-muted-foreground"
                )}
              >
                <Users className="h-3 w-3 shrink-0 text-amber-500" />
                <span className="truncate">
                  {(oportunidad.usuarios_asignados?.length || 0) > 0
                    ? oportunidad.usuarios_asignados!.map(u => u.nombre_completo?.split(' ')[0]).join(', ')
                    : "Sin asignar"}
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-48 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-0.5">
                {teamMembers.map((member) => {
                  const isAssigned = (oportunidad.usuarios_asignados || []).some(u => u.id === member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleToggleSeguimiento(member.id)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition-colors hover:bg-muted",
                        isAssigned && "bg-amber-50 dark:bg-amber-950/30 font-medium"
                      )}
                    >
                      <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                        {isAssigned ? <Check className="h-3 w-3" /> : member.nombre[0]?.toUpperCase()}
                      </div>
                      {member.nombre}
                    </button>
                  );
                })}
                {(oportunidad.usuarios_asignados?.length || 0) > 0 && (
                  <>
                    <div className="border-t my-1" />
                    <button
                      onClick={handleClearSeguimiento}
                      className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs text-left text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Quitar todos
                    </button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Monto - Inline Editable */}
          <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between border-t pt-2 mt-2">
            {isEditingMonto ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">$</span>
                <Input
                  ref={montoInputRef}
                  type="number"
                  value={editMonto}
                  onChange={(e) => setEditMonto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveMonto();
                    if (e.key === "Escape") {
                      setEditMonto(String(oportunidad.monto_estimado || 0));
                      setIsEditingMonto(false);
                    }
                  }}
                  onBlur={handleSaveMonto}
                  className="h-6 w-24 text-xs px-1"
                  autoFocus
                  disabled={isSaving}
                />
                <Button
                  type="text"
                  size="tiny"
                  className="h-5 w-5 p-0"
                  onClick={handleSaveMonto}
                  disabled={isSaving}
                >
                  <Check className="h-3 w-3 text-emerald-600" />
                </Button>
                <Button
                  type="text"
                  size="tiny"
                  className="h-5 w-5 p-0"
                  onClick={() => {
                    setEditMonto(String(oportunidad.monto_estimado || 0));
                    setIsEditingMonto(false);
                  }}
                  disabled={isSaving}
                >
                  <X className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    onClick={() => {
                      setIsEditingMonto(true);
                      setTimeout(() => montoInputRef.current?.select(), 50);
                    }}
                    className={cn(
                      "text-sm font-bold cursor-pointer hover:text-primary transition-colors",
                      "flex items-center gap-1"
                    )}
                  >
                    {formatCurrency(oportunidad.monto_estimado || 0, (oportunidad as any).moneda || 'ARS')}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click para editar monto</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Probabilidad (auto por etapa) */}
            <Badge
              className={cn(
                "text-xs px-2 py-0.5 font-semibold",
                getProbabilidadColor(oportunidad.probabilidad_cierre || 0)
              )}
            >
              {oportunidad.probabilidad_cierre || 0}%
            </Badge>
          </div>

          {/* Activity Indicator */}
          {actividadResumen && actividadResumen.total > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  {actividadResumen.vencidas > 0 ? (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[10px] font-medium">
                      <Bell className="h-2.5 w-2.5" />
                      {actividadResumen.vencidas} vencida{actividadResumen.vencidas > 1 ? 's' : ''}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium">
                      <Bell className="h-2.5 w-2.5" />
                      {actividadResumen.proxima_fecha
                        ? safeFormat(actividadResumen.proxima_fecha, "d MMM")
                        : `${actividadResumen.total} act.`}
                    </div>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{actividadResumen.total} actividad{actividadResumen.total > 1 ? 'es' : ''} pendiente{actividadResumen.total > 1 ? 's' : ''}</p>
                  {actividadResumen.vencidas > 0 && (
                    <p className="text-xs text-red-400">{actividadResumen.vencidas} vencida{actividadResumen.vencidas > 1 ? 's' : ''}</p>
                  )}
                  {actividadResumen.proxima_fecha && (
                    <p className="text-xs text-muted-foreground">
                      Próxima: {safeFormat(actividadResumen.proxima_fecha, "d MMM yyyy")}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Días en esta etapa — siempre visible, sin hover */}
          {diasEnEtapa > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs",
                  diasEnEtapa > 14 ? "text-red-600 dark:text-red-400" :
                  diasEnEtapa > 7 ? "text-amber-600 dark:text-amber-400" :
                  "text-muted-foreground"
                )}>
                  <Clock className="h-3 w-3" />
                  <span>{diasEnEtapa}d en etapa</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Días en esta etapa</p>
                {diasEnEtapa > 7 && (
                  <p className="text-xs text-amber-400">Considera mover o dar seguimiento</p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>

        {/* Rotting Indicator Bar */}
        {isRotting && (
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-1 rounded-b",
              diasEnEtapa >= 21 ? "bg-red-500" :
              diasEnEtapa >= 14 ? "bg-orange-500" :
              "bg-amber-500"
            )}
          />
        )}
      </Card>
    </div>
  );
}
