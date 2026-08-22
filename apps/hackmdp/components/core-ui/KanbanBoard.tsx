"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Servicio } from "@/lib/types";
import {
  Clock,
  AlertTriangle,
  GripVertical,
  User,
  Wrench,
  MoreHorizontal,
  Eye,
  Edit2,
  FileText,
} from "lucide-react";
import { TableBadge } from "./TableTextTruncate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  states: string[];
}

interface KanbanBoardProps {
  servicios: Servicio[];
  onServiceClick?: (servicio: Servicio) => void;
  onEditService?: (servicio: Servicio) => void;
  onExportPDF?: (servicio: Servicio) => void;
  onStatusChange?: (servicioId: string, newStatus: string) => void;
}

// Kanban columns configuration
const kanbanColumns: KanbanColumn[] = [
  {
    id: "pending",
    title: "Pendientes",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    states: ["Pendiente", "Reparar", "Presupuestar al cliente"],
  },
  {
    id: "in_progress",
    title: "En Reparación",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    states: ["En reparación", "Reparar/Pres aceptado", "Reparar/en garantía", "Reparar/Mantenimiento"],
  },
  {
    id: "waiting",
    title: "Esperando",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    states: ["Presupuestado/esperando respuesta", "Presupuestado", "Presupuestado/Esperando resp", "Enviado a fábrica"],
  },
  {
    id: "ready",
    title: "Listo",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    states: ["Listo/Reparado", "Entregar/Enviar", "Entregar sin reparar"],
  },
  {
    id: "finished",
    title: "Finalizado",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
    borderColor: "border-gray-200 dark:border-gray-700",
    states: ["Finalizado", "Facturado", "Sin cargo", "Sin cargo/Garantía reparación", "Sin cargo/Garantía venta", "Sin cargo/Comodato", "No tiene reparación"],
  },
];

// Helper to calculate days elapsed
function getDaysElapsed(fecha: string | null): number | null {
  if (!fecha) return null;
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Kanban card component
function KanbanCard({
  servicio,
  onClick,
  onEdit,
  onExportPDF,
}: {
  servicio: Servicio;
  onClick?: (servicio: Servicio) => void;
  onEdit?: (servicio: Servicio) => void;
  onExportPDF?: (servicio: Servicio) => void;
}) {
  const daysElapsed = getDaysElapsed(servicio.fecha);
  const isOverdue = daysElapsed !== null && daysElapsed > 7;
  const cliente = servicio.cliente_id;
  const equipo = servicio.equipo_id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick?.(servicio)}
      className={cn(
        "group relative bg-white dark:bg-gray-900 rounded-lg border p-3 cursor-pointer",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "hover:border-purple-300 dark:hover:border-purple-700",
        isOverdue && "border-l-4 border-l-red-500"
      )}
    >
      {/* Drag handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Actions menu */}
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[140px]">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(servicio);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-2" />
              Ver detalles
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(servicio);
                }}
              >
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {onExportPDF && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onExportPDF(servicio);
                }}
              >
                <FileText className="h-3.5 w-3.5 mr-2" />
                Ver PDF
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 pl-3">
        {/* Header: Time + Estado */}
        <div className="flex items-center justify-between gap-2">
          {daysElapsed !== null && (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
                    )}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    <span>{daysElapsed}d</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Ingresó hace {daysElapsed} días
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TableBadge variant="purple" className="text-[10px] px-1.5 py-0.5">
            {servicio.estado}
          </TableBadge>
        </div>

        {/* Cliente */}
        {cliente && (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {cliente.nombre || cliente.nombre_fantasia || "Sin nombre"}
            </span>
          </div>
        )}

        {/* Equipo */}
        {equipo?.equipo_id && (
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {equipo.equipo_id.marca} {equipo.equipo_id.modelo}
            </span>
          </div>
        )}

        {/* Serie */}
        {equipo?.numero_serie && (
          <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">
            S/N: {equipo.numero_serie}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Kanban column component
function KanbanColumn({
  column,
  servicios,
  onServiceClick,
  onEditService,
  onExportPDF,
}: {
  column: KanbanColumn;
  servicios: Servicio[];
  onServiceClick?: (servicio: Servicio) => void;
  onEditService?: (servicio: Servicio) => void;
  onExportPDF?: (servicio: Servicio) => void;
}) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px]">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-lg border",
          column.bgColor,
          column.borderColor
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className={cn("font-semibold text-sm", column.color)}>
            {column.title}
          </h3>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              column.bgColor,
              column.color
            )}
          >
            {servicios.length}
          </span>
        </div>
      </div>

      {/* Column content */}
      <div
        className={cn(
          "flex-1 min-h-[400px] max-h-[calc(100vh-400px)] overflow-y-auto p-2 space-y-2 border-x border-b rounded-b-lg",
          "bg-gray-50/50 dark:bg-gray-900/20",
          column.borderColor
        )}
      >
        <AnimatePresence mode="popLayout">
          {servicios.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">
              Sin servicios
            </div>
          ) : (
            servicios.map((servicio) => (
              <KanbanCard
                key={servicio.id}
                servicio={servicio}
                onClick={onServiceClick}
                onEdit={onEditService}
                onExportPDF={onExportPDF}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function KanbanBoard({
  servicios,
  onServiceClick,
  onEditService,
  onExportPDF,
}: KanbanBoardProps) {
  // Group services by column
  const groupedServices = useMemo(() => {
    const groups: Record<string, Servicio[]> = {};
    kanbanColumns.forEach((col) => {
      groups[col.id] = servicios.filter((s) =>
        col.states.includes(s.estado)
      );
    });
    return groups;
  }, [servicios]);

  // Count unassigned services (not in any column)
  const assignedStates = kanbanColumns.flatMap((c) => c.states);
  const unassigned = servicios.filter((s) => !assignedStates.includes(s.estado));

  return (
    <div className="flex flex-col h-full">
      {/* Unassigned warning */}
      {unassigned.length > 0 && (
        <div className="mb-4 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {unassigned.length} servicio(s) con estado no clasificado:{" "}
            {[...new Set(unassigned.map((s) => s.estado))].join(", ")}
          </span>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            servicios={groupedServices[column.id] || []}
            onServiceClick={onServiceClick}
            onEditService={onEditService}
            onExportPDF={onExportPDF}
          />
        ))}
      </div>
    </div>
  );
}
