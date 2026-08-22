"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Clock,
  GitBranch,
  Tag,
  Users,
  ClipboardList,
  Plus,
  Trash2,
  Settings,
  MoveVertical,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface WorkflowStep {
  id: string;
  orden: number;
  tipo: "enviar_email" | "esperar" | "condicion" | "agregar_tag" | "cambiar_lista" | "crear_tarea";
  configuracion: any;
}

interface WorkflowCanvasProps {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
  onEditStep: (step: WorkflowStep) => void;
}

// Supabase/Linear Style: Monotone con acentos de color
const stepTypeConfig = {
  enviar_email: {
    label: "Enviar Email",
    icon: Mail,
    // Color solo en íconos, bordes y badges
    surface: "bg-white dark:bg-gray-900",
    border: "border-pink-200 dark:border-pink-900/50",
    text: "text-gray-900 dark:text-gray-100",
    iconBg: "bg-pink-500/10 dark:bg-pink-500/20",
    iconColor: "text-pink-600 dark:text-pink-400",
    accent: "bg-pink-600",
    accentRing: "ring-pink-500/20",
    hoverBorder: "hover:border-pink-300 dark:hover:border-pink-800",
    description: "Envía un email usando una plantilla",
  },
  esperar: {
    label: "Esperar",
    icon: Clock,
    surface: "bg-white dark:bg-gray-900",
    border: "border-blue-200 dark:border-blue-900/50",
    text: "text-gray-900 dark:text-gray-100",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-600",
    accentRing: "ring-blue-500/20",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-800",
    description: "Espera un tiempo antes de continuar",
  },
  condicion: {
    label: "Condición",
    icon: GitBranch,
    surface: "bg-white dark:bg-gray-900",
    border: "border-amber-200 dark:border-amber-900/50",
    text: "text-gray-900 dark:text-gray-100",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-600",
    accentRing: "ring-amber-500/20",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-800",
    description: "Ejecuta acciones según una condición",
  },
  agregar_tag: {
    label: "Agregar Tag",
    icon: Tag,
    surface: "bg-white dark:bg-gray-900",
    border: "border-emerald-200 dark:border-emerald-900/50",
    text: "text-gray-900 dark:text-gray-100",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-600",
    accentRing: "ring-emerald-500/20",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-800",
    description: "Agrega un tag al contacto",
  },
  cambiar_lista: {
    label: "Cambiar Lista",
    icon: Users,
    surface: "bg-white dark:bg-gray-900",
    border: "border-orange-200 dark:border-orange-900/50",
    text: "text-gray-900 dark:text-gray-100",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    accent: "bg-orange-600",
    accentRing: "ring-orange-500/20",
    hoverBorder: "hover:border-orange-300 dark:hover:border-orange-800",
    description: "Mueve el contacto a otra lista",
  },
  crear_tarea: {
    label: "Crear Tarea",
    icon: ClipboardList,
    surface: "bg-white dark:bg-gray-900",
    border: "border-red-200 dark:border-red-900/50",
    text: "text-gray-900 dark:text-gray-100",
    iconBg: "bg-red-500/10 dark:bg-red-500/20",
    iconColor: "text-red-600 dark:text-red-400",
    accent: "bg-red-600",
    accentRing: "ring-red-500/20",
    hoverBorder: "hover:border-red-300 dark:hover:border-red-800",
    description: "Crea una tarea para el equipo",
  },
};

