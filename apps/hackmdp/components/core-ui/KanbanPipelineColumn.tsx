"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// dropdown-menu removed — column menu was placeholder
import { OportunidadVenta } from "@/lib/types";
import { KanbanPipelineCard, TeamMember, ActividadResumen } from "./KanbanPipelineCard";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Plus,
  TrendingUp,
  AlertTriangle,
  LucideIcon,
  X,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface EtapaConfig {
  id: string;
  nombre: string;
  color: string;
  borderColor: string;
  iconBg: string;
  textColor: string;
  icon: LucideIcon;
  probabilidad: number;
}

interface QuickAddData {
  nombre: string;
  monto_estimado?: number;
}

interface KanbanPipelineColumnProps {
  etapa: EtapaConfig;
  oportunidades: OportunidadVenta[];
  onViewDetails: (op: OportunidadVenta) => void;
  onEdit: (op: OportunidadVenta) => void;
  onDelete: (op: OportunidadVenta) => void;
  onQuickUpdate: (id: string, data: Partial<OportunidadVenta>) => Promise<void>;
  onQuickAction: (op: OportunidadVenta, action: "call" | "email" | "note") => void;
  onNewOportunidad?: (etapa: string) => void;
  /** Callback para Quick Add inline (si se provee, usa inline en vez de modal) */
  onQuickAdd?: (etapa: string, data: QuickAddData) => Promise<void>;
  /** WIP Limit - muestra advertencia si se excede */
  wipLimit?: number;
  /** Umbral para deal rotting */
  rottingThreshold?: number;
  isOver?: boolean;
  teamMembers?: TeamMember[];
  actividadResumenMap?: Record<string, ActividadResumen>;
  collapsed?: boolean;
  onToggleCollapse?: (etapaId: string) => void;
  /** Contenido extra debajo de las tarjetas, encima del boton "Agregar". Util para mostrar enlaces a historial. */
  extraFooter?: React.ReactNode;
}

export function KanbanPipelineColumn({
  etapa,
  oportunidades,
  onViewDetails,
  onEdit,
  onDelete,
  onQuickUpdate,
  onQuickAction,
  onNewOportunidad,
  onQuickAdd,
  wipLimit,
  rottingThreshold = 7,
  isOver = false,
  teamMembers,
  actividadResumenMap,
  collapsed = false,
  onToggleCollapse,
  extraFooter,
}: KanbanPipelineColumnProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: etapa.id,
    data: {
      type: "column",
      etapa: etapa.id,
    },
  });

  // Quick Add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddMonto, setQuickAddMonto] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  // Focus input cuando se abre el quick add
  useEffect(() => {
    if (showQuickAdd && quickAddInputRef.current) {
      quickAddInputRef.current.focus();
    }
  }, [showQuickAdd]);

  const isDragOver = isOver || isDroppableOver;
  const isOverWipLimit = wipLimit ? oportunidades.length >= wipLimit : false;

  // Handler para agregar rápido
  const handleQuickAdd = async () => {
    if (!quickAddName.trim() || !onQuickAdd) return;

    setIsAdding(true);
    try {
      await onQuickAdd(etapa.id, {
        nombre: quickAddName.trim(),
        monto_estimado: quickAddMonto ? parseFloat(quickAddMonto) : undefined,
      });
      // Reset form
      setQuickAddName("");
      setQuickAddMonto("");
      setShowQuickAdd(false);
    } catch (error) {
      console.error("Error en quick add:", error);
    } finally {
      setIsAdding(false);
    }
  };

  // Handler para el botón + (decide si usa quick add o modal)
  const handleAddClick = () => {
    if (onQuickAdd) {
      setShowQuickAdd(true);
    } else if (onNewOportunidad) {
      onNewOportunidad(etapa.id);
    }
  };

  // Calcular estadísticas de la columna
  const stats = useMemo(() => {
    const total = oportunidades.length;
    const totalMonto = oportunidades.reduce((sum, op) => sum + (Number(op.monto_estimado) || 0), 0);
    const montoPonderado = oportunidades.reduce((sum, op) => {
      return sum + ((Number(op.monto_estimado) || 0) * (Number(op.probabilidad_cierre) || 0) / 100);
    }, 0);
    const avgProbabilidad = total > 0
      ? oportunidades.reduce((sum, op) => sum + (Number(op.probabilidad_cierre) || 0), 0) / total
      : 0;
    const rottingCount = oportunidades.filter(op => (Number(op.dias_en_etapa) || 0) >= rottingThreshold).length;
    const hotCount = oportunidades.filter(op => (Number(op.probabilidad_cierre) || 0) >= 75).length;

    return {
      total,
      totalMonto,
      montoPonderado,
      avgProbabilidad,
      rottingCount,
      hotCount,
    };
  }, [oportunidades, rottingThreshold]);

  const EtapaIcon = etapa.icon;

  if (collapsed) {
    return (
      <motion.button
        ref={setNodeRef}
        type="button"
        onClick={() => onToggleCollapse?.(etapa.id)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "group relative flex flex-col items-center justify-between rounded-xl border-2 transition-colors duration-300 h-full w-full py-3 px-1 cursor-pointer overflow-hidden",
          "bg-gradient-to-b hover:shadow-md hover:brightness-105",
          etapa.color,
          etapa.borderColor,
          isDragOver && "border-primary ring-2 ring-primary/30 ring-inset",
          isOverWipLimit && "border-amber-400 dark:border-amber-600"
        )}
        title={`Expandir ${etapa.nombre}`}
      >
        {/* Top: icon + expand affordance (always visible) */}
        <div className="flex flex-col items-center gap-1.5">
          <div className={cn("p-1.5 rounded-lg shadow-sm", etapa.iconBg)}>
            <EtapaIcon className={cn("h-4 w-4", etapa.textColor)} />
          </div>
          <ChevronsRight className={cn("h-3.5 w-3.5 transition-all", etapa.textColor, "opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5")} />
        </div>

        {/* Middle: vertical name */}
        <div
          className="flex-1 flex items-center justify-center py-2"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          <span className="text-xs font-semibold whitespace-nowrap tracking-wide">
            {etapa.nombre}
          </span>
        </div>

        {/* Bottom: count + monto */}
        <div className="flex flex-col items-center gap-1.5">
          {stats.rottingCount > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 rounded-full bg-red-500"
            />
          )}
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px] h-5 px-1.5 bg-white/80 dark:bg-black/30 backdrop-blur-sm",
              isOverWipLimit && "bg-amber-100 dark:bg-amber-900/50 border-amber-400 text-amber-700 dark:text-amber-300"
            )}
          >
            {stats.total}
          </Badge>
        </div>
      </motion.button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border-2 transition-all duration-300 h-full min-w-0",
        etapa.borderColor,
        isDragOver && "border-primary ring-2 ring-primary/30 scale-[1.01]",
        isOverWipLimit && "border-amber-400 dark:border-amber-600"
      )}
    >
      {/* Column Header */}
      <div className={cn("p-3 rounded-t-lg bg-gradient-to-b shrink-0", etapa.color)}>
        {/* Title Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={cn("p-1.5 rounded-lg shadow-sm", etapa.iconBg)}
            >
              <EtapaIcon className={cn("h-4 w-4", etapa.textColor)} />
            </motion.div>
            <div>
              <h3 className="font-semibold text-sm">{etapa.nombre}</h3>
              <p className="text-xs text-muted-foreground">
                {etapa.probabilidad}% prob. defecto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Count Badge */}
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-xs",
                    isOverWipLimit && "bg-amber-100 dark:bg-amber-900/50 border-amber-400 text-amber-700 dark:text-amber-300"
                  )}
                >
                  {stats.total}
                  {wipLimit && `/${wipLimit}`}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {wipLimit ? (
                  <p>{stats.total} de {wipLimit} oportunidades (límite WIP)</p>
                ) : (
                  <p>{stats.total} oportunidades</p>
                )}
              </TooltipContent>
            </Tooltip>

            {/* Collapse button */}
            {onToggleCollapse && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onToggleCollapse(etapa.id)}
                    className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Colapsar columna"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Colapsar columna</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger>
              <p className="text-sm font-semibold">
                {formatCurrency(stats.totalMonto)}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p>Valor total: {formatCurrency(stats.totalMonto)}</p>
                <p className="text-xs text-muted-foreground">
                  Ponderado: {formatCurrency(stats.montoPonderado)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Prob. promedio: {stats.avgProbabilidad.toFixed(0)}%
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2">
            {/* Hot deals indicator */}
            {stats.hotCount > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 rounded text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <TrendingUp className="h-3 w-3" />
                    {stats.hotCount}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.hotCount} oportunidades calientes (&ge;75%)</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Rotting indicator */}
            {stats.rottingCount > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <motion.div
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 rounded text-xs font-medium text-red-700 dark:text-red-300"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {stats.rottingCount}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-red-500 font-semibold">
                    {stats.rottingCount} deals estancados
                  </p>
                  <p className="text-xs">&ge;{rottingThreshold} días sin movimiento</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Cards Container with Scroll */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted/20 min-h-0">
        <SortableContext
          items={oportunidades.map(op => op.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence mode="popLayout">
            {oportunidades.map((oportunidad) => (
              <KanbanPipelineCard
                key={oportunidad.id}
                oportunidad={oportunidad}
                onViewDetails={onViewDetails}
                onEdit={onEdit}
                onDelete={onDelete}
                onQuickUpdate={onQuickUpdate}
                onQuickAction={onQuickAction}
                rottingThreshold={rottingThreshold}
                teamMembers={teamMembers}
                actividadResumen={actividadResumenMap?.[oportunidad.id]}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* Empty State */}
        {oportunidades.length === 0 && !showQuickAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={cn("p-3 rounded-full mb-3", etapa.iconBg)}
            >
              <EtapaIcon className={cn("h-5 w-5", etapa.textColor, "opacity-60")} />
            </motion.div>
            <p className="text-sm text-muted-foreground font-medium">
              Sin oportunidades
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Arrastra aquí o crea una nueva
            </p>
            {(onNewOportunidad || onQuickAdd) && (
              <Button
                type="text"
                size="small"
                className="mt-3 gap-1.5"
                onClick={handleAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva oportunidad
              </Button>
            )}
          </motion.div>
        )}

        {/* Quick Add en empty state */}
        {oportunidades.length === 0 && showQuickAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 space-y-2"
          >
            <Input
              ref={quickAddInputRef}
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              placeholder="Nombre de la oportunidad..."
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && quickAddName.trim()) {
                  handleQuickAdd();
                } else if (e.key === "Escape") {
                  setShowQuickAdd(false);
                  setQuickAddName("");
                  setQuickAddMonto("");
                }
              }}
              disabled={isAdding}
            />
            <Input
              value={quickAddMonto}
              onChange={(e) => setQuickAddMonto(e.target.value)}
              placeholder="Monto estimado (opcional)"
              type="number"
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && quickAddName.trim()) {
                  handleQuickAdd();
                } else if (e.key === "Escape") {
                  setShowQuickAdd(false);
                  setQuickAddName("");
                  setQuickAddMonto("");
                }
              }}
              disabled={isAdding}
            />
            <div className="flex gap-2">
              <Button
                type="primary"
                size="tiny"
                className="flex-1 h-8"
                onClick={handleQuickAdd}
                disabled={!quickAddName.trim() || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Agregar
                  </>
                )}
              </Button>
              <Button
                type="text"
                size="tiny"
                className="h-8 px-2"
                onClick={() => {
                  setShowQuickAdd(false);
                  setQuickAddName("");
                  setQuickAddMonto("");
                }}
                disabled={isAdding}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Drop Indicator */}
        <AnimatePresence>
          {isDragOver && oportunidades.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 48 }}
              exit={{ opacity: 0, height: 0 }}
              className="border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 flex items-center justify-center"
            >
              <p className="text-xs text-primary font-medium">Soltar aquí</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Add Inline Form (solo si la columna tiene oportunidades;
          en columna vacía se usa el form del empty state, arriba) */}
      <AnimatePresence>
        {showQuickAdd && oportunidades.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t shrink-0 overflow-hidden"
          >
            <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
              <Input
                ref={quickAddInputRef}
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                placeholder="Nombre de la oportunidad..."
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickAddName.trim()) {
                    handleQuickAdd();
                  } else if (e.key === "Escape") {
                    setShowQuickAdd(false);
                    setQuickAddName("");
                    setQuickAddMonto("");
                  }
                }}
                disabled={isAdding}
              />
              <Input
                value={quickAddMonto}
                onChange={(e) => setQuickAddMonto(e.target.value)}
                placeholder="Monto estimado (opcional)"
                type="number"
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickAddName.trim()) {
                    handleQuickAdd();
                  } else if (e.key === "Escape") {
                    setShowQuickAdd(false);
                    setQuickAddName("");
                    setQuickAddMonto("");
                  }
                }}
                disabled={isAdding}
              />
              <div className="flex gap-2">
                <Button
                  type="primary"
                  size="tiny"
                  className="flex-1 h-8"
                  onClick={handleQuickAdd}
                  disabled={!quickAddName.trim() || isAdding}
                >
                  {isAdding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Agregar
                    </>
                  )}
                </Button>
                <Button
                  type="text"
                  size="tiny"
                  className="h-8 px-2"
                  onClick={() => {
                    setShowQuickAdd(false);
                    setQuickAddName("");
                    setQuickAddMonto("");
                  }}
                  disabled={isAdding}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extra footer (ej: enlace a historial) */}
      {extraFooter && (
        <div className="px-2 py-1.5 border-t shrink-0">{extraFooter}</div>
      )}

      {/* Add Button Footer */}
      {(onNewOportunidad || onQuickAdd) && oportunidades.length > 0 && !showQuickAdd && (
        <div className="p-2 border-t shrink-0">
          <Button
            type="text"
            size="small"
            className="w-full gap-1.5 text-xs"
            onClick={handleAddClick}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar oportunidad
          </Button>
        </div>
      )}
    </div>
  );
}