export function WorkflowCanvas({ steps, onChange, onEditStep }: WorkflowCanvasProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const addStep = useCallback(
    (tipo: WorkflowStep["tipo"]) => {
      const newStep: WorkflowStep = {
        id: `step-${Date.now()}`,
        orden: steps.length + 1,
        tipo,
        configuracion: getDefaultConfig(tipo),
      };
      onChange([...steps, newStep]);
    },
    [steps, onChange]
  );

  const removeStep = useCallback(
    (stepId: string) => {
      const newSteps = steps
        .filter((s) => s.id !== stepId)
        .map((s, index) => ({ ...s, orden: index + 1 }));
      onChange(newSteps);
    },
    [steps, onChange]
  );

  const moveStep = useCallback(
    (stepId: string, direction: "up" | "down") => {
      const stepIndex = steps.findIndex((s) => s.id === stepId);
      if (stepIndex === -1) return;

      if (direction === "up" && stepIndex === 0) return;
      if (direction === "down" && stepIndex === steps.length - 1) return;

      const newSteps = [...steps];
      const swapIndex = direction === "up" ? stepIndex - 1 : stepIndex + 1;

      [newSteps[stepIndex], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[stepIndex]];

      const reorderedSteps = newSteps.map((s, index) => ({ ...s, orden: index + 1 }));
      onChange(reorderedSteps);
    },
    [steps, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Canvas - Estilo Supabase/Linear */}
      <div className="min-h-[500px] rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-6">
        <div className="relative">
          {steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[450px] text-center">
              <div className="relative mb-4">
                <div className="inline-flex p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <Sparkles className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Tu workflow está esperando
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Comienza agregando pasos desde la barra de herramientas para construir tu automatización
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Trigger Inicio - Estilo compacto */}
              <Card className="border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-purple-500/10 dark:bg-purple-500/20">
                      <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Inicio del Workflow</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Se ejecuta cuando se cumple el trigger configurado
                      </p>
                    </div>
                    <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">TRIGGER</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Line */}
              <div className="flex justify-center">
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
              </div>

              {/* Steps - Estilo Supabase/Linear con animaciones */}
              <AnimatePresence mode="popLayout">
                {steps.map((step, index) => {
                  const config = stepTypeConfig[step.tipo];
                  const Icon = config.icon;
                  const isExpanded = expandedSteps.has(step.id);

                  return (
                    <motion.div
                      key={step.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      transition={{
                        layout: { type: "spring", stiffness: 350, damping: 30 },
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2 },
                      }}
                      className="space-y-4"
                    >
                      <Card
                        className={cn(
                          "border transition-all duration-200 group",
                          config.surface,
                          config.border,
                          config.hoverBorder,
                          "shadow-sm hover:shadow-md"
                        )}
                      >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon con color de acento */}
                          <div className={cn(
                            "p-2 rounded-md flex-shrink-0",
                            config.iconBg
                          )}>
                            <Icon className={cn("h-5 w-5", config.iconColor)} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold",
                                config.accent,
                                "text-white"
                              )}>
                                {step.orden}
                              </span>
                              <p className={cn("text-sm font-semibold", config.text)}>
                                {config.label}
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{config.description}</p>

                            {/* Configuración Preview con animación */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-md border border-gray-200 dark:border-gray-800">
                                    <pre className="text-xs whitespace-pre-wrap break-words font-mono text-gray-700 dark:text-gray-300">
                                      {JSON.stringify(step.configuracion, null, 2)}
                                    </pre>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Actions - Botones compactos */}
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(step.id)}
                              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => onEditStep(step)}
                              className={cn(
                                "h-7 w-7 p-0",
                                config.accent,
                                "text-white hover:opacity-90"
                              )}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveStep(step.id, "up")}
                              disabled={index === 0}
                              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveStep(step.id, "down")}
                              disabled={index === steps.length - 1}
                              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStep(step.id)}
                              className="h-7 w-7 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                      {/* Connection Line */}
                      {index < steps.length - 1 && (
                        <div className="flex justify-center">
                          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Connection Line final */}
              <div className="flex justify-center">
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
              </div>

              {/* Final del workflow - Compacto */}
              <Card className="border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20">
                      <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fin del Workflow</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        El workflow se completa y el contacto continúa su ciclo
                      </p>
                    </div>
                    <div className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">COMPLETADO</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar - Estilo compacto */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Agregar Paso al Workflow
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {(Object.keys(stepTypeConfig) as Array<keyof typeof stepTypeConfig>).map((tipo) => {
              const config = stepTypeConfig[tipo];
              const Icon = config.icon;

              return (
                <motion.div
                  key={tipo}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => addStep(tipo)}
                    className={cn(
                      "h-auto py-3 px-3 flex flex-col items-center gap-2 transition-all duration-200 w-full",
                      config.border,
                      config.hoverBorder,
                      "hover:shadow-sm group"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-md",
                      config.iconBg
                    )}>
                      <Icon className={cn("h-4 w-4", config.iconColor)} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {config.label}
                    </span>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getDefaultConfig(tipo: WorkflowStep["tipo"]): any {
  switch (tipo) {
    case "enviar_email":
      return { template_id: null, asunto: "" };
    case "esperar":
      return { cantidad: 1, unidad: "dias" };
    case "condicion":
      return {
        campo: "abrio_email",
        operador: "==",
        valor: true,
      };
    case "agregar_tag":
      return { tag_nombre: "" };
    case "cambiar_lista":
      return { lista_id: null };
    case "crear_tarea":
      return { titulo: "", descripcion: "", asignado_a: null };
    default:
      return {};
  }
}
